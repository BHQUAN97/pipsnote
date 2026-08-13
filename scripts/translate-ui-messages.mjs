#!/usr/bin/env node
// One-off: dich messages/en.json sang cac locale moi.
// Tu dong chon provider theo env var dang co san (uu tien Gemini -> OpenRouter):
//   GEMINI_API_KEY=xxx GEMINI_MODEL=gemini-2.5-flash node scripts/translate-ui-messages.mjs de fr
//   OPENROUTER_API_KEY=xxx OPENROUTER_MODEL=... node scripts/translate-ui-messages.mjs de fr
// Co the ep provider: PROVIDER=gemini|openrouter ... (khi co nhieu key cung luc)
// Model luon lay theo env ban tu cau hinh (GEMINI_MODEL/OPENROUTER_MODEL) — khong hardcode co dinh.
// Khong ghi de locale da ton tai (en, vi) — chi tao file cho locale duoc truyen vao argv.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = path.join(__dirname, '..', 'messages');

const LOCALE_NAMES = {
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  zh: 'Chinese (Simplified)',
};

function buildPrompt(sourceJson, targetLanguage) {
  return [
    `Translate the following Next.js i18n UI messages (JSON) into ${targetLanguage}.`,
    'Preserve the exact key names and nesting structure — only translate the string VALUES.',
    'Do NOT translate or alter ICU placeholders like {siteName}, {query}, {date} — keep them byte-for-byte identical.',
    'Do NOT translate or alter inline tags like <email>...</email> or <link>...</link> — keep the tag names identical, translate only the text between the tags.',
    'This is a forex/crypto trading blog — keep tone professional/financial, not casual.',
    'Return ONLY the translated JSON object, no markdown fences, no commentary, no explanation.',
    '',
    'SOURCE JSON:',
    JSON.stringify(sourceJson),
  ].join('\n');
}

function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\n?/i, '').replace(/```$/, '');
  return JSON.parse(cleaned);
}

async function translateWithGemini(sourceJson, targetLanguage, apiKey) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(sourceJson, targetLanguage) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Unexpected Gemini response: ${JSON.stringify(data)}`);
  return extractJson(text);
}

async function translateWithOpenRouter(sourceJson, targetLanguage, apiKey) {
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: buildPrompt(sourceJson, targetLanguage) }],
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter API error ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Unexpected OpenRouter response: ${JSON.stringify(data)}`);
  return extractJson(text);
}

function pickProvider() {
  const forced = process.env.PROVIDER;
  if (forced) return forced;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  return null;
}

async function translateLocale(sourceJson, targetLocale, provider) {
  const targetLanguage = LOCALE_NAMES[targetLocale] ?? targetLocale;
  if (provider === 'gemini') return translateWithGemini(sourceJson, targetLanguage, process.env.GEMINI_API_KEY);
  if (provider === 'openrouter') return translateWithOpenRouter(sourceJson, targetLanguage, process.env.OPENROUTER_API_KEY);
  throw new Error(`Unknown provider: ${provider}`);
}

async function main() {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.error('Usage: GEMINI_API_KEY=xxx node scripts/translate-ui-messages.mjs <locale> [locale...]');
    process.exit(1);
  }

  const provider = pickProvider();
  if (!provider) {
    console.error('No API key found. Set one of: GEMINI_API_KEY, OPENROUTER_API_KEY');
    process.exit(1);
  }
  console.log(`Using provider: ${provider}`);

  const sourcePath = path.join(MESSAGES_DIR, 'en.json');
  const sourceJson = JSON.parse(await readFile(sourcePath, 'utf8'));

  for (const locale of targets) {
    console.log(`Translating -> ${locale}...`);
    const translated = await translateLocale(sourceJson, locale, provider);
    const outPath = path.join(MESSAGES_DIR, `${locale}.json`);
    await writeFile(outPath, JSON.stringify(translated, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
