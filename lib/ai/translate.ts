import { logger } from '@/lib/logger';
import { HttpError } from '@/lib/httpError';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-haiku-4-5-20251001';

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
};

const EMIT_TRANSLATION_TOOL = {
  name: 'emit_translation',
  description: 'Return the translated post fields.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' as const },
      excerpt: { type: 'string' as const },
      content: { type: 'string' as const },
      seoTitle: { type: 'string' as const },
      seoDesc: { type: 'string' as const },
    },
    required: ['title', 'excerpt', 'content', 'seoTitle', 'seoDesc'],
  },
};

export async function translatePostContent(
  input: TranslatePostInput
): Promise<TranslatePostResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new HttpError(500, 'AI translation is not configured');
  }

  const targetLanguage = LOCALE_NAMES[input.targetLocale] ?? input.targetLocale;

  const userMessage = [
    `Translate the following forex/crypto blog post into ${targetLanguage}.`,
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
    res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        tools: [EMIT_TRANSLATION_TOOL],
        tool_choice: { type: 'tool', name: 'emit_translation' },
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
  const toolUse = data?.content?.find(
    (block: { type: string }) => block.type === 'tool_use'
  );

  if (!toolUse?.input) {
    logger.error({ data }, 'AI translation response missing tool_use block');
    throw new HttpError(502, 'AI translation failed');
  }

  const { title, excerpt, content, seoTitle, seoDesc } = toolUse.input as Record<
    string,
    unknown
  >;

  if (
    typeof title !== 'string' ||
    typeof excerpt !== 'string' ||
    typeof content !== 'string' ||
    typeof seoTitle !== 'string' ||
    typeof seoDesc !== 'string'
  ) {
    logger.error({ toolUse }, 'AI translation response has unexpected shape');
    throw new HttpError(502, 'AI translation failed');
  }

  return { title, excerpt, content, seoTitle, seoDesc };
}
