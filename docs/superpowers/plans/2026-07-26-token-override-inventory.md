# Token Override Inventory (D1)

Generated: `src/css/foundation/variables.generated.css`
Handwritten: `src/css/foundation/variables.css`
Allowlist: `config/token-atomic-override-allowlist.json`
Date: 2026-07-26

Phase 2 prep (safe first cut). Source of truth for runtime cascade remains:

`main.css` → `variables.generated.css` then `variables.css` (handwritten wins on same name).

## Phase 2 first-cut actions (this PR work)

| Metric | Before | After |
| --- | --- | --- |
| Handwritten `:root` keys | 457 | ~267 |
| Atomic identical (redundant) | 192 | **0** |
| Atomic conflicts (intentional) | 20 | 20 (all allowlisted) |
| All conflicts | 26 | 26 |
| Identical duplicates removed | — | **192** |

**Removed only when 100% value-equal (normalized) and not dark-scoped:**

- Full palette re-declarations (slate/blue/indigo/… 11-step scales)
- Font family / size / weight / leading / tracking identical to generated
- Numeric spacing keys equal to generated (`--spacing-0/1/px`)
- `--rounded-none`, `--rounded-full`, `--shadow-none`, `--z-max`
- Easing identicals: `linear`, `in`, `out`, `in-out`, `bounce`

**Kept (do not auto-remove):** workbench radius px scale (D2), lighter shadows, compact z-index, `--ease-smooth` product curve, all semantic brand/status/surface tokens, white/black alpha, dark mode block.

## Summary (post-cut + allowlist)

| Metric | Count |
| --- | --- |
| Generated `:root` keys | 390 |
| Handwritten `:root` keys | 267 |
| Handwritten dark-mode keys | 76 |
| Same name, **different** value (conflicts) | 26 |
| Same name, **same** value (identical / redundant) | 9 |
| ↳ of which **atomic** identical | 0 |
| ↳ of which **atomic** conflicts | 20 |
| ↳ atomic conflicts **allowlisted** | 20 |
| ↳ atomic conflicts **unallowlisted** | **0** |
| Allowlist entries | 20 |
| Allowlist unused (stale) | 0 |
| Only in handwritten (semantic candidates) | 232 |
| Only in generated | 355 |

## Atomic override allowlist

Intentional atomic same-name overrides are recorded in `config/token-atomic-override-allowlist.json` with a short reason. New atomic conflicts must be allowlisted or removed/aligned — **do not mass-align** product radii/shadows/z-index until consumers migrate to workbench tokens.

