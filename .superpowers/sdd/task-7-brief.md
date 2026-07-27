# Task 7 Brief

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

### Task 7: Unit/integration green + E2E dual-button pins + manual matrix

**Files:**
- Modify: `tests/e2e/deep-chat-send.spec.ts`
- Possibly mock vision model in e2e helpers if required

**Interfaces:**
- Consumes: shadow `#upload-images-button`, send `.input-button.inside-end:not(#upload-images-button)`
- Produces: Playwright assertions for spacing when vision enabled

- [ ] **Step 1: Run full deep-chat unit suite**

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat
npm run type-check
npm run lint:warning-gate
```

Expected: PASS. Fix any fallout from remote URL test flips or config shape.

- [ ] **Step 2: Extend e2e helper**

```ts
async function getDualButtonGeometry(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('#deep-chat-view')?.shadowRoot;
    const send = root?.querySelector<HTMLElement>(
      '.input-button.inside-end:not(#upload-images-button)'
    );
    const upload = root?.querySelector<HTMLElement>('#upload-images-button');
    if (!send) return null;
    const s = send.getBoundingClientRect();
    const u = upload && getComputedStyle(upload).display !== 'none'
      ? upload.getBoundingClientRect()
      : null;
    return {
      sendRightGap: /* existing pin math */,
      uploadVisible: Boolean(u && u.width > 0),
      gap: u ? s.left - u.right : null,
      bottomDelta: u ? Math.abs(s.bottom - u.bottom) : null,
      uploadBg: upload ? getComputedStyle(upload).backgroundColor : null,
      sendBg: getComputedStyle(send).backgroundColor,
    };
  });
}
```

When a vision-capable model can be selected in e2e fixtures:

```ts
test('keeps vision upload secondary and spaced from send', async ({ page }) => {
  // seed + open + select vision model if fixture supports
  await expect.poll(async () => {
    const g = await getDualButtonGeometry(page);
    return (
      g &&
      g.uploadVisible &&
      g.gap !== null &&
      Math.abs((g.gap as number) - 8) <= 2 &&
      (g.bottomDelta as number) <= 2 &&
      g.uploadBg !== g.sendBg
    );
  }).toBe(true);
});
```

If e2e cannot select vision models reliably, keep send pin tests mandatory and mark dual-button as **manual E1/V1** in matrix — do not skip send regression tests.

- [ ] **Step 3: Run send e2e**

```powershell
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1
```

Expected: existing pin tests PASS; new test PASS or skipped with documented reason.

- [ ] **Step 4: Document manual E2E matrix in PR / commit message body**

Copy checklist from formal spec §9.6 (E1–E13).

- [ ] **Step 5: Commit**

```powershell
git add tests/e2e/deep-chat-send.spec.ts
git commit -m "test(deep-chat): pin vision upload spacing and keep send geometry green"
```

---
