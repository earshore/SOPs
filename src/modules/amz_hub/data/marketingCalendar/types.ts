/** ISO calendar date as `YYYY-MM-DD` (local civil date, not a Date instant). */
export type IsoDate = string;

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
