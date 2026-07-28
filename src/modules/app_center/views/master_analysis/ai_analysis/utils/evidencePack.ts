/**
 * Deterministic evidence packing for large multi-ASIN analysis.
 * Used by Map–Reduce pipelines so oneshot hygiene (dedupe / compact) is shared.
 *
 * Rules:
 * - Never drop ASINs that still have residual evidence
 * - Exact/normalized dedupe only (no semantic clustering)
 * - Fair per-ASIN quota only when over budget
 * - Compact reduce payloads to avoid output truncation
 */

export type ReviewLike = {
  star_rating: number;
  headline?: string;
  body: string;
  origin_country?: string;
  review_date?: string;
  _origin_site?: string;
};

export type EvidenceDedupeStats = {
  inputCount: number;
  outputCount: number;
  duplicatesRemoved: number;
  emptyRemoved: number;
};

export type EvidenceBudgetStats = {
  applied: boolean;
  budgetLimit: number;
  beforeCount: number;
  afterCount: number;
  omittedByBudget: number;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Normalize free text for exact-ish dedupe keys (deterministic, cheap). */
export function normalizeEvidenceText(value: string | undefined): string {
  return collapseWhitespace(value || '').toLowerCase();
}

export function buildReviewEvidenceKey(review: ReviewLike): string {
  return [
    Number.isFinite(review.star_rating) ? review.star_rating : 'x',
    normalizeEvidenceText(review.origin_country),
    normalizeEvidenceText(review.headline),
    normalizeEvidenceText(review.body),
  ].join('|');
}

/**
 * Drop empty bodies and exact duplicates (order-preserving).
 * Safe for multi-ASIN: call per ASIN slice so attribution is kept.
 */
export function dedupeReviews<T extends ReviewLike>(
  reviews: T[]
): {
  reviews: T[];
  stats: EvidenceDedupeStats;
} {
  const seen = new Set<string>();
  const output: T[] = [];
  let emptyRemoved = 0;
  let duplicatesRemoved = 0;

  for (const review of reviews) {
    if (!normalizeEvidenceText(review.body)) {
      emptyRemoved += 1;
      continue;
    }
    const key = buildReviewEvidenceKey(review);
    if (seen.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(key);
    output.push(review);
  }

  return {
    reviews: output,
    stats: {
      inputCount: reviews.length,
      outputCount: output.length,
      duplicatesRemoved,
      emptyRemoved,
    },
  };
}

export function mergeDedupeStats(parts: EvidenceDedupeStats[]): EvidenceDedupeStats {
  return parts.reduce(
    (acc, part) => ({
      inputCount: acc.inputCount + part.inputCount,
      outputCount: acc.outputCount + part.outputCount,
      duplicatesRemoved: acc.duplicatesRemoved + part.duplicatesRemoved,
      emptyRemoved: acc.emptyRemoved + part.emptyRemoved,
    }),
    { inputCount: 0, outputCount: 0, duplicatesRemoved: 0, emptyRemoved: 0 }
  );
}

export function buildBulletEvidenceKey(bullet: string): string {
  return normalizeEvidenceText(bullet);
}

/** Order-preserving bullet dedupe after trim; drops empties. */
export function dedupeBullets(bullets: string[]): {
  bullets: string[];
  stats: EvidenceDedupeStats;
} {
  const seen = new Set<string>();
  const output: string[] = [];
  let emptyRemoved = 0;
  let duplicatesRemoved = 0;

  for (const bullet of bullets) {
    const trimmed = collapseWhitespace(bullet);
    if (!trimmed) {
      emptyRemoved += 1;
      continue;
    }
    const key = buildBulletEvidenceKey(trimmed);
    if (seen.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(key);
    output.push(trimmed);
  }

  return {
    bullets: output,
    stats: {
      inputCount: bullets.length,
      outputCount: output.length,
      duplicatesRemoved,
      emptyRemoved,
    },
  };
}

export type FairSliceItem<T> = {
  items: T[];
};

/**
 * Deterministic fair quota across slices when total items exceed budget.
 * - Guarantees every non-empty slice keeps at least 1 item when budget >= slice count
 * - Fills remainder round-robin in original order (stable, not random)
 * - Never drops a slice that had residual evidence before quota
 */
/**
 * Bounded parallel pool for Map shards.
 * Keeps gateway pressure lower than unbounded Promise.all while beating pure serial maps.
 */
export async function mapWithConcurrency<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  worker: (item: TItem, index: number) => Promise<TResult>
): Promise<TResult[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(items.length, Math.floor(concurrency) || 1));
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    for (;;) {
      const current = nextIndex++;
      if (current >= items.length) return;
      const item = items[current];
      if (item === undefined) continue;
      results[current] = await worker(item, current);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runWorker()));
  return results;
}

function shouldSkipFairSliceBudget<TItem, TSlice extends FairSliceItem<TItem>>(
  slices: TSlice[],
  budgetLimit: number,
  beforeCount: number
): boolean {
  return budgetLimit <= 0 || beforeCount <= budgetLimit || slices.length === 0;
}