| Token | Generated | Handwritten | Category | Reason |
| --- | --- | --- | --- | --- |
| `--ease-smooth` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | `cubic-bezier(0.22, 1, 0.36, 1)` | easing | Product ease-smooth curve (emphasized out); not the generated default ease |
| `--rounded-sm` | `0.125rem` | `4px` | radius | D2 product radius ladder (4px); keep handwritten until migration uses workbench tokens |
| `--rounded-md` | `0.375rem` | `8px` | radius | D2 product radius ladder (8px workbench SSOT peer); keep handwritten until migration uses workbench tokens |
| `--rounded-lg` | `0.5rem` | `12px` | radius | D2 product radius ladder (12px); keep handwritten until migration uses workbench tokens |
| `--rounded-xl` | `0.75rem` | `16px` | radius | D2 product radius ladder (16px); keep handwritten until migration uses workbench tokens |
| `--rounded-2xl` | `1rem` | `24px` | radius | D2 product radius ladder (24px); keep handwritten until migration uses workbench tokens |
| `--rounded-3xl` | `1.5rem` | `32px` | radius | D2 product radius ladder (32px); keep handwritten until migration uses workbench tokens |
| `--shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | `0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)` | shadow | Product elevation: softer multi-layer shadow than generated Tailwind default |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)` | `0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)` | shadow | Product elevation: lighter opacity ladder than generated |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)` | `0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -5px rgba(0, 0, 0, 0.03)` | shadow | Product elevation: softer spread/opacity than generated |
| `--shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)` | `0 20px 40px -10px rgba(0, 0, 0, 0.1)` | shadow | Product elevation: simplified single-layer soft shadow |
| `--shadow-2xl` | `0 25px 50px -12px rgba(0, 0, 0, 0.25)` | `0 25px 50px -12px rgba(0, 0, 0, 0.15)` | shadow | Product elevation: reduced opacity vs generated |
| `--shadow-inner` | `inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)` | `inset 0 2px 4px rgba(0, 0, 0, 0.04)` | shadow | Product inset shadow: slightly softer than generated |
| `--z-dropdown` | `1000` | `30` | z-index | Compact product z-index ladder (not Bootstrap 1000+ scale) |
| `--z-sticky` | `1020` | `35` | z-index | Compact product z-index ladder (not Bootstrap 1000+ scale) |
| `--z-modal-backdrop` | `1040` | `55` | z-index | Compact product z-index ladder (not Bootstrap 1000+ scale) |
| `--z-modal` | `1050` | `60` | z-index | Compact product z-index ladder (not Bootstrap 1000+ scale) |
| `--z-popover` | `1060` | `70` | z-index | Compact product z-index ladder (not Bootstrap 1000+ scale) |
| `--z-toast` | `1080` | `80` | z-index | Compact product z-index ladder (not Bootstrap 1000+ scale) |
| `--z-tooltip` | `1070` | `90` | z-index | Compact product z-index ladder (not Bootstrap 1000+ scale) |

## Unallowlisted atomic conflicts

These atomic overrides are **not** in the allowlist. Either add a reason to the allowlist or resolve by removing the handwritten declaration / migrating consumers.

_None — allowlist covers all current atomic conflicts._

## Atomic identical duplicates (safe-removal candidates)

These match generated after value normalization (whitespace / hex case / rgba spacing). They are palette/scale tokens that handwritten re-declares with the same value — redundant for cascade purposes.

_None found._

## Atomic conflicts (true overrides — do not auto-remove)

All 20 are allowlisted (see table above). Categories: radius (6), shadow (6), z-index (7), easing (1).

## Top conflict examples (all categories)

| Token | Generated | Handwritten | Atomic? | Category |
| --- | --- | --- | --- | --- |
| `--border-light` | `var(--color-slate-100)` | `var(--border-width-thin) solid var(--color-border-light)` | no | semantic-border-focus |
| `--color-accent-light` | `var(--color-indigo-400)` | `rgba(99, 102, 241, 0.1)` | no | semantic-brand |
| `--color-primary-light` | `var(--color-blue-400)` | `rgba(59, 130, 246, 0.1)` | no | semantic-brand |
| `--color-secondary` | `var(--color-slate-500)` | `var(--color-slate-600)` | no | semantic-brand |
| `--color-secondary-dark` | `var(--color-slate-600)` | `var(--color-slate-700)` | no | semantic-brand |
| `--color-secondary-light` | `var(--color-slate-400)` | `rgba(100, 116, 139, 0.1)` | no | semantic-brand |
| `--ease-smooth` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | `cubic-bezier(0.22, 1, 0.36, 1)` | yes | easing |
| `--rounded-2xl` | `1rem` | `24px` | yes | radius |
| `--rounded-3xl` | `1.5rem` | `32px` | yes | radius |
| `--rounded-lg` | `0.5rem` | `12px` | yes | radius |
| `--rounded-md` | `0.375rem` | `8px` | yes | radius |
| `--rounded-sm` | `0.125rem` | `4px` | yes | radius |
| `--rounded-xl` | `0.75rem` | `16px` | yes | radius |
| `--shadow-2xl` | `0 25px 50px -12px rgba(0, 0, 0, 0.25)` | `0 25px 50px -12px rgba(0, 0, 0, 0.15)` | yes | shadow |
| `--shadow-inner` | `inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)` | `inset 0 2px 4px rgba(0, 0, 0, 0.04)` | yes | shadow |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)` | `0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -5px rgba(0, 0, 0, 0.03)` | yes | shadow |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)` | `0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)` | yes | shadow |
| `--shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | `0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)` | yes | shadow |
| `--shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)` | `0 20px 40px -10px rgba(0, 0, 0, 0.1)` | yes | shadow |
| `--z-dropdown` | `1000` | `30` | yes | z-index |
| `--z-modal` | `1050` | `60` | yes | z-index |
| `--z-modal-backdrop` | `1040` | `55` | yes | z-index |
| `--z-popover` | `1060` | `70` | yes | z-index |
| `--z-sticky` | `1020` | `35` | yes | z-index |
| `--z-toast` | `1080` | `80` | yes | z-index |

## Only-in-handwritten samples (semantic / migration)

Semantic / layout / dark-mode tokens stay handwritten. Audit samples ~40 of **232** only-handwritten keys (blur, breakpoints, buttons, cards, surfaces, borders, …).

## Identical non-atomic (document only)

Count: **9** (semantic name collisions that happen to match).

| Token | Value | Category |
| --- | --- | --- |
| `--color-accent` | `var(--color-indigo-500)` | semantic-brand |
| `--color-accent-dark` | `var(--color-indigo-600)` | semantic-brand |
| `--color-error` | `var(--color-red-500)` | semantic-status |
| `--color-info` | `var(--color-blue-500)` | semantic-status |
| `--color-primary` | `var(--color-blue-500)` | semantic-brand |
| `--color-primary-dark` | `var(--color-blue-600)` | semantic-brand |
| `--color-primary-darker` | `var(--color-blue-700)` | semantic-brand |
| `--color-success` | `var(--color-green-500)` | semantic-status |
| `--color-warning` | `var(--color-amber-500)` | semantic-status |

## Recommended next surgical removals

