import type {
  EffectiveReasoningPrefs,
  ReasoningEffort,
  ReasoningEffortLevel,
  ReasoningUserPrefs,
  ResolvedModelCapability,
  SessionReasoningOverride,
} from './types';
import { DEFAULT_REASONING_PREFS, isReasoningEffortLevel } from './types';

const EFFORT_TIER_ORDER: readonly ReasoningEffortLevel[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];

function nearestAllowedEffort(
  preferred: ReasoningEffortLevel,
  allowed: readonly ReasoningEffortLevel[]
): ReasoningEffortLevel | null {
  const idx = EFFORT_TIER_ORDER.indexOf(preferred);
  if (idx < 0) return null;
  for (let i = idx; i >= 0; i--) {
    const tier = EFFORT_TIER_ORDER[i];
    if (tier && allowed.includes(tier)) return tier;
  }
  for (let i = idx + 1; i < EFFORT_TIER_ORDER.length; i++) {
    const tier = EFFORT_TIER_ORDER[i];
    if (tier && allowed.includes(tier)) return tier;
  }
  return null;
}

/**
 * Map a preferred effort onto what the model/surface allows.
 * - Exact match when allowed.
 * - Otherwise nearest lower-or-equal tier (max→high when high is top), then walk up.
 * Never silently drops to medium unless medium is the nearest allowed tier (or list empty).
 */
export function clampEffort(
  effort: ReasoningEffort | undefined,
  allowed: readonly ReasoningEffortLevel[]
): ReasoningEffortLevel {
  if (allowed.length === 0) return 'medium';
  if (effort && effort !== 'off' && allowed.includes(effort)) return effort;
  if (effort && effort !== 'off') {
    const nearest = nearestAllowedEffort(effort, allowed);
    if (nearest) return nearest;
  }
  if (allowed.includes('medium')) return 'medium';
  return allowed[0] ?? 'medium';
}

/** True when intent was demoted to fit the model allowlist. */
export function isEffortDemoted(requested: ReasoningEffort, effective: ReasoningEffort): boolean {
  return requested !== 'off' && effective !== 'off' && requested !== effective;
}

export function normalizeReasoningUserPrefs(
  prefs: Partial<ReasoningUserPrefs> | null | undefined
): ReasoningUserPrefs {
  return {
    enabled: Boolean(prefs?.enabled),
    effort: isReasoningEffortLevel(prefs?.effort) ? prefs.effort : DEFAULT_REASONING_PREFS.effort,
  };
}

/**
 * Session explicit fields beat global; capability fail-closes when unsupported.
 * Always returns requestedEffort (pre-clamp) for observability.
 */
function resolveUserEnabled(
  session: SessionReasoningOverride | null | undefined,
  global: ReasoningUserPrefs | null | undefined,
  defaultEnabled: boolean | undefined
): boolean {
  if (session?.enabled !== undefined) return Boolean(session.enabled);
  if (global?.enabled !== undefined) return Boolean(global.enabled);
  return Boolean(defaultEnabled);
}

export function resolveEffectiveReasoning(
  capability: Pick<
    ResolvedModelCapability,
    'supportsReasoning' | 'reasoningEfforts' | 'defaultEffort' | 'defaultEnabled' | 'mapRequest'
  >,
  /**
   * Stored user prefs; undefined means the user never expressed a preference,
   * in which case the capability default applies (vendor default semantics).
   */
  global: ReasoningUserPrefs | null | undefined,
  session?: SessionReasoningOverride | null
): EffectiveReasoningPrefs {
  if (!capability.supportsReasoning || !capability.mapRequest) {
    return { enabled: false, effort: 'off', requestedEffort: 'off' };
  }

  const efforts =
    capability.reasoningEfforts.length > 0
      ? capability.reasoningEfforts
      : (['low', 'medium', 'high'] as ReasoningEffortLevel[]);

  const enabled = resolveUserEnabled(session, global, capability.defaultEnabled);

  const rawEffort: ReasoningEffort =
    session?.effort !== undefined
      ? session.effort
      : (global?.effort ?? capability.defaultEffort ?? 'medium');

  const clamped = clampEffort(rawEffort, efforts);

  if (!enabled) {
    return { enabled: false, effort: 'off', requestedEffort: rawEffort };
  }

  return { enabled: true, effort: clamped, requestedEffort: rawEffort };
}
