# Agent-assisted XO run (contract only)

**Date**: 2026-07-26  
**Build/SHA**: `c966688d`  
**Base**: http://127.0.0.1:4173  
**Runner**: Playwright headless agent script `scripts/dev/xo-agent-theme-run.mjs`  
**Honesty**: **NOT human visual Pass.** Pixel aesthetics / long-session comfort / “一眼扫读” **still Yellow** until human XO signs.

### User local re-run (confirmed)

Operator re-ran on the same machine:

```text
PS> node scripts/dev/xo-agent-theme-run.mjs
…
=== OVERALL PASS with debt (agent-contract) ===
```

| Check | Local result |
| --- | --- |
| X0–X5 contract set | **PASS** (home, settings, switch×3, refresh minimal, KH rose, PPC hero, Deep Chat view, MA indigo, overviews, focus token, dark×minimal, restore) |
| X6 settings aesthetics | **DEBT** (unchanged — agent cannot judge) |
| FAIL | **0** |
| Overall | **PASS with debt (agent-contract)** |
| Human visual | **Still unsigned / Yellow** |

This confirms the agent-contract path is **reproducible outside CI**. It still does **not** close theme experience RC.

## Summary

| Metric | Value |
| --- | --- |
| PASS | 16 |
| FAIL | 0 |
| DEBT/SKIP | 2 |
| **Overall (agent-contract)** | **PASS with debt (agent-contract)** |
| **Visual / Human XO** | **Yellow / unsigned** |

## Results

| ID | Status | Note |
| --- | --- | --- |
| X0-home | **PASS** | home reachable |
| X1-settings-open | **PASS** | settings panel open via #nav-more → 全局设置 |
| X1-appearance-controls | **PASS** | theme=true colorMode=true |
| X1-switch-x3 | **PASS** | {"appearance":"minimal","theme":"minimal","colorMode":"light","colorModeResolved":"light","darkClass":false,"appTheme":"\"minimal\"","appColorMode":null} |
| X1-refresh-minimal | **PASS** | {"appearance":"minimal","theme":"minimal","colorMode":"light","colorModeResolved":"light","darkClass":false,"appTheme":"\"minimal\"","appColorMode":null,"storedThemeParsed":"minimal"} |
| X2-kh-rose | **PASS** | {"banner":true,"sidebar":true,"appearance":"minimal","primaryToken":"#334155","bannerBg":"rgba(0, 0, 0, 0)"} |
| X2-ppc-hero | **PASS** | {"found":true,"className":"ppc-search-terms-hero p-5 mb-6","brandToken":"#10b981"} |
| X2-deep-chat | **DEBT** | {"hasView":true,"primaryToken":"#334155","tokens":{},"sendStyle":null,"sendFamily":"unknown","appearance":"minimal"} |
| X2-ma-indigo | **PASS** | {"indigo":true,"sidebar":true} |
| X2-overview-app-center | **PASS** | /#/app-center |
| X2-overview-sops | **PASS** | /#/sops |
| X2-overview-hub | **PASS** | /#/amz-hub |
| X3-focus-token | **PASS** | {"focusRing":"#334155","soft":"color-mix(in srgb, #334155 16%, transparent)"} |
| X5-dark-minimal | **PASS** | {"appearance":"minimal","theme":"minimal","colorMode":"dark","colorModeResolved":"dark","darkClass":true,"appTheme":"\"minimal\"","appColorMode":"\"dark\""} |
| X5-kh-dark-minimal-ownership | **PASS** | {"appearance":"minimal","colorMode":"dark","dark":true,"rose":true} |
| X-restore-default-light | **PASS** | {"appearance":"default","theme":"default","colorMode":"light","colorModeResolved":"light","darkClass":false,"appTheme":"\"default\"","appColorMode":"\"light\""} |
| X6-settings-self-token | **DEBT** | agent cannot judge full-panel old-blue aesthetics; leave for human XO |
| X-console | **PASS** | no severe pageerrors |

## Screenshots

Saved under `docs/superpowers/plans/xo-agent-run/` (`01-home.png` …).

## Follow-up: evidence pass + visual review notes

See **`XO-AGENT-VISUAL-REVIEW.md`** (agent observation, still not human Pass).

Enhanced re-run notes:
- KH under minimal: `primaryToken=#334155` with `wb-theme-rose` + `sidebar-theme-rose` still true
- PPC hero: `.ppc-search-terms-hero` + accent `#10b981`
- Deep Chat: view OK; submit button RGB **unresolved** (shadow DOM) → **DEBT**, not FAIL
- Focus ring under minimal: `#334155`

## Human still required

Agent-contract is green enough to stop sample churn. **Human still needed for:**

1. Eyeball default↔minimal shell contrast (settings + home chrome)  
2. Confirm Deep Chat **send** terracotta **feel** (class/view PASS ≠ brand Pass)  
3. Optional: X6 whether settings panel “old blue” is acceptable debt  
4. Sign `theme-system-xo-signoff-status.md` §3 template: `PASS` / `PASS with debt` / `FAIL` + name  

Only step 4 moves Visual off Yellow.  

## Gate cross-check (same tip)

- Prior phase review: full build green, smoke **29/29** @ 4173  
- Sample wave **FREEZE** remains  
