/**
 * Encyclopedia (全年百科) HTML renderers — pure strings; caller uses setSafeHtml.
 * Operates on EventOccurrence[] from resolveYear (not legacy AMZF_EVENTS shapes).
 */

import { escapeHtml } from '@/common/utils/security';
import { AMZF_COUNTRIES, AMZF_MONTHS } from '@/modules/amz_hub/constants/amz_hub_constants';
import { parseIsoDateLocal } from '@/modules/amz_hub/data/marketingCalendar/dateRules';
import { MARKETING_EVENT_TEMPLATES } from '@/modules/amz_hub/data/marketingCalendar/templates';
import { AMZF_COPY } from '@/modules/amz_hub/data/marketingCalendar/copy';
import type { EventOccurrence, EventType } from '@/modules/amz_hub/data/marketingCalendar/types';
import type { CountryInfo } from '@/types/modules-business';

const DEFAULT_MONTH_BY_TEMPLATE = new Map(
  MARKETING_EVENT_TEMPLATES.map(t => [t.id, t.defaultMonth ?? 1])
);

const EVENT_TYPE_META: Record<EventType, { label: string; icon: string }> = {
  holiday: { label: AMZF_COPY['filter.type.holiday'], icon: 'fas fa-gift' },
  shopping: { label: AMZF_COPY['filter.type.shopping'], icon: 'fas fa-cart-shopping' },
  cultural: { label: AMZF_COPY['filter.type.cultural'], icon: 'fas fa-masks-theater' },
  financial: { label: AMZF_COPY['filter.type.financial'], icon: 'fas fa-coins' },
  season: { label: AMZF_COPY['filter.type.season'], icon: 'fas fa-seedling' },
};

export type EncyclopediaView = 'country' | 'event';

export interface RenderEncyclopediaInput {
  occurrences: EventOccurrence[];
  view: EncyclopediaView;
  searchTerm?: string;
  expandedSections?: ReadonlySet<string> | string[];
  months?: readonly string[];
  countries?: readonly CountryInfo[];
}

function isExpanded(
  expanded: ReadonlySet<string> | string[] | undefined,
  sectionId: string,
  searchActive: boolean
): boolean {
  if (searchActive) return true;
  if (!expanded) return false;
  if (expanded instanceof Set) return expanded.has(sectionId);
  return expanded.includes(sectionId);
}

/** Month 1–12 for grouping; pending without startDate uses template defaultMonth. */
export function getOccurrenceMonth(occ: EventOccurrence): number {
  if (occ.startDate) {
    try {
      return parseIsoDateLocal(occ.startDate).m;
    } catch {
      // fall through to template default
    }
  }
  return DEFAULT_MONTH_BY_TEMPLATE.get(occ.templateId) ?? 1;
}

function getEventTypeMeta(type: string): { label: string; icon: string } {
  return (
    EVENT_TYPE_META[type as EventType] ?? {
      label: '营销节点',
      icon: 'fas fa-calendar-day',
    }
  );
}

function renderCountryBadges(
  codes: string[],
  countries: readonly CountryInfo[],
  labelMode: 'code' | 'name' = 'code'
): string {
  return codes
    .map(code => {
      const country = countries.find(item => item.code === code);
      const safeCode = escapeHtml(code);
      const safeName = escapeHtml(country?.name ?? code);
      const visibleLabel = labelMode === 'name' ? safeName : safeCode;
      const flag = country?.flag ?? safeCode;
      return `<span class="amzf_country_badge" title="${safeName}" aria-label="${safeName}">${flag}<span>${visibleLabel}</span></span>`;
    })
    .join('');
}

