# Card UI Debt Reduction Plan

Status: active
Scope: PC card visual design and implementation
Baseline page: Amazon Hub overview (`#/amz_hub_overview`)

## Goal

Reduce card visual debt in small, verified steps. The target is not one universal card shape for every surface. The target is a clear taxonomy, a shared interaction language for same-purpose cards, and automated checks that prevent the same debt from returning.

## Card Taxonomy

### 1. Overview navigation cards

Purpose: route users to another module or workflow.

Examples:

- `.sop-card.overview-accent-card` on SOPs, More, and Amazon Hub overview pages.
- `.overview-card.overview-accent-card` emitted by `OverviewRenderer`.
- `.app-flow-step.app-child-link` and `.app-overview-card` on App Center overview.

PC standard:

- Default state has a complete 1px card border.
- Default state does not show a colored left rail.
- Hover/focus state shows a rounded colored left rail, matching border color, and a subtle same-family background.
- Border radius is 16px.
- Hover/focus does not move the card or change layout bounds.
- State transition duration stays in the 150-300ms range.

### 2. Workbench panels

Purpose: dense inputs, upload areas, result panels, settings, preview panes.

Examples:

- `.kt-input-card`, `.kt-surface-card`.
- Scraper `.card-elevated`, `.history-card`, `.plugin-card`, `.strategy-card`, `.task-card`.
- PromptLab and AI Analysis panels.

PC standard:

- 8px radius is acceptable because these surfaces are dense tools.
- Hover should be restrained: border or shadow only unless the panel is directly clickable.
- No decorative rail unless the panel is a navigation card.

### 3. Content cards and callouts

Purpose: explain content, risk, rule, comparison, calendar event, or example case.

Examples:

- Amazon detail pages: `.amz_card-hover`, `.amzpa_*`, `.amzpt_*`, `.amzf_event_card`.
- More business scenario pages: `.zn-card`, `.zn-notice-card`.
- Prompt library: `.prompt-card`, `.prompt-source-card`.
- Static Tailwind callouts using `border-l-4`.

PC standard:

- Do not force the overview navigation hover rail onto these cards.
- Use a separate callout standard before migrating visible `border-l-4` content blocks.
- If a content card is clickable, hover may use border/shadow/background, but should not introduce layout movement.

## Tightening Plan

### Phase 1: Lock the overview card baseline

Files:

- `src/css/components/cards.css`
- `src/modules/amz_hub/amz_hub_style.css`
- `src/modules/app_center/app_center_style.css`
- `src/modules/more/more_style.css`
- `src/modules/sops/sops_style.css`
- `scripts/quality/audit-card-ui.ts`

Acceptance:

- `npm run card-ui:audit`
  - Checks every visible card in the configured PC overview selectors, not just the first card.
- `npm run type-check`
- `git diff --check -- src/css/components/cards.css src/modules/amz_hub/amz_hub_style.css src/modules/app_center/app_center_style.css src/modules/more/more_style.css src/modules/sops/sops_style.css scripts/quality/audit-card-ui.ts docs/CARD_UI_DEBT_REDUCTION_PLAN.md package.json`

### Phase 2: Replace duplicated overview hover implementations

Target:

- Move repeated rail/border/background logic into shared CSS variables and a single reusable class contract.
- Use explicit `overview-accent-card` and `overview-accent-*` classes instead of Tailwind `border-l-4` as the card semantic.

Acceptance:

- No raw `border-l-4` or page-specific `border-left` hover rules for overview navigation cards.
- `npm run card-ui:audit` remains green.

Current progress:

- Shared `--overview-card-*` variables and hover/focus rail behavior now live in `src/css/components/cards.css`.
- Amazon Hub and App Center overview pages now provide card-specific color variables instead of duplicating rail/border/background hover rules.
- SOPs and More PC overrides only protect the overview card radius from dense-panel 8px rules.
- Amazon Hub overview is the confirmed PC visual baseline; SOP, More, and `OverviewRenderer` overview cards now use explicit `overview-accent-*` classes.
- Hover/focus rails are drawn by rounded `::before` elements instead of square inset shadows, so the rail aligns with the 16px card radius.
- Overview navigation card sources have zero raw `border-l-4` usage. Keyword Hunter status list items now use `keyword-status-item` classes. PPC phase markers now use `sop-phase-marker` classes. Brand Infringement headings now use `brand-risk-heading` classes. The remaining project-wide `border-l-4` usage is an AI Analysis tooltip triangle.