function allocateFairSliceCounts<TItem, TSlice extends FairSliceItem<TItem>>(
  active: TSlice[],
  effectiveBudget: number
): number[] {
  const takenCounts = active.map(() => 0);
  let remaining = effectiveBudget;

  for (const [index, slice] of active.entries()) {
    if (remaining === 0) break;
    if (slice.items.length === 0) continue;
    takenCounts[index] = 1;
    remaining -= 1;
  }

  while (remaining > 0) {
    let filledThisPass = false;
    for (const [index, slice] of active.entries()) {
      if (remaining === 0) break;
      const current = takenCounts[index] || 0;
      if (current >= slice.items.length) continue;
      takenCounts[index] = current + 1;
      remaining -= 1;
      filledThisPass = true;
    }
    if (!filledThisPass) break;
  }

  return takenCounts;
}

export function applyFairSliceBudget<
  TItem,
  TSlice extends FairSliceItem<TItem> = FairSliceItem<TItem>,
>(
  slices: TSlice[],
  budgetLimit: number,
  pickItems: (slice: TSlice, items: TItem[]) => TSlice
): { slices: TSlice[]; stats: EvidenceBudgetStats } {
  const beforeCount = slices.reduce((sum, slice) => sum + slice.items.length, 0);
  const emptyStats = {
    applied: false,
    budgetLimit,
    beforeCount,
    afterCount: beforeCount,
    omittedByBudget: 0,
  };

  if (shouldSkipFairSliceBudget(slices, budgetLimit, beforeCount)) {
    return { slices, stats: emptyStats };
  }

  const nonEmpty = slices.filter(slice => slice.items.length > 0);
  if (nonEmpty.length === 0) {
    return { slices, stats: emptyStats };
  }

  const effectiveBudget = Math.max(1, Math.floor(budgetLimit));
  // If budget < ASIN count, keep first N slices with 1 item each (deterministic coverage).
  const active = nonEmpty.slice(0, Math.min(nonEmpty.length, effectiveBudget));
  const takenCounts = allocateFairSliceCounts(active, effectiveBudget);

  const selected: TSlice[] = [];
  let afterCount = 0;
  for (const [index, slice] of active.entries()) {
    const take = takenCounts[index] || 0;
    const keptItems = slice.items.slice(0, take);
    afterCount += keptItems.length;
    selected.push(pickItems(slice, keptItems));
  }

  return {
    slices: selected,
    stats: {
      applied: true,
      budgetLimit: effectiveBudget,
      beforeCount,
      afterCount,
      omittedByBudget: Math.max(0, beforeCount - afterCount),
    },
  };
}

const DEFAULT_REDUCE_STRING_CHARS = 180;
const DEFAULT_REDUCE_ARRAY_ITEMS = 24;
const DEFAULT_REDUCE_OBJECT_KEYS = 40;

export type CompactReduceOptions = {
  maxStringChars?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  depth?: number;
  maxDepth?: number;
};

/**
 * Shrink mapped JSON before Reduce prompts so synthesis fits output budgets.
 * Truncates strings, caps array length, and drops excess object keys deterministically.
 */
function compactString(value: string, maxStringChars: number): string {
  const collapsed = collapseWhitespace(value);
  if (collapsed.length <= maxStringChars) return collapsed;
  return `${collapsed.slice(0, maxStringChars).trimEnd()}…`;
}

function nextCompactOptions(
  options: Required<
    Pick<CompactReduceOptions, 'maxStringChars' | 'maxArrayItems' | 'maxObjectKeys' | 'maxDepth'>
  > & { depth: number }
): CompactReduceOptions {
  return {
    ...options,
    depth: options.depth + 1,
  };
}

function compactArray(
  value: unknown[],
  options: CompactReduceOptions & {
    maxStringChars: number;
    maxArrayItems: number;
    maxObjectKeys: number;
    depth: number;
    maxDepth: number;
  }
): unknown[] {
  return value
    .slice(0, options.maxArrayItems)
    .map(item => compactForReduce(item, nextCompactOptions(options)));
}

function compactObject(
  value: Record<string, unknown>,
  options: CompactReduceOptions & {
    maxStringChars: number;
    maxArrayItems: number;
    maxObjectKeys: number;
    depth: number;
    maxDepth: number;
  }
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value).slice(0, options.maxObjectKeys)) {
    out[key] = compactForReduce(nested, nextCompactOptions(options));
  }
  return out;
}

function resolveCompactOptions(options: CompactReduceOptions = {}) {
  return {
    maxStringChars: options.maxStringChars ?? DEFAULT_REDUCE_STRING_CHARS,
    maxArrayItems: options.maxArrayItems ?? DEFAULT_REDUCE_ARRAY_ITEMS,
    maxObjectKeys: options.maxObjectKeys ?? DEFAULT_REDUCE_OBJECT_KEYS,
    depth: options.depth ?? 0,
    maxDepth: options.maxDepth ?? 6,
  };
}

function compactAtMaxDepth(value: unknown): unknown {
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (value && typeof value === 'object') return '{…}';
  return value;
}

export function compactForReduce(value: unknown, options: CompactReduceOptions = {}): unknown {
  const resolved = resolveCompactOptions(options);
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return compactString(value, resolved.maxStringChars);
  if (resolved.depth >= resolved.maxDepth) return compactAtMaxDepth(value);
  if (Array.isArray(value)) return compactArray(value, resolved);
  if (value && typeof value === 'object') {
    return compactObject(value as Record<string, unknown>, resolved);
  }
  return value;
}
