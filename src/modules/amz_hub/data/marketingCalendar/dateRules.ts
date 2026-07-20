import type { DateRule, IsoDate } from './types';

export type { DateRule, IsoDate } from './types';

/** Parse `YYYY-MM-DD` into local civil y/m/d. Never uses Date timezone parsing. */
export function parseIsoDateLocal(iso: IsoDate): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new Error(`Invalid IsoDate: ${iso}`);
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return { y, m, d };
}

/** Format local civil y/m/d as zero-padded `YYYY-MM-DD`. */
export function toIsoDate(y: number, m: number, d: number): IsoDate {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** Local-midnight Date from civil y/m/d (never `new Date('YYYY-MM-DD')`). */
function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function fromLocalDate(date: Date): IsoDate {
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Add `days` to a local civil date; returns ISO string. */
export function addDaysIso(iso: IsoDate, days: number): IsoDate {
  const { y, m, d } = parseIsoDateLocal(iso);
  const date = localDate(y, m, d);
  date.setDate(date.getDate() + days);
  return fromLocalDate(date);
}

/**
 * Western (Gregorian) Easter Sunday via the Anonymous Gregorian algorithm.
 * Returns local civil month/day for the given year.
 */
export function westernEaster(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function singleDay(
  y: number,
  m: number,
  d: number,
  durationDays?: number
): {
  start: IsoDate;
  end: IsoDate;
} {
  const start = toIsoDate(y, m, d);
  const span = durationDays ?? 1;
  const end = span <= 1 ? start : addDaysIso(start, span - 1);
  return { start, end };
}

/**
 * nth weekday of month (JS weekday: 0=Sun … 6=Sat).
 * `nth: 'last'` = last occurrence in that month.
 */
function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nth: number | 'last'
): { y: number; m: number; d: number } {
  if (nth === 'last') {
    const lastDay = localDate(year, month + 1, 0);
    const dow = lastDay.getDay();
    const delta = (dow - weekday + 7) % 7;
    lastDay.setDate(lastDay.getDate() - delta);
    return {
      y: lastDay.getFullYear(),
      m: lastDay.getMonth() + 1,
      d: lastDay.getDate(),
    };
  }

  const first = localDate(year, month, 1);
  const firstDow = first.getDay();
  const offset = (weekday - firstDow + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return { y: year, m: month, d: day };
}

/** 4th Thursday of November, then +1 day → Black Friday. */
function blackFridayDate(year: number): IsoDate {
  const thu = nthWeekdayOfMonth(year, 11, 4, 4);
  return addDaysIso(toIsoDate(thu.y, thu.m, thu.d), 1);
}

/**
 * Resolve a date rule for a calendar year into a local ISO start/end range.
 * `annual_override_only` always returns null (must come from year overrides).
 */
export function resolveDateRule(
  rule: DateRule,
  year: number
): { start: IsoDate; end: IsoDate } | null {
  switch (rule.kind) {
    case 'fixed':
      return singleDay(year, rule.month, rule.day, rule.durationDays);

    case 'range_fixed':
      return {
        start: toIsoDate(year, rule.startMonth, rule.startDay),
        end: toIsoDate(year, rule.endMonth, rule.endDay),
      };

    case 'nth_weekday': {
      const { y, m, d } = nthWeekdayOfMonth(year, rule.month, rule.weekday, rule.nth);
      return singleDay(y, m, d, rule.durationDays);
    }

    case 'easter_offset': {
      const easter = westernEaster(year);
      const start = addDaysIso(toIsoDate(year, easter.month, easter.day), rule.offsetDays);
      const { y, m, d } = parseIsoDateLocal(start);
      return singleDay(y, m, d, rule.durationDays);
    }

    case 'mothering_sunday': {
      // 4th Sunday of Lent = Easter Sunday − 21 days
      const easter = westernEaster(year);
      const start = addDaysIso(toIsoDate(year, easter.month, easter.day), -21);
      return { start, end: start };
    }

    case 'black_friday': {
      const start = blackFridayDate(year);
      return { start, end: start };
    }

    case 'cyber_monday': {
      const start = addDaysIso(blackFridayDate(year), 3);
      return { start, end: start };
    }

    case 'approximate_window':
      return {
        start: toIsoDate(year, rule.startMonth, rule.startDay),
        end: toIsoDate(year, rule.endMonth, rule.endDay),
      };

    case 'annual_override_only':
      return null;

    default: {
      const _exhaustive: never = rule;
      return _exhaustive;
    }
  }
}
