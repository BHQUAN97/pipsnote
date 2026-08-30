import { logger } from '@/lib/logger';
import { HttpError } from '@/lib/httpError';
import { getSiteSettings } from '@/lib/settings';

// Backend dịch AI — cấu hình lấy từ site_settings (DB, quản qua admin UI)
// với fallback về env. Không bị CI ghi đè như env.
//
// Keys site_settings:
//   ai_translate_provider  ('openrouter' | 'gemini' | 'anthropic' | 'openai' | 'custom')
//   ai_translate_api_key
//   ai_translate_model
//   ai_translate_base_url
//
// Fallback env: AI_TRANSLATE_PROVIDER / AI_TRANSLATE_API_KEY / AI_TRANSLATE_MODEL / AI_TRANSLATE_BASE_URL

// Provider presets → base_url + model gợi ý
const PROVIDER_PRESETS: Record<string, { baseUrl: string; model: string }> = {
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemini-3.7-flash' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  custom: { baseUrl: '', model: '' },
};

interface AiConfig {
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
  provider: string;
  systemPrompt: string | null;
}

async function resolveAiConfig(): Promise<AiConfig> {
  const s = await getSiteSettings();
  const provider = s.ai_translate_provider || process.env.AI_TRANSLATE_PROVIDER || 'openrouter';
  const preset = PROVIDER_PRESETS[provider];

  const baseUrl =
    s.ai_translate_base_url ||
    process.env.AI_TRANSLATE_BASE_URL ||
    preset?.baseUrl ||
    'https://openrouter.ai/api/v1';

  const model =
    s.ai_translate_model ||
    process.env.AI_TRANSLATE_MODEL ||
    preset?.model ||
    'google/gemini-3.7-flash';

  const apiKey =
    s.ai_translate_api_key ||
    process.env.AI_TRANSLATE_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.ANTHROPIC_API_KEY;

  const systemPrompt = s.ai_translate_prompt || process.env.AI_TRANSLATE_PROMPT || null;

  return { baseUrl, apiKey, model, provider, systemPrompt };
}

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
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  pl: 'Polish',
  nl: 'Dutch',
  tr: 'Turkish',
  ar: 'Arabic',
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

// Tất cả provider đều OpenAI-compatible → dùng Bearer token + /chat/completions.
function buildAuthHeaders(_provider: string, apiKey: string): Record<string, string> {
  return { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` };
}

function extractToolArguments(data: Record<string, unknown>): Record<string, unknown> | null {
  // OpenAI-compatible: choices[0].message.tool_calls[0].function.arguments (JSON string)
  const choices = data?.choices as Array<{
    message?: { tool_calls?: Array<{ function?: { arguments?: string } }>; content?: string };
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
  const config = await resolveAiConfig();
  if (!config.apiKey) {
    throw new HttpError(
      500,
      'AI translation is not configured. Vào Admin → Settings → AI Translation để nhập API key.'
    );
  }

  const targetLanguage = LOCALE_NAMES[input.targetLocale] ?? input.targetLocale;

  // System prompt: từ cấu hình DB hoặc mặc định. Placeholder {language} được thay.
  const defaultSystem = 'You are a professional forex/crypto blog translator. Translate the following blog post into {language}. Preserve the HTML tag structure of "content" exactly — translate only the text nodes, never the tags/attributes. Do not translate brand names, broker names, currency symbols, or numbers. Call the emit_translation tool with the translated fields.';
  const systemPrompt = (config.systemPrompt || defaultSystem)
    .replace(/\{language\}/g, targetLanguage);

  const userMessage = [
    `TITLE:\n${input.title}`,
    `EXCERPT:\n${input.excerpt ?? ''}`,
    `CONTENT (HTML):\n${input.content}`,
    `SEO_TITLE:\n${input.seoTitle ?? ''}`,
    `SEO_DESC:\n${input.seoDesc ?? ''}`,
  ].join('\n');

  const url = `${config.baseUrl}/chat/completions`;

  const body = {
    model: config.model,
    max_tokens: 8192,
    tools: [{ type: 'function', function: EMIT_TRANSLATION_TOOL }],
    tool_choice: { type: 'function', function: { name: 'emit_translation' } },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(config.provider, config.apiKey),
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error({ err }, 'AI translation request failed (network)');
    throw new HttpError(502, 'AI translation failed');
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    logger.error({ status: res.status, body: bodyText }, 'AI translation request failed (API error)');
    throw new HttpError(502, 'AI translation failed (provider returned error)');
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