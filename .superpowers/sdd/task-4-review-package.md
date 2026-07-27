# Review package Task 4
BASE: eaedfbd6a371dbec0fb4d5db9dc96210d1711c1e
HEAD: d7df779f02a5cc08195aa7e7cc4a5b67e493c447
## Commits
d7df779f style(deep-chat): ghost vision upload button and dual-primary CSS exclusion

## Stat
 .../playground/deep-chat/infra/deepChatStyles.ts   | 164 ++++++++++++++++-----
 1 file changed, 131 insertions(+), 33 deletions(-)

## Diff
```ndiff --git a/src/modules/app_center/views/playground/deep-chat/infra/deepChatStyles.ts b/src/modules/app_center/views/playground/deep-chat/infra/deepChatStyles.ts
index 67f069d3..f0f95e30 100644
--- a/src/modules/app_center/views/playground/deep-chat/infra/deepChatStyles.ts
+++ b/src/modules/app_center/views/playground/deep-chat/infra/deepChatStyles.ts
@@ -451,69 +451,70 @@ export const DEEP_CHAT_AUXILIARY_STYLE = `
    * - disabled-button锛氱┖杈撳叆锛岀伆搴曚笉鍙偣
    * - submit-button / 榛樿锛氬彲鍙戦€侊紝鏃楄鑹?    * - loading-button 鎴?[data-deep-chat-stop-active]锛氱敓鎴愪腑锛岀孩搴曟柟鍧楀仠姝?    * deep-chat 鍦?stream onOpen 鍚庝細鍘绘帀 loading-button锛屽彧鍓?input-button + stop 鍥炬爣锛?    * 鍥犳棰滆壊/鍥炬爣蹇呴』浠?data-deep-chat-stop-active 涓哄噯锛屼笉鑳藉彧渚濊禆 loading-button銆?+   * Dual-primary ban: exclude #upload-images-button from all solid/stop paint rules.
    */
