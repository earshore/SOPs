# Bug Fix Report: Promotion Submission & Master Prompt

## 1. 促销活动提报页面加载失败 (Promotion Submission Load Failure)

**Issue:**
The user reported that the "Promotion Submission" (促销活动提报) page failed to load.
Screen/Console error: `loadTemplate is not defined`.

**Root Cause:**
The file `src/modules/sops/views/growth/promotion_submission/index.js` was missing the import statement for the `loadTemplate` utility function, which is required to load the HTML template.

**Fix Applied:**
Added the missing import statement with the correct relative path to `viewLoader.js`.

```javascript
import { loadTemplate } from "../../../../../common/utils/viewLoader.js";
```

**Verification:**
The module should now successfully fetch and render its template without throwing a ReferenceError.

## 2. Master Prompt 生成按钮无法激活 (Master Prompt Button Not Activating)

**Issue:**
The "Generate Master Prompt" button remained disabled even after the user filled in all required fields (Target Language, Tier 1 Keywords, Tier 2 Keywords).

**Root Cause:**
The event listeners responsible for checking the input state and enabling the button were being attached in the `initPromptlabModule` function which runs on application startup (`DOMContentLoaded`).
However, the "Prompt Lab" view is **lazy loaded**. This means its HTML structure does not exist in the DOM when the application starts.
Consequently, `document.getElementById("panel-promptlab")` returned `null`, and the event listeners (specifically the `change` listener for the language dropdown and `input` listeners for text areas) were never attached.

**Fix Applied:**
Refactored `src/modules/master_prompt/promptlab/promptlabDisplay.js`.
1.  Created a `bindUIEvents()` function that attaches the necessary event listeners.
2.  Moved the execution of this binding logic into the `app:route-changed` event handler.
3.  This ensures that the listeners are attached **only after** the user navigates to the "Prompt Lab" module and the view has been loaded into the DOM.

**Verification:**
When navigating to Prompt Lab, the event listeners will now attach correctly. Changing the "Target Market" or typing in the Keyword fields will trigger `updateButtonState()`, enabling the button when all conditions are met.

## Summary
Both issues have been resolved by correcting missing imports and fixing the timing of event listener binding for lazy-loaded modules.
