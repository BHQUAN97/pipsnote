/**
 * Whitelist-based HTML sanitizer for post content saved from the admin rich-text editor.
 * posts.content renders via dangerouslySetInnerHTML on the public blog — must run
 * server-side before every INSERT/UPDATE, not just client-side.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'mark',
  'h2', 'h3',
  'ul', 'ol', 'li',
  'a', 'img',
  'span', 'blockquote', 'pre', 'code', 'hr',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  span: new Set(['style']),
  mark: new Set(['style']),
  p: new Set(['style']),
  h2: new Set(['style']),
  h3: new Set(['style']),
};

const SAFE_URL_PROTOCOLS = /^(?:https?|mailto):/i;
const SAFE_COLOR =
  /^#[0-9a-fA-F]{3,8}$|^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$|^[a-zA-Z]+$/;
const SAFE_ALIGN = /^(left|right|center|justify)$/;

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)?\/?>/g;
const ATTR_RE = /([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
const COMMENT_RE = /<!--[\s\S]*?-->/g;

export function isUrlSafe(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('.')) {
    return true;
  }
  if (/^\s*(javascript|data|vbscript)\s*:/i.test(trimmed)) {
    return false;
  }
  if (SAFE_URL_PROTOCOLS.test(trimmed)) {
    return true;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return false;
  }
  return true;
}

function sanitizeStyleValue(styleString: string): string {
  const kept: string[] = [];

  for (const decl of styleString.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;

    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();

    if ((prop === 'color' || prop === 'background-color') && SAFE_COLOR.test(value)) {
      kept.push(`${prop}: ${value}`);
    } else if (prop === 'text-align' && SAFE_ALIGN.test(value)) {
      kept.push(`${prop}: ${value}`);
    }
  }

  return kept.join('; ');
}

function sanitizeAttributes(tagName: string, attrString: string): string {
  const tagAttrs = ALLOWED_ATTRS[tagName] ?? new Set<string>();
  const result: string[] = [];

  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrString)) !== null) {
    const attrName = match[1].toLowerCase();
    const attrValue = match[2] ?? match[3] ?? match[4] ?? '';

    if (!tagAttrs.has(attrName)) continue;

    if (attrName === 'href' || attrName === 'src') {
      if (!isUrlSafe(attrValue)) continue;
      result.push(`${attrName}="${attrValue.replace(/"/g, '&quot;')}"`);
      continue;
    }

    if (attrName === 'style') {
      const cleaned = sanitizeStyleValue(attrValue);
      if (!cleaned) continue;
      result.push(`style="${cleaned.replace(/"/g, '&quot;')}"`);
      continue;
    }

    result.push(`${attrName}="${attrValue.replace(/"/g, '&quot;')}"`);
  }

  if (tagName === 'a') {
    const hasTarget = result.some((a) => a.startsWith('target='));
    if (hasTarget && !result.some((a) => a.startsWith('rel='))) {
      result.push('rel="noopener noreferrer"');
    }
  }

  return result.length > 0 ? ' ' + result.join(' ') : '';
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';

  let cleaned = html.replace(COMMENT_RE, '').replace(/\0/g, '');

  cleaned = cleaned.replace(TAG_RE, (fullMatch, tagName: string, attrString: string) => {
    const lower = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return '';

    if (fullMatch.startsWith('</')) return `</${lower}>`;

    const isSelfClosing = fullMatch.endsWith('/>');
    const sanitizedAttrs = sanitizeAttributes(lower, attrString || '');
    return `<${lower}${sanitizedAttrs}${isSelfClosing ? ' /' : ''}>`;
  });

  return cleaned;
}
