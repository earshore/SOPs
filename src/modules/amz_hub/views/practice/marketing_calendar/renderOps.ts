/**
 * Ops workbench HTML renderers (pure strings; caller uses setSafeHtml).
 */

import { escapeHtml } from '@/common/utils/security';
import { AMZF_COPY } from '@/modules/amz_hub/data/marketingCalendar/copy';
import type {
  DateConfidence,
  EventOccurrence,
  EventType,
  OpsEventView,
  PrepPhaseId,
  PrimaryCta,
} from '@/modules/amz_hub/data/marketingCalendar/types';

const PHASE_COPY: Record<PrepPhaseId, keyof typeof AMZF_COPY> = {
  inventory: 'phase.inventory',
  enroll: 'phase.enroll',
  ads: 'phase.ads',
  execute: 'phase.execute',
  review: 'phase.review',
};

const CONFIDENCE_COPY: Record<DateConfidence, keyof typeof AMZF_COPY> = {
  exact: 'confidence.exact',
  computed: 'confidence.computed',
  approximate: 'confidence.approximate',
  pending_official: 'confidence.pending_official',
};

const TYPE_COPY: Record<EventType, keyof typeof AMZF_COPY> = {
  holiday: 'filter.type.holiday',
  shopping: 'filter.type.shopping',
  cultural: 'filter.type.cultural',
  financial: 'filter.type.financial',
  season: 'filter.type.season',
};

export type OpsEmptyKind = 'search' | 'filter' | 'onlyPending' | null;

export interface RenderOpsInput {
  views: OpsEventView[];
  pending: EventOccurrence[];
  searchTerm?: string;
  /** True when types / country / timeWindow differ from defaults enough to warrant filter empty. */
  filtersNarrowed?: boolean;
}

function fillCopy(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([^}]+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}

function confidenceBadge(confidence: DateConfidence): string {
  const label = AMZF_COPY[CONFIDENCE_COPY[confidence]];
  const safeLabel = escapeHtml(label);
  return `<span class="amzf_confidence amzf_confidence_${escapeHtml(confidence)}" title="${escapeHtml(fillCopy(AMZF_COPY['aria.confidence'], { label }))}" aria-label="${escapeHtml(fillCopy(AMZF_COPY['aria.confidence'], { label }))}">${safeLabel}</span>`;
}

function phaseSummary(openPhases: PrepPhaseId[]): string {
  if (openPhases.length === 0) return '';
  const list = openPhases.map(p => AMZF_COPY[PHASE_COPY[p]]).join(' · ');
  const text = fillCopy(AMZF_COPY['phase.openSummary'], { list });
  return `<div class="amzf_open_phases_summary">${escapeHtml(text)}</div>`;
}

function renderCtaButton(cta: PrimaryCta, attr: 'data-amzf-primary-cta' | 'data-amzf-secondary-cta'): string {
  const safeKey = escapeHtml(cta.key);
  const safeLabel = escapeHtml(cta.label);
  const baseClass =
    attr === 'data-amzf-primary-cta' ? 'amzf_primary_cta' : 'amzf_secondary_cta';

  if (cta.kind === 'route' && cta.routeId) {
    return `<button type="button" class="${baseClass}" ${attr}="${safeKey}" data-action="switch-tab" data-tab="${escapeHtml(cta.routeId)}">${safeLabel}</button>`;
  }

  // Scroll target via data attr — never href="#..." (fights Navigo hash router)
  if (cta.kind === 'anchor' && cta.anchorId) {
    return `<button type="button" class="${baseClass}" ${attr}="${safeKey}" data-amzf-scroll-source="${escapeHtml(cta.anchorId)}">${safeLabel}</button>`;
  }

  // local actions (execute / review) — button only; handlers wired later
  return `<button type="button" class="${baseClass}" ${attr}="${safeKey}" data-amzf-local-cta="${safeKey}">${safeLabel}</button>`;
}

function renderPrimaryCtas(ctas: PrimaryCta[]): string {
  const limited = ctas.slice(0, 2);
  if (limited.length === 0) return '';
  return `<div class="amzf_primary_cta_row" role="group" aria-label="${escapeHtml(AMZF_COPY['aria.primaryCta'])}">${limited.map(c => renderCtaButton(c, 'data-amzf-primary-cta')).join('')}</div>`;
}

function renderSecondaryMore(secondary: PrimaryCta[]): string {
  if (secondary.length === 0) return '';
  const items = secondary
    .map(c => renderCtaButton(c, 'data-amzf-secondary-cta'))
    .join('');
  return `<details class="amzf_more_menu"><summary class="amzf_more_summary">${escapeHtml(AMZF_COPY['cta.more'])}</summary><div class="amzf_more_body">${items}</div></details>`;
}

