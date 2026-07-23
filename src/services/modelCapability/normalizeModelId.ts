/**
 * Normalize gateway model ids before capability matching.
 * Handles vendor prefixes and common short aliases (e.g. 5.6-terra → gpt-5.6-terra).
 */

/** Explicit gateway aliases → canonical id used for pattern matching. */
const MODEL_ID_ALIASES: Record<string, string> = {
  '5.6-terra': 'gpt-5.6-terra',
  '5.5-terra': 'gpt-5.5-terra',
  '5.5': 'gpt-5.5',
  '5.6': 'gpt-5.6',
};

/**
 * Strip a single vendor/org prefix: "openai/gpt-5.5" → "gpt-5.5".
 * Does not strip if no slash or empty segment.
 */
export function stripVendorPrefix(modelId: string): string {
  const trimmed = modelId.trim();
  const slash = trimmed.indexOf('/');
  if (slash <= 0 || slash === trimmed.length - 1) {
    return trimmed;
  }
  return trimmed.slice(slash + 1).trim() || trimmed;
}

/**
 * Normalize model id for capability registry matching (not for request body model field).
 * Request body should still use the original id the gateway expects.
 */
export function normalizeModelIdForCapability(modelId: string): string {
  let id = stripVendorPrefix(modelId);
  if (!id) return '';

  const lower = id.toLowerCase();
  const aliased = MODEL_ID_ALIASES[lower];
  if (aliased) {
    return aliased;
  }

  // Bare "5.x-*" gateway codenames → gpt-5.x-*
  if (!lower.startsWith('gpt-') && /^5\.\d+/.test(lower)) {
    return `gpt-${id}`;
  }

  return id;
}
