import { AMZF_COPY } from './copy';
import { getOpenPhases, getPhaseWindows } from './prepRules';
import type { EventOccurrence, EventLifecycle, IsoDate, PrepPhaseId, PrimaryCta } from './types';

export type { PrimaryCta } from './types';

/** Tie-break when phase ends share the same day (lower = higher priority). */
const URGENCY_TIE_RANK: Record<string, number> = {
  enroll: 0,
  inventory: 1,
  promoTools: 2,
  ppc: 3,
  execute: 4,
  review: 5,
};

type CtaCandidate = PrimaryCta & { phaseEnd: IsoDate; phaseId: PrepPhaseId | 'default' };

function routeCta(
  key: string,
  copyKey: keyof typeof AMZF_COPY,
  routeId: string,
  phaseEnd: IsoDate,
  phaseId: PrepPhaseId
): CtaCandidate {
  return {
    key,
    label: AMZF_COPY[copyKey],
    routeId,
    kind: 'route',
    phaseEnd,
    phaseId,
  };
}

function localCta(
  key: string,
  copyKey: keyof typeof AMZF_COPY,
  phaseEnd: IsoDate,
  phaseId: PrepPhaseId
): CtaCandidate {
  return {
    key,
    label: AMZF_COPY[copyKey],
    kind: 'local',
    phaseEnd,
    phaseId,
  };
}

function phaseEndMap(occ: EventOccurrence): Map<PrepPhaseId, IsoDate> {
  const map = new Map<PrepPhaseId, IsoDate>();
  for (const w of getPhaseWindows(occ)) {
    map.set(w.id, w.end);
  }
  return map;
}

/**
 * Map open phases → CTA candidates.
 * `ads` yields TWO candidates (promoTools + ppc).
 */
export function collectOpenCandidates(occ: EventOccurrence, today: IsoDate): CtaCandidate[] {
  const open = getOpenPhases(occ, today);
  const ends = phaseEndMap(occ);
  const candidates: CtaCandidate[] = [];

  for (const phase of open) {
    const end = ends.get(phase) ?? today;
    switch (phase) {
      case 'inventory':
        candidates.push(
          routeCta('inventory', 'cta.inventory', 'sops_inventory_replenishment', end, phase)
        );
        break;
      case 'enroll':
        candidates.push(
          routeCta('enroll', 'cta.enroll', 'sops_promotion_submission', end, phase)
        );
        break;
      case 'ads':
        candidates.push(
          routeCta('promoTools', 'cta.promoTools', 'amz_promo_tools', end, phase),
          routeCta('ppc', 'cta.ppc', 'sops_ppc_advertising', end, phase)
        );
        break;
      case 'execute':
        candidates.push(localCta('execute', 'cta.executeLocal', end, phase));
        break;
      case 'review':
        candidates.push(localCta('review', 'cta.reviewMark', end, phase));
        break;
      default: {
        const _exhaustive: never = phase;
        void _exhaustive;
      }
    }
  }

  return candidates;
}

function sortByUrgency(candidates: CtaCandidate[]): CtaCandidate[] {
  return [...candidates].sort((a, b) => {
    // Sooner phase end first
    if (a.phaseEnd !== b.phaseEnd) {
      return a.phaseEnd < b.phaseEnd ? -1 : 1;
    }
    return (URGENCY_TIE_RANK[a.key] ?? 99) - (URGENCY_TIE_RANK[b.key] ?? 99);
  });
}

function stripPhaseMeta(c: CtaCandidate): PrimaryCta {
  const { phaseEnd: _e, phaseId: _p, ...cta } = c;
  return cta;
}

function defaultCtas(lifecycle: EventLifecycle): PrimaryCta[] {
  if (lifecycle === 'pending') {
    return [
      {
        key: 'pendingSource',
        label: AMZF_COPY['cta.pendingSource'],
        kind: 'anchor',
        anchorId: 'amzf_source_panel',
      },
    ];
  }
  if (lifecycle === 'ended') {
    return [
      {
        key: 'endedReview',
        label: AMZF_COPY['cta.endedReview'],
        kind: 'local',
      },
    ];
  }
  // upcoming (before any open window) → inventory prep
  return [
    {
      key: 'inventory',
      label: AMZF_COPY['cta.inventory'],
      routeId: 'sops_inventory_replenishment',
      kind: 'route',
    },
  ];
}

export function resolveLifecycle(occ: EventOccurrence, today: IsoDate): EventLifecycle {
  if (occ.confidence === 'pending_official' || !occ.startDate || !occ.endDate) {
    return 'pending';
  }
  if (today < occ.startDate) return 'upcoming';
  if (today > occ.endDate) return 'ended';
  return 'active';
}

/**
 * Up to 2 primary CTAs by urgency.
 * ads open → two candidates; only top-2 by urgency land here.
 */
export function getPrimaryCtas(occ: EventOccurrence, today: IsoDate): PrimaryCta[] {
  const candidates = sortByUrgency(collectOpenCandidates(occ, today));
  if (candidates.length === 0) {
    return defaultCtas(resolveLifecycle(occ, today));
  }
  return candidates.slice(0, 2).map(stripPhaseMeta);
}

/**
 * Secondary CTAs: ads candidates not in primary + promoKnowledge.
 */
export function getSecondaryCtas(
  occ: EventOccurrence,
  today: IsoDate,
  primary: PrimaryCta[]
): PrimaryCta[] {
  const primaryKeys = new Set(primary.map((c) => c.key));
  const secondary: PrimaryCta[] = [];

  const openCandidates = collectOpenCandidates(occ, today);
  for (const c of openCandidates) {
    if ((c.key === 'promoTools' || c.key === 'ppc') && !primaryKeys.has(c.key)) {
      secondary.push(stripPhaseMeta(c));
    }
  }

  if (!primaryKeys.has('promoKnowledge')) {
    secondary.push({
      key: 'promoKnowledge',
      label: AMZF_COPY['cta.promoKnowledge'],
      routeId: 'amz_promo_activities',
      kind: 'route',
    });
  }

  return secondary;
}
