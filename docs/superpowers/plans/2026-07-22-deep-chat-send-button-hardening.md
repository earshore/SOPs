# Deep Chat Send Button Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Deep Chat send button correctly positioned and usable across viewport changes and button states.

**Architecture:** Keep Deep Chat's existing geometry algorithm and recompute its inline coordinates after resize layout and the stage-width transition have both settled. Remove the mobile layout constraint at the app-shell boundary, where the global sidebar currently consumes the viewport, and make the existing stop-button visual test wait for its intentional CSS transition to finish.

**Tech Stack:** TypeScript, CSS/Tailwind utility classes, Playwright E2E.

---

### Task 1: Lock the observed regressions into E2E tests

**Files:**
- Modify: `tests/e2e/deep-chat-send.spec.ts`

- [x] **Step 1: Add a viewport-change geometry test**

Add a helper that reads the open Deep Chat shadow root and returns `true` only when the visible 36px `.input-button.inside-end` is fully inside `#text-input-container` with right and bottom gaps of `11px ± 2px`.

```ts
await page.setViewportSize({ width: 1280, height: 720 });
await seedMockProviderStorage(page);
await openDeepChatAndRefreshMockConfig(page);
await expect.poll(() => isSubmitButtonPinnedToTextInput(page)).toBe(true);
await page.setViewportSize({ width: 768, height: 720 });
await expect.poll(() => isSubmitButtonPinnedToTextInput(page)).toBe(true);
await page.setViewportSize({ width: 375, height: 720 });
await expect.poll(() => isSubmitButtonPinnedToTextInput(page)).toBe(true);
await page.setViewportSize({ width: 768, height: 720 });
await expect.poll(() => isSubmitButtonPinnedToTextInput(page)).toBe(true);
```

- [x] **Step 2: Add a phone app-shell width and breakpoint test**

At `375×720`, assert that `#dynamic-sidebar` has zero layout width, `#main-content` is at least `320px`, and the shadow-root `#text-input-container` is at least `260px`; also cover the `767px` / `768px` boundary.

```ts
await expect.poll(async () => {
  const layout = await getMobileComposerLayout(page);
  return layout.sidebarWidth === 0 && layout.mainWidth >= 320 && layout.inputWidth >= 260;
}).toBe(true);
```

- [x] **Step 3: Verify RED**

Run:

```powershell
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1 --grep "keeps the send button pinned"
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1 --grep "keeps the app sidebar out"
```

Expected: both fail before production changes; the first times out after the initial `1280→768` resize, and the second sees the 256px global sidebar consume mobile width.

### Task 2: Recompute inline button geometry for viewport changes

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/controller.ts:714-783`
- Test: `tests/e2e/deep-chat-send.spec.ts`

- [x] **Step 1: Add the missing resize trigger**

Inside `observeSubmitButtonPin`, register a window resize listener that schedules geometry alignment after layout frames settle, then realigns again when `.deep-chat-stage` finishes its width transition.

```ts
const onWindowResize = (): void => {
  resizeAnimationFrame = window.requestAnimationFrame(() => {
    resizeAnimationFrame = window.requestAnimationFrame(() => {
      resizeAnimationFrame = null;
      alignSubmitButtonLayerToTextInput(chat);
    });
  });
};

window.addEventListener('resize', onWindowResize);
```

- [x] **Step 2: Unregister it with the observer lifecycle**

Extend the existing wrapped `submitButtonPinObserver.disconnect` path so unmount/remount cannot leave an old listener, stage transition handler, observer, or animation frame writing coordinates to a detached chat.

```ts
const previousDisconnect = submitButtonPinObserver.disconnect.bind(submitButtonPinObserver);
submitButtonPinObserver.disconnect = () => {
  window.removeEventListener('resize', onWindowResize);
  stage?.removeEventListener('transitionend', onStageWidthTransitionEnd);
  if (resizeAnimationFrame !== null) {
    window.cancelAnimationFrame(resizeAnimationFrame);
  }
  resizeObserver?.disconnect();
  previousDisconnect();
};
```

- [x] **Step 3: Verify GREEN**

Run:

```powershell
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1 --grep "keeps the send button pinned"
```

Expected: pass without typing, reloading, or dispatching an input event after either resize.

### Task 3: Stop the app-shell sidebar from consuming phone width

**Files:**
- Modify: `index.html:334-336`
- Test: `tests/e2e/deep-chat-send.spec.ts`

- [x] **Step 1: Keep the global sidebar out of the flex layout below the medium breakpoint**

Add the existing Tailwind responsive utility to the dynamic sidebar so routing cannot remove the mobile visibility constraint.

```html
class="w-64 max-md:hidden bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 -ml-64 hidden"
```

- [x] **Step 2: Verify GREEN**

Run:

```powershell
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1 --grep "keeps the app sidebar out"
```

Expected: the app sidebar has zero mobile layout width, and the 375px composer meets the asserted width.

### Task 4: Make the stop-state visual test transition-aware

**Files:**
- Modify: `tests/e2e/deep-chat-send.spec.ts:409-445`
- Test: `tests/e2e/deep-chat-send.spec.ts`

- [x] **Step 1: Wait for the final computed stop color**

After the existing stop attribute/ARIA wait and before reading the visual-state object, conditionally poll the computed color rather than sleeping.

```ts
await expect
  .poll(
    () =>
      page.evaluate(() => {
        const button = document
          .querySelector('#deep-chat-view')
          ?.shadowRoot?.querySelector<HTMLElement>(
            '.input-button.inside-end[data-deep-chat-stop-active]'
          );
        return button ? getComputedStyle(button).backgroundColor : null;
      }),
    { timeout: 5000, message: 'stop button should finish its red background transition' }
  )
  .toBe('rgb(220, 38, 38)');
```

- [x] **Step 2: Verify stability**

Run:

```powershell
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1 --grep "turns the send button into a stop button" --repeat-each=10
```

Expected: all repeats pass while preserving the intended 150ms visual transition.

### Task 5: Run the combined quality and visual verification

**Files:**
- Verify: `tests/e2e/deep-chat-send.spec.ts`
- Verify: `src/modules/app_center/views/playground/deep-chat/controller.ts`
- Verify: `index.html`

- [x] **Step 1: Run the focused E2E file**

```powershell
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1
```

Expected: all eight tests pass.

- [x] **Step 2: Run static checks for changed source**

```powershell
npx eslint tests/e2e/deep-chat-send.spec.ts src/modules/app_center/views/playground/deep-chat/controller.ts --max-warnings=0
npm run type-check:tests
npm run type-check
```

Expected: no errors.

- [x] **Step 3: Browser verification**

Use the in-app browser to inspect the empty desktop and phone composer shells; use Playwright for the dynamic `1280→768→375→768` and send/stop state transitions. Reset the temporary viewport override before ending the browser session.