-  .input-button.inside-end {
+  .input-button.inside-end:not(#upload-images-button) {
     background: var(--deep-chat-accent, #a85f3f) !important;
     box-shadow: 0 2px 8px rgba(var(--deep-chat-accent-rgb, 168, 95, 63), 0.28) !important;
     cursor: pointer !important;
     opacity: 1 !important;
     transition: background 150ms cubic-bezier(0, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0, 0, 0.2, 1) !important;
   }
 
-  .input-button.inside-end.disabled-button {
+  .input-button.inside-end:not(#upload-images-button).disabled-button {
     background: var(--deep-chat-ink-faint, #94a3b8) !important;
     opacity: 0.82 !important;
     box-shadow: none !important;
     cursor: not-allowed !important;
   }
 
-  .input-button.inside-end.loading-button:not([data-deep-chat-stop-active]) {
+  .input-button.inside-end:not(#upload-images-button).loading-button:not([data-deep-chat-stop-active]) {
     background: var(--deep-chat-accent, #a85f3f) !important;
     cursor: progress !important;
     opacity: 0.84 !important;
   }
 
-  .input-button.inside-end.loading-button[data-deep-chat-stop-active],
-  .input-button.inside-end[data-deep-chat-stop-active] {
+  .input-button.inside-end:not(#upload-images-button).loading-button[data-deep-chat-stop-active],
+  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active] {
     background: #dc2626 !important;
     cursor: pointer !important;
     opacity: 1 !important;
   }
 
-  .input-button.inside-end.loading-button[data-deep-chat-stop-active]:hover,
-  .input-button.inside-end.loading-button[data-deep-chat-stop-active]:focus-visible,
-  .input-button.inside-end[data-deep-chat-stop-active]:hover,
-  .input-button.inside-end[data-deep-chat-stop-active]:focus-visible {
+  .input-button.inside-end:not(#upload-images-button).loading-button[data-deep-chat-stop-active]:hover,
+  .input-button.inside-end:not(#upload-images-button).loading-button[data-deep-chat-stop-active]:focus-visible,
+  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active]:hover,
+  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active]:focus-visible {
     background: #b91c1c !important;
   }
 
-  .input-button.inside-end[data-deep-chat-stop-active]:focus-visible {
+  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active]:focus-visible {
     outline: 2px solid rgba(220, 38, 38, 0.75) !important;
     outline-offset: 2px !important;
   }
 
-  .input-button.inside-end[data-deep-chat-stop-active]:active {
+  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active]:active {
     background: #991b1b !important;
   }
 
   /* 璇锋眰棰勬淇濈暀鍘熺敓 loading 鎸囩ず锛涗粎鍙腑姝㈢殑鐢熸垚鎬佹敼鐢ㄧ櫧鑹叉柟鍧楀仠姝㈡爣銆?*/
-  .input-button.inside-end.loading-button:not([data-deep-chat-stop-active]) #submit-icon,
-  .input-button.inside-end.loading-button:not([data-deep-chat-stop-active]) #stop-icon,
-  .input-button.inside-end.loading-button[data-deep-chat-stop-active] #submit-icon,
-  .input-button.inside-end.loading-button[data-deep-chat-stop-active] .loading-submit-button,
-  .input-button.inside-end.loading-button[data-deep-chat-stop-active] #stop-icon,
-  .input-button.inside-end[data-deep-chat-stop-active] #submit-icon,
-  .input-button.inside-end[data-deep-chat-stop-active] .loading-submit-button,
-  .input-button.inside-end[data-deep-chat-stop-active] #stop-icon {
+  .input-button.inside-end:not(#upload-images-button).loading-button:not([data-deep-chat-stop-active]) #submit-icon,
+  .input-button.inside-end:not(#upload-images-button).loading-button:not([data-deep-chat-stop-active]) #stop-icon,
+  .input-button.inside-end:not(#upload-images-button).loading-button[data-deep-chat-stop-active] #submit-icon,
+  .input-button.inside-end:not(#upload-images-button).loading-button[data-deep-chat-stop-active] .loading-submit-button,
+  .input-button.inside-end:not(#upload-images-button).loading-button[data-deep-chat-stop-active] #stop-icon,
+  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active] #submit-icon,
+  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active] .loading-submit-button,
+  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active] #stop-icon {
     display: none !important;
   }
 
-  .input-button.inside-end.loading-button[data-deep-chat-stop-active]::before,
-  .input-button.inside-end[data-deep-chat-stop-active]::before {
+  .input-button.inside-end:not(#upload-images-button).loading-button[data-deep-chat-stop-active]::before,
+  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active]::before {
     content: '' !important;
     width: 12px !important;
     height: 12px !important;
     display: block !important;
     border-radius: 3px !important;
@@ -771,11 +772,11 @@ export const DEEP_CHAT_AUXILIARY_STYLE = `
       flex: 0 0 auto !important;
       flex-wrap: wrap !important;
       align-items: center !important;
       gap: 0.28rem !important;
       min-width: 0 !important;
-      padding: 10px 58px 0 14px !important;
+      padding: 10px 108px 0 14px !important;
     }
 
     #text-input-container.has-session-skill-chip-dock > #text-input {
       width: 100% !important;
       padding-top: 8px !important;
@@ -788,11 +789,11 @@ export const DEEP_CHAT_AUXILIARY_STYLE = `
     min-width: 0 !important;
     max-width: 100% !important;
     min-height: 24px !important;
     /* 鐩稿瀹瑰櫒 max-height 鐣欏嚭涓婁笅 padding锛岄伩鍏嶉暱鏂囪瑁佸垏涓旀棤娉曟粴鍔?*/
     max-height: min(calc(42vh - 20px), 400px) !important;
-    padding: 18px 62px 16px 22px !important;
+    padding: 18px 108px 16px 22px !important;
     color: var(--deep-chat-ink, #0f172a) !important;
     font-size: 15px !important;
     line-height: 1.55 !important;
     overflow-x: hidden !important;
     overflow-y: auto !important;
@@ -964,20 +965,66 @@ export const DEEP_CHAT_AUXILIARY_STYLE = `
   :host(:not(.is-vision-enabled)) #file-input,
   :host(:not(.is-vision-enabled)) #dropup-menu {
     display: none !important;
   }
 
+  /*
+   * Vision upload: secondary ghost 36px, left of send (end 55px desktop / 54 mobile).
+   * Must not inherit solid accent/stop paint from .inside-end send rules.
+   */
   :host(.is-vision-enabled) #upload-images-button {
     display: flex !important;
+    position: absolute !important;
+    width: 36px !important;
+    height: 36px !important;
+    inset-inline-end: max(55px, calc((100% - 768px) / 2 + 55px)) !important;
+    inset-block-end: 11px !important;
+    inset-block-start: auto !important;
+    margin: 0 !important;
+    transform: none !important;
+    border-radius: 50% !important;
+    border: 1px solid var(--deep-chat-accent-border, rgba(168, 95, 63, 0.35)) !important;
+    background: var(--deep-chat-surface, #ffffff) !important;
+    box-shadow: none !important;
+    align-items: center !important;
+    justify-content: center !important;
+    cursor: pointer !important;
+    opacity: 1 !important;
+    transition: background 150ms cubic-bezier(0, 0, 0.2, 1), border-color 150ms cubic-bezier(0, 0, 0.2, 1) !important;
+  }
+
+  :host(.is-vision-enabled) #upload-images-button::after {
+    content: '' !important;
+    position: absolute !important;
+    inset: -4px !important; /* ~44 hit target */
+  }
+
+  :host(.is-vision-enabled) #upload-images-button:hover,
+  :host(.is-vision-enabled) #upload-images-button:focus-visible {
+    background: var(--deep-chat-accent-soft, #faf3ee) !important;
+    border-color: var(--deep-chat-accent-border-hover, rgba(168, 95, 63, 0.55)) !important;
+  }
+
+  :host(.is-vision-enabled) #upload-images-button:focus-visible {
+    outline: 2px solid rgba(var(--deep-chat-accent-rgb, 168, 95, 63), 0.75) !important;
+    outline-offset: 2px !important;
+  }
+
+  :host(.is-pending-generation) #upload-images-button {
+    opacity: 0.5 !important;
+    pointer-events: none !important;
+    cursor: not-allowed !important;
   }
 
   /*
    * 浣嶇疆涓庡昂瀵革細瑕嗙洊 deep-chat 榛樿 inside-end锛堢害 10%+0.35em 璐村彸涓嬶級銆?    * 閫夋嫨鍣ㄥ繀椤诲寘鍚８ .input-button.inside-end锛歴tream stop 鎬佷細鍘绘帀
    * submit/disabled/loading class锛屽彧鍓?input-button + inside-end銆?+   * Dual-primary ban: exclude #upload-images-button (ghost geometry above).
    */
-  .inside-end.input-button,
+  .input-button.inside-end:not(#upload-images-button),
+  .inside-end.input-button:not(#upload-images-button),
   .inside-end.submit-button,
   .inside-end.disabled-button,
   .inside-end.loading-button {
     width: 36px !important;
     height: 36px !important;
@@ -996,14 +1043,14 @@ export const DEEP_CHAT_AUXILIARY_STYLE = `
     border-radius: 50% !important;
     box-shadow: none !important;
   }
 
   /* 鍙彂閫侊細鏃楄鑹?hover锛涚鐢?鐢熸垚涓笉璧版瑙勫垯 */
-  .inside-end.input-button:not(.disabled-button):not(.loading-button):not(
+  .inside-end.input-button:not(#upload-images-button):not(.disabled-button):not(.loading-button):not(
       [data-deep-chat-stop-active]
     ):hover,
-  .inside-end.input-button:not(.disabled-button):not(.loading-button):not(
+  .inside-end.input-button:not(#upload-images-button):not(.disabled-button):not(.loading-button):not(
       [data-deep-chat-stop-active]
     ):focus-visible,
   .inside-end.submit-button:not(.disabled-button):not(.loading-button):not(
       [data-deep-chat-stop-active]
     ):hover,
@@ -1011,25 +1058,25 @@ export const DEEP_CHAT_AUXILIARY_STYLE = `
       [data-deep-chat-stop-active]
     ):focus-visible {
     background: var(--deep-chat-accent-hover, #8f4f33) !important;
   }
 
-  .inside-end.input-button:not(.disabled-button):not(.loading-button):not(
+  .inside-end.input-button:not(#upload-images-button):not(.disabled-button):not(.loading-button):not(
       [data-deep-chat-stop-active]
     ):focus-visible {
     outline: 2px solid rgba(var(--deep-chat-accent-rgb, 168, 95, 63), 0.75) !important;
     outline-offset: 2px !important;
   }
 
-  .inside-end.input-button:not(.disabled-button):not(.loading-button):not(
+  .inside-end.input-button:not(#upload-images-button):not(.disabled-button):not(.loading-button):not(
       [data-deep-chat-stop-active]
     ):active {
     background: var(--deep-chat-accent-active, #6f3925) !important;
   }
 
-  .inside-end.disabled-button:hover,
-  .inside-end.disabled-button:focus-visible {
+  .inside-end.disabled-button:not(#upload-images-button):hover,
+  .inside-end.disabled-button:not(#upload-images-button):focus-visible {
     background: var(--deep-chat-ink-faint, #94a3b8) !important;
     opacity: 0.82 !important;
     cursor: not-allowed !important;
   }
 
@@ -1037,10 +1084,48 @@ export const DEEP_CHAT_AUXILIARY_STYLE = `
     width: 17px !important;
     height: 17px !important;
     filter: brightness(0) invert(1) !important;
   }
 
+  /* Attachment strip token polish (vision staged previews) */
+  #file-attachment-container {
+    padding: 8px 12px 0 14px !important;
+    gap: 8px !important;
+    overflow-x: auto !important;
+  }
+
+  #file-attachment-container img,
+  #file-attachment-container .image-attachment,
+  #file-attachment-container [class*='attachment'] img {
+    width: 44px !important;
+    height: 44px !important;
+    object-fit: cover !important;
+    border-radius: 8px !important;
+    border: 1px solid var(--deep-chat-hairline, #e2e8f0) !important;
+  }
+
+  /*
+   * Vision helper microcopy. May live in light DOM (Task 5 host inject) or
+   * shadow #input 鈥?keep rule for shadow; shell CSS may mirror for light DOM.
+   */
+  .deep-chat-vision-helper {
+    display: none;
+    box-sizing: border-box;
+    width: min(100%, 768px);
+    margin: 8px auto 0;
+    padding: 0 12px;
+    color: var(--deep-chat-ink-muted, #64748b);
+    font-size: 12px;
+    line-height: 1.4;
+    font-weight: 400;
+    text-align: left;
+  }
+
+  :host(.is-vision-enabled) .deep-chat-vision-helper {
+    display: block;
+  }
+
   @media (max-width: 640px) {
     #messages {
       padding: 18px 16px;
     }
 
@@ -1056,31 +1141,44 @@ export const DEEP_CHAT_AUXILIARY_STYLE = `
       overflow: hidden !important;
     }
 
     #text-input {
       max-height: min(calc(46vh - 18px), 320px) !important;
-      padding: 17px 60px 15px 18px !important;
+      padding: 17px 100px 15px 18px !important;
       font-size: 14px !important;
       overflow-y: auto !important;
     }
 
-    .inside-end.input-button,
+    #text-input-container.has-session-skill-chip-dock > #deep-chat-session-skill-chip-dock {
+      padding: 10px 100px 0 14px !important;
+    }
+
+    .input-button.inside-end:not(#upload-images-button),
+    .inside-end.input-button:not(#upload-images-button),
     .inside-end.submit-button,
     .inside-end.disabled-button,
     .inside-end.loading-button {
       inset-inline-end: 10px !important;
       inset-block-end: 10px !important;
       inset-block-start: auto !important;
       transform: none !important;
     }
+
+    :host(.is-vision-enabled) #upload-images-button {
+      inset-inline-end: 54px !important;
+      inset-block-end: 10px !important;
+    }
   }
 
   @media (prefers-reduced-motion: reduce) {
     .input-button.inside-end,
     .deep-chat-message-tool,
     .deep-chat-context-chip,
-    #text-input-container {
+    #text-input-container,
+    #upload-images-button,
+    #file-attachment-container,
+    .deep-chat-vision-helper {
       transition-duration: 0.01ms !important;
     }
 
     .deep-chat-inline-pending-dot {
       animation: none !important;

```
