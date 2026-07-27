# Review package Task 3
BASE: b4c8088c91931ca83c80d141254679a0a19e5072
HEAD: eaedfbd6a371dbec0fb4d5db9dc96210d1711c1e
## Commits
eaedfbd6 feat(deep-chat): vision images whitelist config and dual-button text padding

## Stat
 .../app_center/views/playground/deep-chat/infra/deepChatConfig.ts       | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

## Diff
```
diff --git a/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts b/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
index 45e6b131..c0d28ee3 100644
--- a/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
+++ b/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
@@ -123,21 +123,21 @@ function configureDeepChatTextInputStyles(chat: DeepChatElement): void {
         border: '1px solid var(--deep-chat-field-border, #cbd5e1)',
         backgroundColor: 'var(--deep-chat-surface, #ffffff)',
         boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
         minHeight: '58px',
         maxHeight: 'min(42vh, 420px)',
       },
       text: {
         color: 'var(--deep-chat-ink, #0f172a)',
         fontSize: '15px',
         lineHeight: '1.45',
-        padding: '18px 62px 16px 22px',
+        padding: '18px 108px 16px 22px',
         maxHeight: 'min(calc(42vh - 20px), 400px)',
         overflowY: 'auto',
       },
     },
   };
 }
 
 function configureDeepChatSubmitButtonStyles(chat: DeepChatElement): void {
   // 涓?auxiliaryStyle 涓?36px 鍦嗛挳涓€鑷达紝閬垮厤 deep-chat 鍐呰仈 34px 涓?CSS 鎵撴灦闂竴涓?   const buttonSize = '36px';

```