export function renderEncyclopediaEventCard(
  occ: EventOccurrence,
  countries: readonly CountryInfo[] = AMZF_COUNTRIES as CountryInfo[]
): string {
  const typeClass = `amzf_type_${occ.type}`;
  const typeMeta = getEventTypeMeta(occ.type);
  const countryBadges = renderCountryBadges(occ.countries, countries);
  const dateText = occ.dateLabel || AMZF_COPY['life.pendingDate'];

  return `
            <div class="amzf_event_card ${typeClass}" data-amzf-occurrence="${escapeHtml(occ.occurrenceId)}" data-amzf-template="${escapeHtml(occ.templateId)}">
                <div class="amzf_event_header">
                    <div class="amzf_event_title_wrapper">
                        <span class="amzf_event_emoji" aria-hidden="true">${occ.emoji}</span>
                        <div class="amzf_event_title_stack">
                            <div class="amzf_event_meta_row">
                                <span class="amzf_event_type amzf_event_type_${escapeHtml(occ.type)}"><i class="${typeMeta.icon}"></i>${escapeHtml(typeMeta.label)}</span>
                                <span class="amzf_event_date"><i class="fas fa-calendar-alt"></i> ${escapeHtml(dateText)}</span>
                            </div>
                            <div class="amzf_event_title">${escapeHtml(occ.name)}<span>${escapeHtml(occ.nameEn)}</span></div>
                            <p class="amzf_event_desc">${escapeHtml(occ.description)}</p>
                        </div>
                    </div>
                </div>
                <div class="amzf_event_countries">${countryBadges}</div>
                <div class="amzf_event_strategy">
                    <div class="amzf_strategy_title"><i class="fas fa-lightbulb text-yellow-500"></i> ${escapeHtml(AMZF_COPY['card.strategyTitle'])}</div>
                    <div class="amzf_strategy_content">${escapeHtml(occ.strategy)}</div>
                    <div class="amzf_strategy_tags">
                        ${(occ.tags || []).map(t => `<span class="amzf_tag">#${escapeHtml(t)}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
}

export function renderEncyclopediaCountryRow(
  occ: EventOccurrence,
  countries: readonly CountryInfo[] = AMZF_COUNTRIES as CountryInfo[]
): string {
  const typeMeta = getEventTypeMeta(occ.type);
  const countryBadges = renderCountryBadges(occ.countries, countries, 'name');
  const dateText = occ.dateLabel || AMZF_COPY['life.pendingDate'];

  return `
            <div class="amzf_country_event amzf_type_${escapeHtml(occ.type)}" data-amzf-occurrence="${escapeHtml(occ.occurrenceId)}" data-amzf-template="${escapeHtml(occ.templateId)}">
                <div class="amzf_country_info">
                    ${countryBadges}
                </div>
                <div class="amzf_country_strategy_brief">
                    <div class="amzf_country_event_meta">
                        <span class="amzf_event_type amzf_event_type_${escapeHtml(occ.type)}"><i class="${typeMeta.icon}"></i>${escapeHtml(typeMeta.label)}</span>
                        <span class="amzf_country_date"><i class="fas fa-calendar-alt"></i> ${escapeHtml(dateText)}</span>
                    </div>
                    <div class="amzf_country_event_title">${escapeHtml(occ.name)}<span>${escapeHtml(occ.nameEn)}</span></div>
                    <p>${escapeHtml(occ.description)}</p>
                    <div class="amzf_country_event_strategy"><i class="fas fa-lightbulb text-yellow-500"></i> ${escapeHtml(occ.strategy)}</div>
                </div>
            </div>
        `;
}

export function renderEncyclopediaEmpty(searchTerm = ''): string {
  const term = searchTerm.trim();
  return `
                <div class="amzf_empty amzf_animate">
                    <div class="amzf_empty_icon"><i class="fas fa-search"></i></div>
                    <div class="amzf_empty_text">未找到${term ? ` “${escapeHtml(term)}” ` : ''}匹配的活动</div>
                    <p class="amzf_empty_hint">可尝试国家名/代码、月份、活动类型或品类词，例如“德国”“3月”“电商大促”“玩具”。</p>
                    ${term ? `<button type="button" class="amzf_empty_action" data-action="amzf_clearSearch">${escapeHtml(AMZF_COPY['empty.search.action'])}</button>` : ''}
                </div>
            `;
}

