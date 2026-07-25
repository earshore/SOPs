import type {
  EffectiveReasoningPrefs,
  ReasoningEffort,
  ReasoningEffortLevel,
  ReasoningUserPrefs,
  ResolvedModelCapability,
  SessionReasoningOverride,
} from './types';
import { DEFAULT_REASONING_PREFS, isReasoningEffortLevel } from './types';

export function clampEffort(
  effort: ReasoningEffort | undefined,
  allowed: readonly ReasoningEffortLevel[]
): ReasoningEffortLevel {
  if (effort && effort !== 'off' && allowed.includes(effort)) {
    return effort;
  }
  if (allowed.includes('medium')) return 'medium';
  return allowed[0] ?? 'medium';
}

export function normalizeReasoningUserPrefs(
  prefs: Partial<ReasoningUserPrefs> | null | undefined
): ReasoningUserPrefs {
  return {
    enabled: Boolean(prefs?.enabled),
    effort: isReasoningEffortLevel(prefs?.effort)
      ? prefs.effort
      : DEFAULT_REASONING_PREFS.effort,
  };
}

/**
 * Session explicit fields beat global; capability fail-closes when unsupported.
 */
export function resolveEffectiveReasoning(
  capability: Pick<
    ResolvedModelCapability,
    'supportsReasoning' | 'reasoningEfforts' | 'defaultEffort' | 'mapRequest'
  >,
  global: ReasoningUserPrefs,
  session?: SessionReasoningOverride | null
): EffectiveReasoningPrefs {
  if (!capability.supportsReasoning || !capability.mapRequest) {
    return { enabled: false, effort: 'off' };
  }

  const efforts =
    capability.reasoningEfforts.length > 0
      ? capability.reasoningEfforts
      : (['low', 'medium', 'high'] as ReasoningEffortLevel[]);

  const enabled =
    session?.enabled !== undefined ? Boolean(session.enabled) : Boolean(global.enabled);

  const rawEffort: ReasoningEffort | undefined =
    session?.effort !== undefined
      ? session.effort
      : (global.effort ?? capability.defaultEffort ?? 'medium');

  const effort = clampEffort(rawEffort, efforts);

  if (!enabled) {
    return { enabled: false, effort: 'off' };
  }

  return { enabled: true, effort };
}