1. **Safe now**: remove atomic identical palette / font-weight / font-size / leading / tracking re-declarations from `variables.css` only when value-equal and not dark-scoped (currently **0**).
2. **Do not auto-remove**: radius, shadow, z-index, easing conflicts — intentional product scale vs generated Tailwind-like scale (D2). Documented in allowlist.
3. **Migrate later**: palette scales missing from handwritten but present in generated (gray/sky/violet/…) already win from generated unless something redefines them.
4. **Semantic keep**: surfaces, status, layout aliases, micro-interaction, dark mode block stay handwritten until Phase 2 split to `variables.semantic.css`.
5. **Gate later**: enable `--fail-on-unallowlisted-atomic` in CI (prefer over full `--fail-on-atomic-override`) once allowlist is the source of intentional exceptions. Default remains off.

## D1 allowlist skim (2026-07-26) — can any of 20 close?

Skim of simplest candidates only. **No allowlist entries removed** (not 100% sure + no consumer/generated alignment done). Gate stays green with all 20 intentional.

**WorkBench peer note:** D2 introduced `--workbench-radius` / `--workbench-radius-lg`. There is **no** `--workbench-shadow` or `--workbench-ease` SSOT. Workbench elevation already prefers handwritten-only semantic tokens (`--shadow-card`, `--shadow-card-hover`, `--shadow-panel`, `--shadow-primary-*`) — those are not atomic conflicts. Atomic `--shadow-*` / `--ease-smooth` remain the product defaults for remaining call sites and any Tailwind theme mapping onto the same names.

| Candidate | Verdict | Why |
| --- | --- | --- |
| `--ease-smooth` | **KEEP** | Product curve `cubic-bezier(0.22, 1, 0.36, 1)` vs generated `cubic-bezier(0.25, 0.1, 0.25, 1)`. ~**510** `var(--ease-smooth)` sites under `src/` (keyframes, micro-interactions, header, cards, modules). Also redeclared in `animations/keyframes.css` `:root` with the product curve — cascade insurance, not a migration. Closing would need either generated/source token change **or** deliberate motion regression accept + keyframes cleanup. No workbench ease peer. |
| `--shadow-2xl`, `--shadow-inner` | **KEEP** (lowest-traffic; still not closable) | Direct `var(--shadow-2xl\|--shadow-inner)` hits in `src/` today: **0**. Values still differ (2xl opacity 0.15 vs 0.25; inner 0.04 vs 0.05). Root + **dark** blocks re-assert the soft ladder. Zero direct `var()` ≠ safe remove: ladder completeness, dark overrides, possible Tailwind `shadow-*` → CSS var path, and sibling sm/md/lg/xl still product-tuned. Close only after explicit product accept of Tailwind defaults **and** dark/light alignment + allowlist/gate update. |
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` / `--shadow-xl` | **KEEP** | Soft multi-layer product elevation vs Tailwind defaults. Live consumers (approx): sm **2**, md **7**, lg **4**, xl **2** (`header*`, `cards`, `toast`, `icon-container`, `stat/insight/progress`, welcome-banner). Fallbacks often hardcode product values. Workbench path uses `--shadow-card*`, not these atoms — does **not** make the atomic overrides redundant. |

### Category-level keep (not skimmed in depth; already D2 / compact scale)

| Category | Tokens | Verdict |
| --- | --- | --- |
| radius | `--rounded-sm` … `--rounded-3xl` (6) | **KEEP** — D2 px ladder until remaining consumers use workbench radius |
| z-index | `--z-dropdown` … `--z-tooltip` (7) | **KEEP** — compact 30–90 ladder vs Bootstrap 1000+; live consumers (dropdown/sticky/modal/toast) |
| easing | `--ease-smooth` (1) | **KEEP** — table above |
| shadow | `--shadow-sm` … `--shadow-inner` (6) | **KEEP** — table above |

### Closable now?

| Bucket | Count | Notes |
| --- | --- | --- |
| **KEEP (all 20)** | 20 | Removable only after value alignment or consumer migration |
| **Candidate to close soon** | **0** | No entry meets “100% sure + consumers updated + gate green” |
| **Future research only** | `shadow-2xl` / `shadow-inner` | Lowest direct `var()` traffic; still blocked by dark ladder + product elevation intent |

**Re-audit 2026-07-26 (D1 skim #2):** still **0 closable**. Re-checked allowlist + live `src/` consumers; no consumer migration / value alignment since first skim. Gate: `npm run token:override-audit:gate` → 20 allowlisted, 0 unallowlisted. Do not remove entries without proof consumers migrated.

## Script

```bash
npm run token:override-audit
npx tsx scripts/quality/audit-token-overrides.ts --markdown
npx tsx scripts/quality/audit-token-overrides.ts --fail-on-unallowlisted-atomic
npx tsx scripts/quality/audit-token-overrides.ts --fail-on-atomic-override
```