export function renderEncyclopediaMonthView(
  occurrences: EventOccurrence[],
  options: {
    expandedSections?: ReadonlySet<string> | string[];
    searchActive?: boolean;
    months?: readonly string[];
    countries?: readonly CountryInfo[];
  } = {}
): string {
  const months = options.months ?? (AMZF_MONTHS as string[]);
  const countries = options.countries ?? (AMZF_COUNTRIES as CountryInfo[]);
  const searchActive = Boolean(options.searchActive);

  const byMonth: Record<number, EventOccurrence[]> = {};
  for (const occ of occurrences) {
    const m = getOccurrenceMonth(occ);
    const list = byMonth[m] ?? [];
    list.push(occ);
    byMonth[m] = list;
  }

  let html = '<div class="amzf_timeline">';
  for (let m = 1; m <= 12; m++) {
    const monthEvents = byMonth[m];
    if (!monthEvents) continue;
    const sectionId = `amzf_group_month_${m}`;
    const expanded = isExpanded(options.expandedSections, sectionId, searchActive);
    const monthName = months[m - 1] ?? `${m}月`;

    html += `
                <div id="${sectionId}" class="amzf_month_section ${expanded ? 'amzf_expanded' : ''}">
                    <button type="button" class="amzf_month_header" data-amzf-toggle-section="${escapeHtml(sectionId)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(sectionId)}_content">
                        <div class="amzf_month_info">
                            <span class="amzf_month_name">${escapeHtml(monthName)}</span>
                            <span class="amzf_month_badge">${monthEvents.length} 个活动</span>
                        </div>
                        <div class="amzf_month_toggle"><i class="fas fa-chevron-down"></i></div>
                    </button>
                    <div id="${escapeHtml(sectionId)}_content" class="amzf_month_content">
                        <div class="amzf_events_grid">
                            ${monthEvents.map(e => renderEncyclopediaEventCard(e, countries)).join('')}
                        </div>
                    </div>
                </div>
            `;
  }
  html += '</div>';
  return html;
}

export function renderEncyclopediaEventView(
  occurrences: EventOccurrence[],
  options: {
    expandedSections?: ReadonlySet<string> | string[];
    searchActive?: boolean;
    countries?: readonly CountryInfo[];
  } = {}
): string {
  const countries = options.countries ?? (AMZF_COUNTRIES as CountryInfo[]);
  const searchActive = Boolean(options.searchActive);

  interface EventGroup {
    emoji: string;
    events: EventOccurrence[];
    name: string;
    nameEn: string;
  }

  const eventGroups: Record<string, EventGroup> = {};
  for (const occ of occurrences) {
    let groupKey = occ.nameEn
      .replace(
        /\s+(DE|UK|GB|IT|ES|FR|PL|EU|NL|BE|SE|IE|TR)(\/(DE|UK|GB|IT|ES|FR|PL|EU|NL|BE|SE|IE|TR))*$/i,
        ''
      )
      .trim();
    const group = eventGroups[groupKey] ?? {
      emoji: occ.emoji,
      events: [],
      name: occ.name.replace(/\(.*?\)$/, '').trim(),
      nameEn: groupKey,
    };
    group.events.push(occ);
    eventGroups[groupKey] = group;
  }

  let html = '<div class="amzf_event_view">';
  for (const key of Object.keys(eventGroups)) {
    const group = eventGroups[key];
    if (!group) continue;
    const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
    const sectionId = `amzf_group_event_${safeKey}`;
    const expanded = isExpanded(options.expandedSections, sectionId, searchActive);
    const displayName = `${escapeHtml(group.name)}(${escapeHtml(group.nameEn)})`;

    html += `
                <div id="${sectionId}" class="amzf_event_comparison ${expanded ? 'amzf_expanded' : ''}">
                    <button type="button" class="amzf_comparison_header" data-amzf-toggle-section="${escapeHtml(sectionId)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(sectionId)}_content">
                        <div class="amzf_comparison_title">
                            <span>${group.emoji}</span>
                            <span>${displayName}</span>
                            <span class="amzf_month_badge">${new Set(group.events.flatMap(e => e.countries)).size} 个站点</span>
                        </div>
                        <div class="amzf_month_toggle"><i class="fas fa-chevron-down"></i></div>
                    </button>
                    <div id="${escapeHtml(sectionId)}_content" class="amzf_comparison_content">
                        <div class="amzf_country_list">
                            ${group.events.map(e => renderEncyclopediaCountryRow(e, countries)).join('')}
                        </div>
                    </div>
                </div>
            `;
  }
  html += '</div>';
  return html;
}

/**
 * Full encyclopedia list HTML (month or event view, or empty).
 */
export function renderEncyclopedia(input: RenderEncyclopediaInput): string {
  if (input.occurrences.length === 0) {
    return renderEncyclopediaEmpty(input.searchTerm ?? '');
  }

  const searchActive = Boolean(input.searchTerm && input.searchTerm.trim().length > 0);
  const countries = input.countries ?? (AMZF_COUNTRIES as CountryInfo[]);

  if (input.view === 'event') {
    return renderEncyclopediaEventView(input.occurrences, {
      expandedSections: input.expandedSections,
      searchActive,
      countries,
    });
  }

  return renderEncyclopediaMonthView(input.occurrences, {
    expandedSections: input.expandedSections,
    searchActive,
    months: input.months ?? (AMZF_MONTHS as string[]),
    countries,
  });
}
