import { addDaysIso } from './dateRules';
import type {
  EventOccurrence,
  EventPriority,
  EventType,
  IsoDate,
  PrepPhaseId,
  PrepPhaseOffset,
} from './types';

export type PhaseWindow = { id: PrepPhaseId; start: IsoDate; end: IsoDate };

/** Base offset tables relative to startDate (T0), design §5.4. */
type PhaseTable = Partial<Record<PrepPhaseId, PrepPhaseOffset | 'skip'>>;

function shoppingTable(priority: EventPriority): PhaseTable {
  if (priority === 'S') {
    return {
      inventory: { offsetStart: -56, offsetEnd: -14 },
      enroll: { offsetStart: -28, offsetEnd: -7 },
      ads: { offsetStart: -21, offsetEnd: -1 },
      // execute / review resolved from start/end dates below
    };
  }
  // shopping A/B
  return {
    inventory: { offsetStart: -42, offsetEnd: -14 },
    enroll: { offsetStart: -21, offsetEnd: -7 },
    ads: { offsetStart: -14, offsetEnd: -1 },
  };
}

function tableFor(type: EventType, priority: EventPriority): PhaseTable {
  switch (type) {
    case 'shopping':
      return shoppingTable(priority);
    case 'holiday':
    case 'cultural':
      return {
        inventory: { offsetStart: -42, offsetEnd: -14 },
        enroll: 'skip',
        ads: { offsetStart: -21, offsetEnd: -1 },
        // execute: T-3..Tend handled specially
      };
    case 'financial':
    case 'season':
      return {
        inventory: { offsetStart: -35, offsetEnd: -14 },
        enroll: 'skip',
        ads: { offsetStart: -14, offsetEnd: -1 },
      };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function hasUsableDates(occ: EventOccurrence): boolean {
  if (occ.confidence === 'pending_official') return false;
  return Boolean(occ.startDate && occ.endDate);
}

/**
 * Resolve prep phase calendar windows for an occurrence.
 * Windows may overlap. Skipped phases (e.g. enroll on holiday) are omitted.
 */
export function getPhaseWindows(occ: EventOccurrence): PhaseWindow[] {
  if (!hasUsableDates(occ)) return [];

  const { startDate, endDate, type, priority, prepOverrides } = occ;
  const base = tableFor(type, priority);
  const windows: PhaseWindow[] = [];

  const pushOffsetPhase = (id: PrepPhaseId, def: PrepPhaseOffset | 'skip' | undefined) => {
    if (def === 'skip' || def === undefined) return;
    const override = prepOverrides?.[id];
    const offsets = override ?? def;
    windows.push({
      id,
      start: addDaysIso(startDate, offsets.offsetStart),
      end: addDaysIso(startDate, offsets.offsetEnd),
    });
  };

  pushOffsetPhase('inventory', base.inventory);
  pushOffsetPhase('enroll', base.enroll);
  pushOffsetPhase('ads', base.ads);

  // execute: shopping/financial/season = T0..Tend; holiday/cultural = T-3..Tend
  const executeOverride = prepOverrides?.execute;
  if (executeOverride) {
    windows.push({
      id: 'execute',
      start: addDaysIso(startDate, executeOverride.offsetStart),
      end: addDaysIso(startDate, executeOverride.offsetEnd),
    });
  } else if (type === 'holiday' || type === 'cultural') {
    windows.push({
      id: 'execute',
      start: addDaysIso(startDate, -3),
      end: endDate,
    });
  } else {
    windows.push({ id: 'execute', start: startDate, end: endDate });
  }

  // review: Tend+1..Tend+7
  const reviewOverride = prepOverrides?.review;
  if (reviewOverride) {
    windows.push({
      id: 'review',
      start: addDaysIso(startDate, reviewOverride.offsetStart),
      end: addDaysIso(startDate, reviewOverride.offsetEnd),
    });
  } else {
    windows.push({
      id: 'review',
      start: addDaysIso(endDate, 1),
      end: addDaysIso(endDate, 7),
    });
  }

  return windows;
}

/** Inclusive civil-date containment via ISO string order (YYYY-MM-DD). */
export function isDateInWindow(today: IsoDate, start: IsoDate, end: IsoDate): boolean {
  return today >= start && today <= end;
}

/**
 * Phases whose window contains `today` (inclusive).
 * pending / empty dates → [].
 */
export function getOpenPhases(occ: EventOccurrence, today: IsoDate): PrepPhaseId[] {
  return getPhaseWindows(occ)
    .filter((w) => isDateInWindow(today, w.start, w.end))
    .map((w) => w.id);
}