function dateLine(occ: EventOccurrence, lifecycle: OpsEventView['lifecycle']): string {
  if (lifecycle === 'pending' || occ.confidence === 'pending_official' || !occ.startDate) {
    // No fake D-day for pending
    return `<span class="amzf_life_pending"><i class="fas fa-clock"></i> ${escapeHtml(AMZF_COPY['life.pendingDate'])}</span>`;
  }

  const range =
    occ.startDate && occ.endDate && occ.startDate !== occ.endDate
      ? fillCopy(AMZF_COPY['date.range'], { start: occ.startDate, end: occ.endDate })
      : occ.dateLabel || occ.startDate;

  let life = '';
  if (lifecycle === 'active') {
    life = AMZF_COPY['life.active'];
  } else if (lifecycle === 'ended') {
    life = AMZF_COPY['life.ended'];
  }

  const approx =
    occ.confidence === 'approximate' ? `<span class="amzf_approx">${escapeHtml(AMZF_COPY['life.approxPrefix'])}</span> ` : '';

  return `<span class="amzf_event_date"><i class="fas fa-calendar-alt"></i> ${approx}${escapeHtml(range)}${life ? ` · ${escapeHtml(life)}` : ''}</span>`;
}

export function renderOpsCard(view: OpsEventView): string {
  const { occurrence: occ, openPhases, primaryCtas, secondaryCtas, lifecycle } = view;
  const typeLabel = AMZF_COPY[TYPE_COPY[occ.type] ?? 'filter.type.holiday'];
  const openAttr = openPhases.join(',');
  const openAria = openPhases.length
    ? escapeHtml(
        fillCopy(AMZF_COPY['aria.openPhases'], {
          list: openPhases.map(p => AMZF_COPY[PHASE_COPY[p]]).join('、'),
        })
      )
    : '';

  return `
    <article
      class="amzf_ops_card amzf_type_${escapeHtml(occ.type)} amzf_life_${escapeHtml(lifecycle)}"
      data-amzf-occurrence="${escapeHtml(occ.occurrenceId)}"
      data-amzf-template="${escapeHtml(occ.templateId)}"
      data-amzf-open-phases="${escapeHtml(openAttr)}"
      ${openAria ? `aria-description="${openAria}"` : ''}
    >
      <div class="amzf_ops_card_header">
        <span class="amzf_event_emoji" aria-hidden="true">${occ.emoji}</span>
        <div class="amzf_ops_card_title_stack">
          <div class="amzf_ops_meta_row">
            <span class="amzf_event_type amzf_event_type_${escapeHtml(occ.type)}">${escapeHtml(typeLabel)}</span>
            ${confidenceBadge(occ.confidence)}
            ${dateLine(occ, lifecycle)}
          </div>
          <h3 class="amzf_ops_card_title">${escapeHtml(occ.name)}<span class="amzf_ops_card_title_en">${escapeHtml(occ.nameEn)}</span></h3>
        </div>
      </div>
      ${phaseSummary(openPhases)}
      <div class="amzf_event_strategy">
        <div class="amzf_strategy_title"><i class="fas fa-lightbulb text-yellow-500"></i> ${escapeHtml(AMZF_COPY['card.strategyTitle'])}</div>
        <div class="amzf_strategy_content">${escapeHtml(occ.strategy)}</div>
      </div>
      <div class="amzf_ops_cta_block">
        ${renderPrimaryCtas(primaryCtas)}
        ${renderSecondaryMore(secondaryCtas)}
      </div>
    </article>
  `;
}

export function renderOpsEmpty(kind: Exclude<OpsEmptyKind, null>, searchTerm = ''): string {
  if (kind === 'search') {
    return `
      <div class="amzf_empty amzf_animate">
        <div class="amzf_empty_icon"><i class="fas fa-search"></i></div>
        <div class="amzf_empty_text">${escapeHtml(AMZF_COPY['empty.search.title'])}</div>
        <p class="amzf_empty_hint">${escapeHtml(fillCopy(AMZF_COPY['empty.search.body'], { term: searchTerm }))}</p>
        <button type="button" class="amzf_empty_action" data-action="amzf_clearSearch">${escapeHtml(AMZF_COPY['empty.search.action'])}</button>
      </div>
    `;
  }

  if (kind === 'onlyPending') {
    return `
      <div class="amzf_empty amzf_animate">
        <div class="amzf_empty_icon"><i class="fas fa-hourglass-half"></i></div>
        <div class="amzf_empty_text">${escapeHtml(AMZF_COPY['empty.onlyPending.title'])}</div>
        <p class="amzf_empty_hint">${escapeHtml(AMZF_COPY['empty.onlyPending.body'])}</p>
        <button type="button" class="amzf_empty_action" data-action="amzf_scrollPending">${escapeHtml(AMZF_COPY['empty.onlyPending.action'])}</button>
      </div>
    `;
  }

  // filter
  return `
    <div class="amzf_empty amzf_animate">
      <div class="amzf_empty_icon"><i class="fas fa-filter"></i></div>
      <div class="amzf_empty_text">${escapeHtml(AMZF_COPY['empty.filter.title'])}</div>
      <p class="amzf_empty_hint">${escapeHtml(AMZF_COPY['empty.filter.body'])}</p>
      <button type="button" class="amzf_empty_action" data-action="amzf_resetFilters">${escapeHtml(AMZF_COPY['empty.filter.action'])}</button>
    </div>
  `;
}

