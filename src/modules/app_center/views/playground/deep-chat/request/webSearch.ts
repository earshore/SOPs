/**
 * Lightweight client-side web / X search for Deep Chat business tools.
 * Uses a public reader proxy (jina.ai) over DuckDuckGo HTML results when available.
 * Failures return structured JSON so the model can still produce a final answer.
 */

export type WebSearchResult = {
  query: string;
  source: 'duckduckgo_reader' | 'error';
  resultsText: string;
  truncated: boolean;
};

// Keep tool payloads compact so the model can finish a final answer in-budget.
const MAX_RESULT_CHARS = 3_500;
const SEARCH_TIMEOUT_MS = 12_000;

/** DuckDuckGo region picker labels (HTML chrome, not search results). */
const DDG_REGION_MARKERS = [
  'All Regions',
  'Argentina',
  'Australia',
  'Austria',
  'Belgium (fr)',
  'Belgium (nl)',
  'Brazil',
  'Bulgaria',
  'Canada (en)',
  'Canada (fr)',
  'Catalonia',
  'Chile',
  'China',
  'Colombia',
  'Croatia',
  'Czech Republic',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hong Kong',
  'Hungary',
  'Iceland',
  'India (en)',
  'Indonesia (en)',
  'Ireland',
  'Israel (en)',
  'Italy',
  'Japan',
  'Korea',
  'Latvia',
  'Lithuania',
  'Malaysia (en)',
  'Mexico',
  'Netherlands',
  'New Zealand',
  'Norway',
  'Pakistan (en)',
  'Peru',
  'Philippines (en)',
  'Poland',
  'Portugal',
  'Romania',
  'Russia',
  'Saudi Arabia',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'South Africa',
  'Spain (ca)',
  'Spain (es)',
  'Sweden',
  'Switzerland (de)',
  'Switzerland (fr)',
  'Taiwan',
  'Thailand (en)',
  'Turkey',
  'US (English)',
  'US (Spanish)',
  'Ukraine',
  'United Kingdom',
  'Vietnam (en)',
] as const;

const DDG_TIME_MARKERS = ['Any Time', 'Past Day', 'Past Week', 'Past Month', 'Past Year'] as const;

function buildDuckDuckGoHtmlUrl(query: string): string {
  // lite has less chrome than html.duckduckgo.com; still strip UI noise below.
  return `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
}

function buildReaderUrl(targetUrl: string): string {
  // jina.ai reader returns plain text/markdown and is often CORS-friendly.
  return `https://r.jina.ai/${targetUrl}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/plain, text/markdown, text/html;q=0.8,*/*;q=0.5',
        'X-Return-Format': 'text',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function clip(text: string, max = MAX_RESULT_CHARS): { text: string; truncated: boolean } {
  const t = text.trim();
  if (t.length <= max) return { text: t, truncated: false };
  return { text: `${t.slice(0, max)}\n…[truncated]`, truncated: true };
}

const CHROME_LINE_PATTERNS: RegExp[] = [
  /^https?:\/\/r\.jina\.ai\//i,
  /^URL Source:\s*/i,
  /^Markdown Content:\s*/i,
  /^Published Time:\s*/i,
  /^(Settings|Privacy|Themes|All|News|Images|Videos|Maps|Shopping)\s*$/i,
  /^Region\s*$/i,
  /^Safe Search\s*$/i,
  /^Date\s*$/i,
];

function isChromeOnlyLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^Title:\s*/i.test(t) && /duckduckgo/i.test(t)) return true;
  if (/^\[?DuckDuckGo\]?/i.test(t) && t.length < 40) return true;
  if (CHROME_LINE_PATTERNS.some(re => re.test(t))) return true;
  if ((DDG_REGION_MARKERS as readonly string[]).includes(t)) return true;
  if ((DDG_TIME_MARKERS as readonly string[]).includes(t)) return true;
  // Lone region list fragment lines
  return /^\(?[a-z]{2}(?:-[a-z]{2})?\)?$/i.test(t) && t.length <= 8;
}

/**
 * Strip DuckDuckGo chrome that jina reader dumps as plain text
 * (region picker, date filters, site chrome) so tools only surface results.
 */
