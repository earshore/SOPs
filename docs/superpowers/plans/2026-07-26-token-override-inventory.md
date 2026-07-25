# Token Override Inventory (D1)

Generated: `src/css/foundation/variables.generated.css`
Handwritten: `src/css/foundation/variables.css`
Date: 2026-07-26

Phase 2 prep (safe first cut). Source of truth for runtime cascade remains:

`main.css` → `variables.generated.css` then `variables.css` (handwritten wins on same name).

## Phase 2 first-cut actions (this PR work)

| Metric | Before | After |
| --- | --- | --- |
| Handwritten `:root` keys | 457 | 265 |
| Atomic identical (redundant) | 192 | **0** |
| Atomic conflicts (intentional) | 20 | 20 |
| All conflicts | 26 | 26 |
| Identical duplicates removed | — | **192** |

**Removed only when 100% value-equal (normalized) and not dark-scoped:**

- Full palette re-declarations (slate/blue/indigo/… 11-step scales)
- Font family / size / weight / leading / tracking identical to generated
- Numeric spacing keys equal to generated (`--spacing-0/1/px`)
- `--rounded-none`, `--rounded-full`, `--shadow-none`, `--z-max`
- Easing identicals: `linear`, `in`, `out`, `in-out`, `bounce`

**Kept (do not auto-remove):** workbench radius px scale (D2), lighter shadows, compact z-index, `--ease-smooth` product curve, all semantic brand/status/surface tokens, white/black alpha, dark mode block.

## Summary (post-cut)

| Metric | Count |
| --- | --- |
| Generated `:root` keys | 390 |
| Handwritten `:root` keys | 265 |
| Handwritten dark-mode keys | 76 |
| Same name, **different** value (conflicts) | 26 |
| Same name, **same** value (identical / redundant) | 9 |
| ↳ of which **atomic** identical | 0 |
| ↳ of which **atomic** conflicts | 20 |
| Only in handwritten (semantic candidates) | 230 |
| Only in generated | 355 |

## Atomic identical duplicates (safe-removal candidates)

These match generated after value normalization (whitespace / hex case / rgba spacing). They are palette/scale tokens that handwritten re-declares with the same value — redundant for cascade purposes.

_None found._

## Atomic conflicts (true overrides — do not auto-remove)

