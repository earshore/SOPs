/** ISO calendar date as `YYYY-MM-DD` (local civil date, not a Date instant). */
export type IsoDate = string;

export type EventType = 'holiday' | 'shopping' | 'cultural' | 'financial' | 'season';
export type EventPriority = 'S' | 'A' | 'B';
export type PrepPhaseId = 'inventory' | 'enroll' | 'ads' | 'execute' | 'review';
export type DateConfidence = 'exact' | 'computed' | 'approximate' | 'pending_official';
export type EventLifecycle = 'upcoming' | 'active' | 'ended' | 'pending';

/**
 * Calendar date rules for evergreen marketing event templates.
 * Resolved via `resolveDateRule(rule, year)` using local y/m/d only.
 */
export type DateRule =
  | { kind: 'fixed'; month: number; day: number; durationDays?: number }
  | {
      kind: 'range_fixed';
      startMonth: number;
      startDay: number;
      endMonth: number;
      endDay: number;
    }
  | {
      kind: 'nth_weekday';
      month: number;
      weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      nth: number | 'last';
      durationDays?: number;
    }
  | { kind: 'easter_offset'; offsetDays: number; durationDays?: number }
  | { kind: 'black_friday' }
  | { kind: 'cyber_monday' }
  | {
      kind: 'approximate_window';
      startMonth: number;
      startDay: number;
      endMonth: number;
      endDay: number;
    }
  | { kind: 'annual_override_only' }
  | { kind: 'mothering_sunday' };

export type PrepPhaseOffset = { offsetStart: number; offsetEnd: number };

/** Runtime instance for one template × year after resolveYear. */
export interface EventOccurrence {
  occurrenceId: string;
  templateId: string;
  year: number;
  name: string;
  nameEn: string;
  emoji: string;
  type: EventType;
  priority: EventPriority;
  countries: string[];
  description: string;
  strategy: string;
  tags: string[];
  startDate: IsoDate;
  endDate: IsoDate;
  dateLabel: string;
  confidence: DateConfidence;
  sources?: Array<{ label: string; url: string; verifiedAt?: IsoDate }>;
  links?: Array<{ label: string; routeId: string }>;
  amazonOfficial?: boolean;
  prepOverrides?: Partial<Record<PrepPhaseId, PrepPhaseOffset>>;
}

/** UI-ready view of an occurrence with derived phases and CTAs. */
export interface OpsEventView {
  occurrence: EventOccurrence;
  openPhases: PrepPhaseId[];
  lifecycle: EventLifecycle;
  primaryCtas: PrimaryCta[];
  secondaryCtas: PrimaryCta[];
  watched: boolean;
}

export type PrimaryCta = {
  key: string;
  label: string;
  routeId?: string;
  kind: 'route' | 'local' | 'anchor';
  anchorId?: string;
};

export type OpsTimeWindow = 'month' | 'd30' | 'd60' | 'all';

export type OpsFilters = {
  selectedCountry?: string;
  selectedTypes?: EventType[];
  timeWindow?: OpsTimeWindow;
  showEnded?: boolean;
  searchTerm?: string;
};
