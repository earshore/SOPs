import type { ParseSkillMdResult } from './types';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalarMap(block: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match?.[1]) continue;
    map[match[1]] = stripQuotes(match[2] ?? '');
  }
  return map;
}

function extractEmoji(metadataRaw: string | undefined): string | undefined {
  if (!metadataRaw) return undefined;
  try {
    const parsed = JSON.parse(metadataRaw) as { nexscope?: { emoji?: string } };
    const emoji = parsed?.nexscope?.emoji;
    return typeof emoji === 'string' && emoji.length > 0 ? emoji : undefined;
  } catch {
    return undefined;
  }
}

export function parseSkillMd(raw: string): ParseSkillMdResult | null {
  if (!raw || !raw.trim()) return null;

  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return {
      description: '',
      body: raw.trimStart(),
      frontmatter: {},
    };
  }

  const fmBlock = match[1] ?? '';
  const body = raw.slice(match[0].length);
  const scalars = parseScalarMap(fmBlock);
  const name = scalars.name?.trim() || undefined;
  const description = scalars.description ?? '';
  const emoji = extractEmoji(scalars.metadata);

  return {
    name,
    description,
    body,
    frontmatter: { ...scalars },
    emoji,
  };
}

export function extractTitleFromBody(body: string, fallbackId: string): string {
  const h1 = body.match(/^#\s+(.+)$/m);
  if (!h1?.[1]) return fallbackId;
  // Keep emoji and title text; trim trailing whitespace only
  return h1[1].trim() || fallbackId;
}