### Phase 3: Define a callout card standard

Target:

- Separate static `border-l-4` content blocks from navigation cards.
- Introduce a documented callout class for risk/info/success/warning blocks.
- Migrate the highest repetition templates first: SOP service/safety pages and Amazon advanced/practice pages.

Acceptance:

- Static content callouts no longer depend on raw Tailwind `border-l-4` combinations in newly touched files.
- Navigation-card audit remains separate from callout review.

Current progress:

- Shared `.content-callout` classes now live in `src/css/components/cards.css`.
- Callouts use a default visible 4px inset semantic rail, complete 1px border, 8px radius, and no hover movement.
- `src/modules/amz_hub/views/advanced/new_product_30days/template.html`, `src/modules/amz_hub/views/advanced/conversion_optimization/template.html`, `src/modules/amz_hub/views/practice/quality_listing/template.html`, `src/modules/amz_hub/views/knowledge/ecosystem/template.html`, `src/modules/sops/views/growth/listing_seo/template.html`, `src/modules/sops/views/growth/npi_tracker/template.html`, `src/modules/sops/views/growth/promotion_submission/template.html`, `src/modules/sops/views/growth/ppc_advertising/template.html`, `src/modules/sops/views/growth/restricted_words/restrictedWordsHandler.ts`, `src/modules/sops/views/service/negative_review/template.html`, `src/modules/sops/views/service/qa_maintenance/template.html`, `src/modules/sops/views/backend/fba_shipping/template.html`, `src/modules/sops/views/backend/inventory_replenishment/template.html`, `src/modules/sops/views/safety/performance_notification/template.html`, `src/modules/sops/views/safety/account_security/template.html`, and `src/modules/sops/views/safety/brand_infringement/template.html` are the migrated high-repetition samples.
- `npm run callout-ui:audit` checks migrated templates have no raw `border-l-4` and validates the rendered PC callout contract.
- `src/modules/sops/views/safety/brand_infringement/template.html` migrated section heading markers to `brand-risk-heading` classes.
- `src/modules/sops/views/growth/ppc_advertising/template.html` migrated phase section markers to `sop-phase-marker` classes.

### Phase 4: Workbench panel normalization

Target:

- Keep dense panels at 8px radius.
- Remove layout-moving hover effects from workbench panels.
- Align shadow, border, and focus rings to shared tokens.

Acceptance:

- Scraper, Keyword Hunter, AI Analysis, PromptLab, and PPC pages use the same panel radius and restrained hover language.
- Tool panels do not inherit overview card rail styles.

### Phase 5: Content card migration

Target:

- Audit `.amz_card-hover`, `.amzpa_*`, `.amzpt_*`, `.amzf_event_card`, `.prompt-card`, `.prompt-source-card`, and `.zn-*`.
- Decide per family whether it is a static content card, clickable content card, or callout.

Acceptance:

- Each family has a documented role and one matching visual standard.
- Remaining intentional deviations are listed in this file or in `docs/VISUAL_DESIGN_GUIDELINES.md`.

## Current Debt Register

| Debt | Risk | Plan |
| --- | --- | --- |
| Card styles are spread across global CSS and module CSS. | Same interaction is implemented differently by page. | Consolidate overview behavior first, then migrate families one at a time. |
| Remaining raw `border-l-4` usages are mixed non-card markers and legacy content patterns. | A broad replacement could damage headings, timelines, or tool-specific UI. | Keep navigation and callout audits separate; migrate only after classification. |
| App Center and SOP PC overrides can accidentally erase shared card behavior. | Later desktop tightening can regress hover rail and radius. | Keep `npm run card-ui:audit` as the gate after PC card changes. |
| Content card families use different hover languages. | Pages feel inconsistent even when individual cards look acceptable. | Phase 5 classifies each family before changing it. |

## Review Rule

Before changing a card family, classify it first:

1. Overview navigation card.
2. Workbench panel.
3. Content card.
4. Callout.

Only category 1 receives the animated left rail by default.