| Token | Generated | Handwritten | Category |
| --- | --- | --- | --- |
| `--ease-smooth` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | `cubic-bezier(0.22, 1, 0.36, 1)` | easing |
| `--rounded-2xl` | `1rem` | `24px` | radius |
| `--rounded-3xl` | `1.5rem` | `32px` | radius |
| `--rounded-lg` | `0.5rem` | `12px` | radius |
| `--rounded-md` | `0.375rem` | `8px` | radius |
| `--rounded-sm` | `0.125rem` | `4px` | radius |
| `--rounded-xl` | `0.75rem` | `16px` | radius |
| `--shadow-2xl` | `0 25px 50px -12px rgba(0, 0, 0, 0.25)` | `0 25px 50px -12px rgba(0, 0, 0, 0.15)` | shadow |
| `--shadow-inner` | `inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)` | `inset 0 2px 4px rgba(0, 0, 0, 0.04)` | shadow |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)` | `0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -5px rgba(0, 0, 0, 0.03)` | shadow |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)` | `0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)` | shadow |
| `--shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | `0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)` | shadow |
| `--shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)` | `0 20px 40px -10px rgba(0, 0, 0, 0.1)` | shadow |
| `--z-dropdown` | `1000` | `30` | z-index |
| `--z-modal` | `1050` | `60` | z-index |
| `--z-modal-backdrop` | `1040` | `55` | z-index |
| `--z-popover` | `1060` | `70` | z-index |
| `--z-sticky` | `1020` | `35` | z-index |
| `--z-toast` | `1080` | `80` | z-index |
| `--z-tooltip` | `1070` | `90` | z-index |

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

| Token | Value | Category |
| --- | --- | --- |
| `--animation-speed-multiplier` | `1` | handwritten-semantic |
| `--animations-enabled` | `1` | handwritten-semantic |
| `--backdrop-blur` | `blur(var(--blur-lg)) saturate(1.8)` | handwritten-semantic |
| `--backdrop-blur-lg` | `blur(var(--blur-xl)) saturate(2)` | handwritten-semantic |
| `--backdrop-blur-sm` | `blur(var(--blur-sm))` | handwritten-semantic |
| `--blur-2xl` | `24px` | handwritten-semantic |
| `--blur-3xl` | `40px` | handwritten-semantic |
| `--blur-lg` | `12px` | handwritten-semantic |
| `--blur-md` | `8px` | handwritten-semantic |
| `--blur-none` | `0` | handwritten-semantic |
| `--blur-sm` | `4px` | handwritten-semantic |
| `--blur-xl` | `16px` | handwritten-semantic |
| `--border-default` | `var(--border-width-thin) solid var(--color-border-default)` | semantic-border-focus |
| `--border-muted` | `rgba(203, 213, 225, 0.72)` | semantic-border-focus |
| `--border-strong` | `var(--border-width-thin) solid var(--color-border-strong)` | semantic-border-focus |
| `--border-subtle` | `rgba(148, 163, 184, 0.24)` | semantic-border-focus |
| `--border-width-default` | `1px` | semantic-border-focus |
| `--border-width-heavy` | `3px` | semantic-border-focus |
| `--border-width-medium` | `1.5px` | semantic-border-focus |
| `--border-width-none` | `0` | semantic-border-focus |
| `--border-width-thick` | `2px` | semantic-border-focus |
| `--border-width-thin` | `1px` | semantic-border-focus |
| `--breakpoint-2xl` | `1536px` | handwritten-semantic |
| `--breakpoint-lg` | `1024px` | handwritten-semantic |
| `--breakpoint-md` | `768px` | handwritten-semantic |
| `--breakpoint-sm` | `640px` | handwritten-semantic |
| `--breakpoint-xl` | `1280px` | handwritten-semantic |
| `--button-primary-active-bg` | `var(--color-primary-darker)` | handwritten-semantic |
| `--button-primary-bg` | `var(--color-primary)` | handwritten-semantic |
| `--button-primary-fg` | `var(--color-primary-contrast)` | handwritten-semantic |
| `--button-primary-hover-bg` | `var(--color-primary-dark)` | handwritten-semantic |
| `--card-bg` | `var(--surface-card)` | handwritten-semantic |
| `--card-border` | `var(--border-subtle)` | handwritten-semantic |
| `--card-radius` | `var(--rounded-card)` | handwritten-semantic |
| `--card-shadow` | `var(--shadow-card)` | handwritten-semantic |
| `--color-bg-active` | `rgba(0, 0, 0, 0.08)` | semantic-surface |
| `--color-bg-backdrop` | `rgba(0, 0, 0, 0.4)` | semantic-surface |
| `--color-bg-disabled` | `var(--color-slate-100)` | semantic-surface |
| `--color-bg-elevated` | `#ffffff` | semantic-surface |
| `--color-bg-hover` | `rgba(0, 0, 0, 0.04)` | semantic-surface |

_…and 190 more only-handwritten keys._

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

1. **Safe now**: remove atomic identical palette / font-weight / font-size / leading / tracking re-declarations from `variables.css` only when value-equal and not dark-scoped (script lists them above).
2. **Do not auto-remove**: radius, shadow, z-index, duration, easing conflicts — intentional product scale vs generated Tailwind-like scale (D2).
3. **Migrate later**: palette scales missing from handwritten but present in generated (gray/sky/violet/…) already win from generated unless something redefines them.
4. **Semantic keep**: surfaces, status, layout aliases, micro-interaction, dark mode block stay handwritten until Phase 2 split to `variables.semantic.css`.
5. **Gate later**: enable `--fail-on-atomic-override` in CI after identical atomics are cleared and intentional conflicts are allowlisted.

## Script

```bash
npm run token:override-audit
npx tsx scripts/quality/audit-token-overrides.ts --markdown
npx tsx scripts/quality/audit-token-overrides.ts --fail-on-atomic-override
```
