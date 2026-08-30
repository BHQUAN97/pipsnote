#!/usr/bin/env python3
"""Dịch toàn bộ bài viết pipsnote qua OpenRouter (Gemini) và ghi vào post_translations.

Chỉ đọc posts, upsert translations cho locales en/de/fr với status=published,
source=ai, translated_by=1 (admin superadmin). Không đụng posts gốc.
"""
import json
import os
import subprocess
import sys
import urllib.request

from pathlib import Path

ENV = Path("/opt/pipsnote/.env")
DB_USER = "pipsnote_app"
DB_NAME = "pipsnote"
LOCALES = ["en", "de", "fr"]
MODEL = "google/gemini-3.7-flash"
BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

LOCALE_NAMES_INFO = {"en": "English", "de": "German", "fr": "French"}


def env_val(key):
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line.startswith(key + "="):
            return line.split("=", 1)[1]
    return ""


def db_pass():
    return env_val("DB_PASSWORD")


def mysql(sql, fetch=True):
    pw = db_pass()
    cmd = [
        "docker", "exec", "-i", "shared-mysql",
        "mysql", f"-u{DB_USER}", f"-p{pw}", "--default-character-set=utf8mb4",
        "-N", "-B", DB_NAME,
    ]
    if fetch:
        out = subprocess.run(cmd, input=sql, check=True, capture_output=True, text=True).stdout
        return [line.split("\t") for line in out.splitlines() if line.strip()]
    # fetch=False: chưa dùng vì ta inject literal, không cần
    subprocess.run(cmd, input=sql, check=True, capture_output=True, text=True)
    return None


def esc(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"


def call_openrouter(api_key, input_fields):
    tool = {
        "type": "function",
        "function": {
            "name": "emit_translation",
            "description": "Return the translated post fields as JSON.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "excerpt": {"type": "string"},
                    "content": {"type": "string"},
                    "seoTitle": {"type": "string"},
                    "seoDesc": {"type": "string"},
                },
                "required": ["title", "excerpt", "content", "seoTitle", "seoDesc"],
            },
        },
    }
    target = LOCALE_NAMES_INFO[input_fields["_locale"]]
    user_msg = [
        f"You are a professional forex/crypto blog translator. Translate the following blog post into {target}.",
        'Preserve the HTML tag structure of "content" exactly — translate only the text nodes, never the tags/attributes.',
        "Do not translate brand names, broker names, currency symbols, or numbers.",
        "Call the emit_translation tool with the translated fields.",
        "",
        f"TITLE:\n{input_fields['title']}",
        f"EXCERPT:\n{input_fields['excerpt'] or ''}",
        f"CONTENT (HTML):\n{input_fields['content']}",
        f"SEO_TITLE:\n{input_fields['seo_title'] or ''}",
        f"SEO_DESC:\n{input_fields['seo_desc'] or ''}",
    ]
    payload = {
        "model": MODEL,
        "max_tokens": 8192,
        "tools": [tool],
        "tool_choice": {"type": "function", "function": {"name": "emit_translation"}},
        "messages": [{"role": "user", "content": "\n".join(user_msg)}],
    }
    req = urllib.request.Request(
        BASE_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read().decode())

    args = None
    content = None
    choices = data.get("choices", [])
    if choices:
        msg = choices[0].get("message", {})
        tcs = msg.get("tool_calls")
        if tcs:
            try:
                args = json.loads(tcs[0]["function"]["arguments"])
            except (KeyError, json.JSONDecodeError):
                args = None
        content = msg.get("content")
    if not args and content:
        try:
            args = json.loads(content)
        except json.JSONDecodeError:
            raise RuntimeError(f"No parseable translation: {content!r}"[:500])
    if not args:
        raise RuntimeError("No tool call received")
    return args


def main():
    api_key = env_val("AI_TRANSLATE_API_KEY") or os.environ.get("OPENROUTER_API_KEY_DIRECT_BACKUP")
    if not api_key:
        sys.exit("No API key")

    posts = mysql(
        "SELECT id, title, excerpt, content, seo_title, seo_desc "
        "FROM posts WHERE status='published' ORDER BY id"
    )
    if not posts:
        sys.exit("No published posts")
    print(f"Found {len(posts)} posts")

    ok = 0
    fail = 0
    assert_stmts = []
    for row in posts:
        pid, title, excerpt, content, seo_title, seo_desc = (row + [None, None, None, None, None])[:6]
        for locale in LOCALES:
            try:
                tr = call_openrouter(api_key, {
                    "_locale": locale, "title": title, "excerpt": excerpt,
                    "content": content, "seo_title": seo_title, "seo_desc": seo_desc,
                })
            except Exception as e:
                print(f"  ✗ post {pid} [{locale}]: {e}")
                fail += 1
                continue
            sql = (
                "INSERT INTO post_translations "
                "(post_id, locale, title, excerpt, content, seo_title, seo_desc, status, source, translated_by) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, 'published', 'ai', 1) "
                "ON DUPLICATE KEY UPDATE title=VALUES(title), excerpt=VALUES(excerpt), "
                "content=VALUES(content), seo_title=VALUES(seo_title), seo_desc=VALUES(seo_desc), "
                "status='published', source='ai', translated_by=1"
            ) % tuple(
                esc(v) for v in [pid, locale, tr["title"], tr.get("excerpt") or None,
                                 tr["content"], tr.get("seoTitle") or None, tr.get("seoDesc") or None]
            )
            assert_stmts.append(sql)
            print(f"  ✓ post {pid} [{locale}] → {tr['title'][:50]!r}")
            ok += 1

    if assert_stmts:
        mysql(";\n".join(assert_stmts) + ";", fetch=False)
        print(f"Upserted {ok} translations into post_translations")
    print(f"OK={ok} FAIL={fail}")


if __name__ == "__main__":
    main()