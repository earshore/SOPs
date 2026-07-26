# Agent visual review notes (evidence-assisted · NOT human Pass)

**Date**: 2026-07-26  
**Build/SHA**: `c966688d`+ (script tip)  
**Base**: `http://127.0.0.1:4173`  
**Inputs**: contract run `XO-AGENT-RUN-REPORT.md` · `results.json` · screenshots `01–12*.png`  
**Honesty**: This is **agent observation + DOM/CSS evidence**. It does **not** close Visual Yellow or theme experience RC.

---

## Overall

| Layer | Status |
| --- | --- |
| Agent-contract XO (re-run with computed evidence) | **PASS with debt** (0 FAIL; DEBT: Deep Chat send-button color probe + X6 settings aesthetics) |
| Human visual / XO sign-off | **Yellow / unsigned** |
| Sample wave | **FREEZE** (unchanged) |

---

## Route-by-route notes

### Home (`01-home.png`)
- **Contract**: panel loads; no route bomb in agent run.
- **Observe**: Home primary CTA path previously migrated to Appearance (`home-primary-action--main`). Under default primary ~`#3b82f6` expected for shell CTA; not an Ownership surface.
- **Human still**: splash/hero narrative “must not force Appearance” (matrix R1-C2).

### Settings Appearance (`02` / `03-minimal.png`)
- **Contract PASS**: theme select + color mode visible; default↔minimal×3 writes `data-appearance` / `data-theme` (never dark-in-theme-slot).
- **Evidence**: under minimal, `--color-primary` / `--color-focus-ring` → **`#334155`** (industrial slate) — matches unit contract for minimal.
- **X6 DEBT**: full settings chrome still may read “legacy blue” in places; agent does not score aesthetics. Leave for human.

### Refresh persistence
- **PASS**: after F5, `data-appearance=minimal` + `data-theme=minimal` held.  
- Note: `localStorage.app-theme` may be JSON-stringified (`"minimal"`); document markers are SSOT for contract.

### Keyword Hunter minimal (`05-kh-minimal.png`) + dark×minimal (`12b`)
- **PASS ownership**: `wb-theme-rose` banner **and** `sidebar-theme-rose` present under minimal.
- **Evidence**: `primaryToken` minimal = `#334155` while rose classes remain → **Layer A did not wipe Layer B classes**.
- `bannerBg: rgba(0,0,0,0)` means gradient/transparent computed background — class presence is the hard contract; human still judges rose gradient “feel”.
- Dark×minimal: `appearance=minimal`, `colorMode=dark`, `.dark`, rose still true → dual-axis coexistence OK.

### PPC (`06-ppc.png`)
- **PASS**: hero class is **`.ppc-search-terms-hero`** (docs historically said `.ppc-hero` — product renamed).
- **Evidence**: brand token **`#10b981`** (emerald) via `--ppc-search-terms-accent` path — ownership green retained under Appearance session.
- **Human still**: emerald/teal narrative vs industrial primary contrast on the page.

### Deep Chat (`07-deep-chat.png`)
- **View PASS**: `#deep-chat-view` mounts.
- **Send control DEBT**: agent could not stably resolve submit control styles (deep-chat **shadow DOM** / late mount). Tokens `--deep-chat-*` not exposed on `documentElement` in this probe.
- **Not FAIL**: no evidence that send was rewritten to blue primary; also no positive RGB proof of terracotta in this run.
- **Human required**: confirm send/accent remains terracotta and is **not** Appearance primary under minimal + default.

### Master Analysis Scraper (`08-scraper.png`)
- **PASS**: `.wb-theme-indigo` and/or `sidebar-theme-indigo` present under minimal session.

### Overviews (`09-*`)
- App Center / SOPs / Hub ready selectors OK.
- **Human**: multi-color overview cards must not collapse to one slate (matrix R2/R8/R9).

### Focus token (`X3`)
- **PASS**: `--color-focus-ring` resolves (minimal → `#334155`); soft mix present.
- **Human**: Tab through header search / settings for visible rings (not only token existence).

### Dark × appearance (`12-dark-minimal.png`)
- **PASS**: minimal + dark coexistence; restore default+light works.

---

## Debt register (from this agent pass)

| ID | Severity | Note | Owner |
| --- | --- | --- | --- |
| **X6** settings self-token aesthetics | Informational / DEBT | May still look legacy blue; not judged by agent | Human XO |
| **Deep Chat send color probe** | DEBT | Shadow DOM submit not sampled; terracotta unproven in agent RGB | Human XO (5 min) |
| **Docs `.ppc-hero` naming** | Docs drift | Live class `.ppc-search-terms-hero` | Optional docs fix later |
| **D6 long-tail blue** | Informational | Intentionally out of scope | Freeze |

---

## What agent can claim vs cannot

| Can claim | Cannot claim |
| --- | --- |
| Document dual-axis API works | Visual Pass / experience RC closed |
| KH/PPC/MA ownership **classes/tokens** survive Appearance | “一眼扫读” comfort |
| minimal primary becomes slate-700 family | Contrast AA on every surface |
| smoke 29 + agent-contract 0 FAIL | Human XO signature |

---

## Recommended human 10-minute close (if full 30 min unavailable)

1. Settings: default→minimal→refresh (confirm slate shell).  
2. KH: rose banner still rose.  
3. PPC: hero still emerald (not gray primary).  
4. Deep Chat: **send button terracotta** under minimal.  
5. Dark + minimal: both axes + KH rose.  
6. Sign template: `PASS` / `PASS with debt` / `FAIL` with your name.

Until step 6: **Visual stays Yellow**.

---

## Artifacts

- Report: `XO-AGENT-RUN-REPORT.md`  
- JSON: `results.json` (includes `evidence` after enhanced run)  
- Screenshots: `01-home.png` … `12b-kh-dark-minimal.png`  
- Runner: `scripts/dev/xo-agent-theme-run.mjs`  
