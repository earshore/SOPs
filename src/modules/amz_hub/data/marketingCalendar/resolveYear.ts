import { parseIsoDateLocal, resolveDateRule } from './dateRules';
import { getOverridesForYear } from './overrides';
import { MARKETING_EVENT_TEMPLATES } from './templates';
import type {
  DateConfidence,
  DateRule,
  EventOccurrence,
  IsoDate,
  MarketingEventTemplate,
  YearEventOverride,
} from './types';

export { getOverridesForYear } from './overrides';
export { MARKETING_EVENT_TEMPLATES } from './templates';

function formatDateLabel(start: IsoDate, end: IsoDate): string {
  if (!start) return '待官方确认';
  const s = parseIsoDateLocal(start);
  const e = parseIsoDateLocal(end || start);
  if (start === end || !end) {
    return `${s.m}月${s.d}日`;
  }
  if (s.m === e.m) {
    return `${s.m}月${s.d}-${e.d}日`;
  }
  return `${s.m}月${s.d}日-${e.m}月${e.d}日`;
}

function confidenceFromRule(rule: DateRule): DateConfidence {
  switch (rule.kind) {
    case 'approximate_window':
      return 'approximate';
    case 'annual_override_only':
      return 'pending_official';
    default:
      return 'computed';
  }
}

function mergeOccurrence(
  template: MarketingEventTemplate,
  year: number,
  override: YearEventOverride | undefined
): EventOccurrence | null {
  if (override?.disabled) return null;

  const base: Omit<
    EventOccurrence,
    'startDate' | 'endDate' | 'dateLabel' | 'confidence' | 'sources' | 'countries' | 'priority'
  > = {
    occurrenceId: `${template.id}:${year}`,
    templateId: template.id,
    year,
    name: template.name,
    nameEn: template.nameEn,
    emoji: template.emoji,
    type: template.type,
    description: template.description,
    strategy: template.strategy,
    tags: [...template.tags],
    links: template.links,
    amazonOfficial: template.amazonOfficial,
    prepOverrides: template.prepOverrides,
  };

  if (override) {
    return {
      ...base,
      startDate: override.startDate,
      endDate: override.endDate,
      dateLabel: override.dateLabel ?? formatDateLabel(override.startDate, override.endDate),
      confidence: override.confidence ?? 'exact',
      countries: override.countries ?? [...template.countries],
      priority: override.priority ?? template.priority,
      sources: override.sources,
    };
  }

  const resolved = resolveDateRule(template.dateRule, year);
  if (!resolved) {
    // annual_override_only without year override → pending placeholder
    return {
      ...base,
      startDate: '',
      endDate: '',
      dateLabel: '待官方确认',
      confidence: 'pending_official',
      countries: [...template.countries],
      priority: template.priority,
    };
  }

  return {
    ...base,
    startDate: resolved.start,
    endDate: resolved.end,
    dateLabel: formatDateLabel(resolved.start, resolved.end),
    confidence: confidenceFromRule(template.dateRule),
    countries: [...template.countries],
    priority: template.priority,
  };
}

/**
 * Resolve evergreen templates + year overrides into runtime occurrences.
 * Override wins for dates/confidence/countries/priority; disabled skips.
 */
export function resolveYear(year: number): EventOccurrence[] {
  const overrides = getOverridesForYear(year);
  const byTemplate = new Map(overrides.map(o => [o.templateId, o]));

  const result: EventOccurrence[] = [];
  for (const template of MARKETING_EVENT_TEMPLATES) {
    const occ = mergeOccurrence(template, year, byTemplate.get(template.id));
    if (occ) result.push(occ);
  }
  return result;
}
