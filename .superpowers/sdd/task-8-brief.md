# Task 8 Brief

## Global Constraints (from plan)

- Approach **B only** — no deep-chat vendor fork, no scheme C composer rewrite.
- Images only; hide upload when `!supportsVision` (no grey fake button).
- **Never** persist base64 / `data:image` in thread, draft, or localStorage.
- Caps SSOT: `MAX_FILES=4`, `MAX_FILE=5MB`, `MAX_TOTAL=12MB` decoded in `visionAttachments.ts`.
- Accept whitelist only (png/jpeg/webp/gif); **block SVG and bmp**; no bare `image/*`.
- Reject remote `http(s)` image sources in M1.
- Upload: secondary ghost 36px; send remains primary; geometry end **55px** upload / **11px** send desktop; text padding **108** desktop / **100** mobile.
- Helper **outside** card; Chinese microcopy exact strings from formal spec §6.1.
- Dual-primary CSS exclusion mandatory (`:not(#upload-images-button)` or stronger ghost override).
- `alignSubmitButtonLayerToTextInput` targets **submit/stop only**, never first generic inside-end if it is upload.
- `redactSensitiveError` must strip/redact `data:image` URLs.
- `attachmentMeta` M1: `{ count: number }` only (no names/src); display `附 {n} 张图片（原图未保存）`.
- **No** client-side image compression in M1.
- **No** feature flag required; rollback = Pages previous deploy.
- Surgical edits; match existing style; keep ESLint warning gate at 0.
- TDD: failing tests first for pure validation and redaction.

### Task 8: CHANGELOG note

**Files:**
- Modify: `docs/CHANGELOG.md` (Unreleased)

- [ ] **Step 1: Add Unreleased bullet**

```markdown
### Changed
- Deep Chat vision upload: whitelist formats (no SVG), 12MB total cap, ghost upload control, helper limits line, count-only history honesty, safer error redaction.
```

- [ ] **Step 2: Commit**

```powershell
git add docs/CHANGELOG.md
git commit -m "docs: note deep-chat vision upload UX M1 in changelog"
```

---

## Spec coverage self-review

| Spec requirement | Task |
| --- | --- |
| Total 12MB SSOT + tests | 1 |
| SVG + whitelist + no `image/*` | 1, 3 |
| Remote URL reject | 1 |
| Microcopy SSOT errors (incl. remote / payloadLarge / modelSwitch) | 1 |
| handleRequest toast + reject dual channel | 2 (existing + new cases) |
| No base64 persist | 2 |
| attachmentMeta `{ count }` + display | 2 |
| `err.payload_large` best-effort LLM 413 map | 2 (Step 7b) |
| redactSensitiveError data:image | 2 |
| images config + tooltip + padding 108 | 3 |
| Ghost upload + dual-primary exclusion | 4 |
| Geometry 55/11 + mobile 54/10 + skill dock 108/100 | 4 |
| Attachment strip tokens | 4 |
| Helper outside card | 4, 5 |
| Submit-only aligner | 5 |
| Model switch residual toast | 6 |
| Non-vision paste best-effort | 6 |
| Unit/integration/e2e gates | 7 |
| Manual matrix E1–E13 | 7 |
| CHANGELOG | 8 |
| No compress / no feature flag | Global constraints (no task adds them) |

## Placeholder scan

No TBD/TODO left in tasks. Remote policy, meta schema, and dual-channel errors are concrete.

## Type consistency

- `DEEP_CHAT_VISION_MAX_TOTAL_BYTES` / `DEEP_CHAT_VISION_ACCEPTED_FORMATS` / `DEEP_CHAT_VISION_COPY` defined Task 1; consumed Tasks 2–6.
- `DeepChatAttachmentMeta = { count: number }` Task 2; stamped from `visionUserParts.length`.
- `syncDeepChatVisionHelper(chat, supportsVision)` Task 5; called from apply config.
- Aligner exclusion selector shared Task 5 + e2e Task 7.

## Verification (full gate)

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat
npm run type-check
npm run lint:warning-gate
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1
```

Manual: vision model → helper + ghost upload → 4 thumbs → send → refresh shows meta not pixels → switch to non-vision with staged files → one warning → send fail-closed.

## Residual risks (accept for M1)

1. Wire base64 expansion may still 413 at ~16MB — map provider errors when possible; M2 compress.  
2. Non-vision paste may be swallowed by deep-chat when `images=false` — host paste is best-effort.  
3. Attachment strip class names may need one DOM spike for token CSS.  
4. Multi-turn has no pixel memory — meta honesty only.