export function renderPendingSection(pending: EventOccurrence[]): string {
  if (pending.length === 0) return '';

  const cards = pending
    .map(occ => {
      const primary: PrimaryCta = {
        key: 'pendingSource',
        label: AMZF_COPY['cta.pendingSource'],
        kind: 'anchor',
        anchorId: 'amzf_source_panel',
      };
      const sourceLink =
        occ.sources?.[0] != null
          ? `<a class="amzf_secondary_cta" data-amzf-secondary-cta="externalSource" href="${escapeHtml(occ.sources[0].url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(AMZF_COPY['cta.externalSource'])}</a>`
          : '';

      return `
        <article
          class="amzf_ops_card amzf_ops_card_pending amzf_type_${escapeHtml(occ.type)}"
          data-amzf-occurrence="${escapeHtml(occ.occurrenceId)}"
          data-amzf-template="${escapeHtml(occ.templateId)}"
          data-amzf-open-phases=""
        >
          <div class="amzf_ops_card_header">
            <span class="amzf_event_emoji" aria-hidden="true">${occ.emoji}</span>
            <div class="amzf_ops_card_title_stack">
              <div class="amzf_ops_meta_row">
                ${confidenceBadge('pending_official')}
                <span class="amzf_life_pending"><i class="fas fa-clock"></i> ${escapeHtml(AMZF_COPY['life.pendingDate'])}</span>
              </div>
              <h3 class="amzf_ops_card_title">${escapeHtml(occ.name)}<span class="amzf_ops_card_title_en">${escapeHtml(occ.nameEn)}</span></h3>
            </div>
          </div>
          <div class="amzf_event_strategy">
            <div class="amzf_strategy_title"><i class="fas fa-lightbulb text-yellow-500"></i> ${escapeHtml(AMZF_COPY['card.strategyTitle'])}</div>
            <div class="amzf_strategy_content">${escapeHtml(occ.strategy)}</div>
          </div>
          <div class="amzf_ops_cta_block">
            ${renderPrimaryCtas([primary])}
            ${sourceLink ? `<div class="amzf_more_body">${sourceLink}</div>` : ''}
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <div class="amzf_pending_inner">
      <h2 class="amzf_pending_title"><i class="fas fa-bullhorn"></i> ${escapeHtml(AMZF_COPY['pending.sectionTitle'])}</h2>
      <p class="amzf_pending_lead">${escapeHtml(AMZF_COPY['pending.lead'])}</p>
      <div class="amzf_ops_list amzf_pending_list">${cards}</div>
    </div>
  `;
}

/**
 * Resolve empty-state kind for the main ops list.
 */
export function resolveOpsEmptyKind(input: RenderOpsInput): OpsEmptyKind {
  if (input.views.length > 0) return null;
  const term = input.searchTerm?.trim() ?? '';
  if (term) return 'search';
  if (input.pending.length > 0) return 'onlyPending';
  if (input.filtersNarrowed) return 'filter';
  return 'filter';
}

/**
 * Render main ops list HTML (cards or empty). Pending is separate.
 */
export function renderOpsListHtml(input: RenderOpsInput): string {
  const emptyKind = resolveOpsEmptyKind(input);
  if (emptyKind) {
    return renderOpsEmpty(emptyKind, input.searchTerm?.trim() ?? '');
  }

  return `<div class="amzf_ops_list">${input.views.map(renderOpsCard).join('')}</div>`;
}

/**
 * Full ops root content helpers for index wiring.
 */
export function renderOps(input: RenderOpsInput): { listHtml: string; pendingHtml: string } {
  return {
    listHtml: renderOpsListHtml(input),
    pendingHtml: renderPendingSection(input.pending),
  };
}
