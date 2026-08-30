import { logger } from '@/lib/logger';
import { HttpError } from '@/lib/httpError';

// Backend dịch AI — dùng OpenRouter (OpenAI-compatible) hoặc Gemini qua OpenRouter.
// Cấu hình bằng env:
//   AI_TRANSLATE_BASE_URL  (default: https://openrouter.ai/api/v1)
//   AI_TRANSLATE_API_KEY   (default: process.env.OPENROUTER_API_KEY / ANTHROPIC_API_KEY fallback)
//   AI_TRANSLATE_MODEL     (default: google/gemini-3.7-flash)
const BASE_URL = process.env.AI_TRANSLATE_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.AI_TRANSLATE_MODEL || 'google/gemini-3.7-flash';

export interface TranslatePostInput {
  title: string;
  excerpt: string | null;
  content: string;
  seoTitle: string | null;
  seoDesc: string | null;
  targetLocale: string;
}

export interface TranslatePostResult {
  title: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDesc: string;
}

const LOCALE_NAMES: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English',
  de: 'German',
  fr: 'French',
};

const EMIT_TRANSLATION_TOOL = {
  name: 'emit_translation',
  description: 'Return the translated post fields as JSON.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      excerpt: { type: 'string' },
      content: { type: 'string' },
      seoTitle: { type: 'string' },
      seoDesc: { type: 'string' },
    },
    required: ['title', 'excerpt', 'content', 'seoTitle', 'seoDesc'],
  },
};

function resolveApiKey(): string | undefined {
  return (
    process.env.AI_TRANSLATE_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.ANTHROPIC_API_KEY
  );
}

function extractToolArguments(data: Record<string, unknown>): Record<string, unknown> | null {
  // OpenAI-compatible: choices[0].message.tool_calls[0].function.arguments (JSON string)
  const choices = data?.choices as Array<{
    message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
  }>;
  const toolCalls = choices?.[0]?.message?.tool_calls;
  const args = toolCalls?.[0]?.function?.arguments;
  if (!args) return null;
  try {
    return JSON.parse(args) as Record<string, unknown>;
  } catch (err) {
    logger.error({ err, args }, 'AI translation tool arguments not valid JSON');
    return null;
  }
}

export async function translatePostContent(
  input: TranslatePostInput
): Promise<TranslatePostResult> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new HttpError(500, 'AI translation is not configured (missing AI_TRANSLATE_API_KEY / OPENROUTER_API_KEY / ANTHROPIC_API_KEY)');
  }

  const targetLanguage = LOCALE_NAMES[input.targetLocale] ?? input.targetLocale;

  const userMessage = [
    `You are a professional forex/crypto blog translator. Translate the following blog post into ${targetLanguage}.`,
    'Preserve the HTML tag structure of "content" exactly — translate only the text nodes, never the tags/attributes.',
    'Do not translate brand names, broker names, currency symbols, or numbers.',
    'Call the emit_translation tool with the translated fields.',
    '',
    `TITLE:\n${input.title}`,
    `EXCERPT:\n${input.excerpt ?? ''}`,
    `CONTENT (HTML):\n${input.content}`,
    `SEO_TITLE:\n${input.seoTitle ?? ''}`,
    `SEO_DESC:\n${input.seoDesc ?? ''}`,
  ].join('\n');

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        tools: [{ type: 'function', function: EMIT_TRANSLATION_TOOL }],
        tool_choice: { type: 'function', function: { name: 'emit_translation' } },
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (err) {
    logger.error({ err }, 'AI translation request failed (network)');
    throw new HttpError(502, 'AI translation failed');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error({ status: res.status, body }, 'AI translation request failed (API error)');
    throw new HttpError(502, 'AI translation failed');
  }

  const data = await res.json();
  const fields = extractToolArguments(data);

  if (!fields) {
    // Fallback: nếu model trả plain-text JSON thay vì tool call, thử parse content.
    const content = (data as Record<string, unknown>)?.choices
      ? ((data as Record<string, unknown>).choices as Array<{ message?: { content?: string } }>)?.[0]
          ?.message?.content
      : undefined;
    if (typeof content === 'string' && content.trim()) {
      try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        return normalizeFields(parsed);
      } catch {
        // không parse được — báo lỗi
      }
    }
    logger.error({ data }, 'AI translation response missing tool use');
    throw new HttpError(502, 'AI translation failed');
  }

  return normalizeFields(fields);
}

function normalizeFields(fields: Record<string, unknown>): TranslatePostResult {
  const { title, excerpt, content, seoTitle, seoDesc } = fields;
  if (
    typeof title !== 'string' ||
    typeof excerpt !== 'string' ||
    typeof content !== 'string' ||
    typeof seoTitle !== 'string' ||
    typeof seoDesc !== 'string'
  ) {
    logger.error({ fields }, 'AI translation response has unexpected shape');
    throw new HttpError(502, 'AI translation failed');
  }
  return { title, excerpt, content, seoTitle, seoDesc };
}