export function sanitizeDuckDuckGoReaderText(raw: string): string {
  if (!raw.trim()) return '';

  let text = raw.replace(/\r\n/g, '\n');

  // Drop a contiguous region+time filter block when present.
  const regionStart = text.search(/(?:^|\n)\s*All Regions\s*(?:\n|$)/);
  if (regionStart >= 0) {
    const afterRegions = text.slice(regionStart);
    const timeEnd = afterRegions.search(/(?:^|\n)\s*Past Year\s*(?:\n|$)/i);
    if (timeEnd >= 0) {
      const endIdx = regionStart + timeEnd + afterRegions.slice(timeEnd).indexOf('\n') + 1;
      // Prefer cutting from "All Regions" through "Past Year"
      const pastYearMatch = text.slice(regionStart).match(/Past Year[^\n]*\n?/i);
      if (pastYearMatch && pastYearMatch.index != null) {
        const cutEnd = regionStart + pastYearMatch.index + pastYearMatch[0].length;
        text = `${text.slice(0, regionStart)}${text.slice(cutEnd)}`;
      } else {
        text = `${text.slice(0, regionStart)}${text.slice(endIdx)}`;
      }
    }
  }

  // Line-level filter for residual chrome.
  const lines = text.split('\n');
  const kept: string[] = [];
  let consecutiveChrome = 0;
  for (const line of lines) {
    if (isChromeOnlyLine(line)) {
      consecutiveChrome += 1;
      // Allow a single blank-ish skip, but drop chrome runs
      if (consecutiveChrome <= 1 && !line.trim()) {
        // skip blank
      }
      continue;
    }
    consecutiveChrome = 0;
    kept.push(line);
  }

  return kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Search the open web for a query string.
 */
export async function runWebSearch(query: string): Promise<WebSearchResult> {
  const q = query.trim();
  if (!q) {
    return {
      query: '',
      source: 'error',
      resultsText: 'Empty query',
      truncated: false,
    };
  }

  try {
    const target = buildDuckDuckGoHtmlUrl(q);
    const res = await fetchWithTimeout(buildReaderUrl(target), SEARCH_TIMEOUT_MS);
    if (!res.ok) {
      return {
        query: q,
        source: 'error',
        resultsText: `Search HTTP ${res.status}`,
        truncated: false,
      };
    }
    const body = await res.text();
    const cleaned = sanitizeDuckDuckGoReaderText(body);
    const { text, truncated } = clip(cleaned || body);
    return {
      query: q,
      source: 'duckduckgo_reader',
      resultsText: text || '(no results text)',
      truncated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      query: q,
      source: 'error',
      resultsText: `Search failed: ${message}`,
      truncated: false,
    };
  }
}

/**
 * Search X / Twitter-oriented discussion via web search operators.
 * True X API is not available in the browser client; this approximates with site filters.
 */
export async function runSearchX(args: {
  query: string;
  limit?: number;
  mode?: string;
  from_date?: string;
}): Promise<WebSearchResult & { mode?: string; limit?: number; from_date?: string }> {
  const base = args.query.trim();
  if (!base) {
    return {
      query: '',
      source: 'error',
      resultsText: 'Empty query',
      truncated: false,
      mode: args.mode,
      limit: args.limit,
      from_date: args.from_date,
    };
  }

  const operators = ['(site:x.com OR site:twitter.com)', base];
  if (args.from_date && /^\d{4}-\d{2}-\d{2}$/.test(args.from_date)) {
    operators.push(`after:${args.from_date}`);
  }
  const composed = operators.join(' ');
  const result = await runWebSearch(composed);
  return {
    ...result,
    query: base,
    mode: args.mode,
    limit: args.limit,
    from_date: args.from_date,
    resultsText: [
      `X/Twitter-oriented web search for: ${base}`,
      args.mode ? `mode=${args.mode}` : '',
      args.limit != null ? `limit=${args.limit}` : '',
      args.from_date ? `from_date=${args.from_date}` : '',
      '',
      result.resultsText,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function parseToolArgsObject(argsJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(argsJson || '{}') as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
}
