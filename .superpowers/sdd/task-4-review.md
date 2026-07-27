# Task 4 Review — deepChatStyles ghost upload + dual-primary exclusion

**Base:** `eaedfbd6a371dbec0fb4d5db9dc96210d1711c1e`  
**Head:** `d7df779f02a5cc08195aa7e7cc4a5b67e493c447`  
**Verdict:** **Approved**

---

## Spec Compliance

| Constraint / deliverable | Status | Evidence |
|---|---|---|
| Dual-primary CSS exclusion mandatory (`:not(#upload-images-button)`) | **Met** | Every solid/stop/hover/active/disabled paint selector that previously matched bare `.input-button.inside-end` / `.inside-end.input-button` now uses `:not(#upload-images-button)` (solid matrix ~458–515; geometry ~1024–1025; hover/focus/active ~1048–1077; mobile geometry ~1155–1156). |
| Upload secondary ghost 36px | **Met** | `:host(.is-vision-enabled) #upload-images-button` — `width/height: 36px`, surface bg, accent border, no solid shadow (~974–993). |
| Geometry end **55px** upload / **11px** send desktop | **Met** | Upload: `inset-inline-end: max(55px, calc((100% - 768px) / 2 + 55px))`, `inset-block-end: 11px` (~979–980). Send geometry block keeps `max(11px, …)` / `11px` (~1035–1036). |
| Mobile upload **54** / block-end **10** | **Met** | `@media (max-width: 640px)` override (~1166–1168). |
| Text padding **108** desktop / **100** mobile | **Met** | `#text-input` `18px 108px 16px 22px` (~794); mobile `17px 100px 15px 18px` (~1146). Residual 62/60 gone (grep clean). |
| Skill dock 108 / 100 dual-write | **Met** | Desktop min-width 641 dock `10px 108px 0 14px` (~777); mobile dock `10px 100px 0 14px` (~1151–1152). |
| Ghost hit target / hover / focus / pending disable | **Met** | `::after` inset -4px (~995–999); hover/focus soft fill + border (~1001–1010); `:host(.is-pending-generation)` opacity 0.5 + `pointer-events: none` (~1012–1016). |
| Attachment strip token polish | **Met** | `#file-attachment-container` padding/gap/overflow + 44px thumbs (~1090–1104). Matches brief Step 4. |
| Helper style class (inject later Task 5) | **Met** | `.deep-chat-vision-helper` + `:host(.is-vision-enabled)` display block (~1110–1125). Comment correctly notes light-DOM mirror for Task 5. |
| reduced-motion extended | **Met** | `#upload-images-button`, `#file-attachment-container`, `.deep-chat-vision-helper` in prefers-reduced-motion block (~1172–1180). |
| No logic changes; CSS-only surgical | **Met** | Single file `deepChatStyles.ts`, 131+/33−; no TS control-flow/business logic. Commit message matches brief Step 8. |
| Helper outside card DOM | **Out of scope (correct)** | Styles only; host inject is Task 5 (user constraint + brief Step 5 note). |
| Manual visual smoke | **Not run** | Report honest: not executed this session. Not a code-spec miss; residual QA risk only. |
| Type-check | **Claimed PASS** | Report: `npm run type-check` PASS; not re-run in this review. |

Overall: Task 4 Steps 1–6 and 8 are satisfied in `deepChatStyles.ts`. Dual-primary exclusion is systematic; ghost geometry and padding dual-write match formal geometry/padding numbers; helper is style-only as required.

---

## Strengths

1. **Mandatory dual-primary ban applied thoroughly** — Solid accent, disabled gray, stop red, stop hover/active, icon hide/`::before` stop glyph, send geometry, send hover/focus/active, disabled hover, and mobile geometry all exclude `#upload-images-button`. No bare solid `.input-button.inside-end { background: accent }` remains.
2. **Ghost contract matches brief Step 2 almost line-for-line** — 36px circle, surface + border, end 55 / block 11, hit-area `::after`, soft hover, focus ring, pending disable.
3. **Padding dual-write closed on CSS side** — Desktop 108 and mobile 100 for both `#text-input` and skill dock; old 62/60/58 values fully removed from this file (completes Task 3 residual).
4. **Correct scope discipline** — Helper styles present without DOM/logic; light-DOM caveat documented for Task 5; no vendor fork or composer rewrite.
5. **Honest report** — Flags unrun visual smoke, possible attachment DOM class drift, and helper light-DOM mirror—none oversold as verified in browser.

---

## Issues

### Critical

None.

### Important

None blocking approval.

### Minor

1. **Visual smoke (Step 7) not executed**  
   Dual-primary and geometry are correct by static review, but ghost-vs-primary stacking, z-order, and icon contrast were not confirmed in a live vision model session. Recommend a quick manual check when Task 5 wires the host class/helper.

2. **Geometry group still includes bare `.inside-end.submit-button|disabled-button|loading-button`**  
   Matches brief Step 1 template exactly (only the `input-button` arms get `:not(#upload-images-button)`). If deep-chat ever puts those classes on `#upload-images-button`, position/size could fight ghost rules—but ID-level `:host(.is-vision-enabled) #upload-images-button` (spec ~(1,1,0)) beats class-only geometry (~(0,2,0)) for shared properties. Acceptable residual; not a miss vs brief.

3. **Attachment strip class selectors may need DOM spike**  
   `.image-attachment` / `[class*='attachment'] img` are best-effort; brief already allows post-spike adjust. Stable `#file-attachment-container` + `img` cover the common path.

4. **Helper light-DOM visibility depends on Task 5**  
   Shadow auxiliaryStyle rule alone will not style a light-DOM sibling. Report and comment already defer this—do not treat as Task 4 rework.

5. **Type-check / visual QA not re-run in review**  
   Relied on implementer report for type-check; pure CSS string change makes regression risk low.

---

## Task quality

**Approved**

Meets Task 4 scope: ghost secondary upload, dual-primary CSS exclusion mandatory, geometry 55/11 (mobile 54/10), padding 108/100 + skill dock dual-write, attachment strip polish, helper style class without DOM inject, reduced-motion extension, no logic changes. Residual items (smoke, light-DOM helper, attachment class names) are correctly deferred or non-blocking.
