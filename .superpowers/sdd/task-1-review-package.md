# Review package Task 1
BASE: ab40abc1a354ad53bae0022aafea2d69de621c66
HEAD: bfe653970e22703aad95879729efc4a0079035f0

## Commits
bfe65397 feat(deep-chat): harden vision attach caps, whitelist, and remote reject


## Stat
 .../deep-chat/request/visionAttachments.test.ts    | 187 +++++++++++++++++++--
 .../deep-chat/request/visionAttachments.ts         | 165 +++++++++++++-----
 2 files changed, 299 insertions(+), 53 deletions(-)


## Diff
```
diff --git a/src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts b/src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
index d0febaba..dd57cf27 100644
--- a/src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
+++ b/src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
@@ -1,14 +1,16 @@
 import { describe, expect, it } from 'vitest';
 import {
+  DEEP_CHAT_VISION_ACCEPTED_FORMATS,
   DEEP_CHAT_VISION_MAX_FILE_BYTES,
   DEEP_CHAT_VISION_MAX_FILES,
+  DEEP_CHAT_VISION_MAX_TOTAL_BYTES,
   resolveDeepChatImagesConfig,
   resolveDeepChatVisionUserParts,
 } from './visionAttachments';
 
 function tinyPngDataUrl(): string {
   // 1x1 transparent PNG
   return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
 }
 
 function oversizedDataUrl(): string {
@@ -16,26 +18,49 @@ function oversizedDataUrl(): string {
   const payload = 'A'.repeat(Math.ceil((DEEP_CHAT_VISION_MAX_FILE_BYTES * 4) / 3) + 64);
   return `data:image/png;base64,${payload}`;
 }
 
 describe('resolveDeepChatImagesConfig', () => {
   it('returns false when vision is unsupported', () => {
     expect(resolveDeepChatImagesConfig(false)).toBe(false);
   });
 
   it('returns image-only upload config when vision is supported', () => {
-    expect(resolveDeepChatImagesConfig(true)).toEqual({
-      files: {
+    const imagesConfig = resolveDeepChatImagesConfig(true);
+    expect(imagesConfig).not.toBe(false);
+    if (imagesConfig !== false) {
+      expect(imagesConfig.files).toEqual({
         maxNumberOfFiles: DEEP_CHAT_VISION_MAX_FILES,
-        acceptedFormats: 'image/*',
-      },
-    });
+        acceptedFormats: DEEP_CHAT_VISION_ACCEPTED_FORMATS,
+      });
+    }
+  });
+});
+
+describe('vision accept whitelist', () => {
+  it('exports exact acceptedFormats without bare image/*', () => {
+    expect(DEEP_CHAT_VISION_ACCEPTED_FORMATS).toBe(
+      'image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif'
+    );
+    expect(DEEP_CHAT_VISION_ACCEPTED_FORMATS.includes('image/*')).toBe(false);
+    const imagesConfig = resolveDeepChatImagesConfig(true);
+    expect(imagesConfig).not.toBe(false);
+    if (imagesConfig !== false) {
+      expect(imagesConfig.files).toEqual({
+        maxNumberOfFiles: 4,
+        acceptedFormats: DEEP_CHAT_VISION_ACCEPTED_FORMATS,
+      });
+      // button.tooltip optional if library types reject it 鈥?constant still exported
+      if (imagesConfig.button?.tooltip) {
+        expect(imagesConfig.button.tooltip).toBe('涓婁紶鍥剧墖');
+      }
+    }
   });
 });
 
 describe('resolveDeepChatVisionUserParts', () => {
   it('returns empty parts without files', async () => {
     const result = await resolveDeepChatVisionUserParts({
       body: { text: 'hello' },
       supportsVision: true,
     });
     expect(result).toEqual({ ok: true, parts: [] });
@@ -123,54 +148,190 @@ describe('resolveDeepChatVisionUserParts', () => {
         ],
       },
       supportsVision: true,
     });
     expect(result.ok).toBe(false);
     if (!result.ok) {
       expect(result.error).toContain('瓒呰繃');
     }
   });
 
-  it('accepts http(s) image urls without size estimation', async () => {
+  it('rejects remote https image src', async () => {
     const result = await resolveDeepChatVisionUserParts({
       body: {
         messages: [
           {
             role: 'user',
             text: 'url',
             files: [{ type: 'image', src: 'https://cdn.example.com/a.png', name: 'a.png' }],
           },
         ],
       },
       supportsVision: true,
     });
-    expect(result).toEqual({
-      ok: true,
-      parts: [{ type: 'input_image', image_url: 'https://cdn.example.com/a.png' }],
-    });
+    expect(result.ok).toBe(false);
+    if (!result.ok) {
+      expect(result.error).toBe('涓嶆敮鎸佺綉缁滃浘鐗囧湴鍧€锛岃涓婁紶鏈湴鍥剧墖鏂囦欢銆?);
+    }
   });
 
   it('only uses files from the latest user message', async () => {
+    const oldSrc = tinyPngDataUrl();
+    const newSrc =
+      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQz0AEYBxVSF+FAP5IAv8X0f1+AAAAAElFTkSuQmCC';
     const result = await resolveDeepChatVisionUserParts({
       body: {
         messages: [
           {
             role: 'user',
             text: 'old',
-            files: [{ type: 'image', src: 'https://cdn.example.com/old.png', name: 'old.png' }],
+            files: [{ type: 'image', src: oldSrc, name: 'old.png' }],
           },
           { role: 'ai', text: 'ok' },
           {
             role: 'user',
             text: 'new',
-            files: [{ type: 'image', src: 'https://cdn.example.com/new.png', name: 'new.png' }],
+            files: [{ type: 'image', src: newSrc, name: 'new.png' }],
           },
         ],
       },
       supportsVision: true,
     });
     expect(result).toEqual({
       ok: true,
-      parts: [{ type: 'input_image', image_url: 'https://cdn.example.com/new.png' }],
+      parts: [{ type: 'input_image', image_url: newSrc }],
+    });
+  });
+});
+
+describe('resolveDeepChatVisionUserParts hardening', () => {
+  it('rejects SVG by mime', async () => {
+    const result = await resolveDeepChatVisionUserParts({
+      body: {
+        messages: [
+          {
+            role: 'user',
+            text: 'x',
+            files: [
+              {
+                type: 'image/svg+xml',
+                src: 'data:image/svg+xml;base64,PHN2Zy8+',
+                name: 'a.svg',
+              },
+            ],
+          },
+        ],
+      },
+      supportsVision: true,
     });
+    expect(result.ok).toBe(false);
+    if (!result.ok) {
+      expect(result.error).toBe('涓嶆敮鎸?SVG 鍥剧墖锛岃鏀圭敤 PNG 鎴?JPEG銆?);
+    }
+  });
+
+  it('rejects SVG by extension even if mime looks png', async () => {
+    const file = new File([new Uint8Array([1, 2, 3])], 'evil.svg', {
+      type: 'image/png',
+    });
+    const result = await resolveDeepChatVisionUserParts({
+      body: { text: 'x', files: [file] },
+      supportsVision: true,
+    });
+    expect(result.ok).toBe(false);
+    if (!result.ok) {
+      expect(result.error).toContain('SVG');
+    }
+  });
+
+  it('rejects bmp', async () => {
+    const file = new File([new Uint8Array([1])], 'a.bmp', { type: 'image/bmp' });
+    const result = await resolveDeepChatVisionUserParts({
+      body: { text: 'x', files: [file] },
+      supportsVision: true,
+    });
+    expect(result.ok).toBe(false);
+    if (!result.ok) {
+      expect(result.error).toBe(
+        '涓嶆敮鎸佺殑鏂囦欢绫诲瀷锛岃浣跨敤 PNG銆丣PEG銆乄ebP 鎴?GIF銆?
+      );
+    }
+  });
+
+  it('rejects remote https image src', async () => {
+    const result = await resolveDeepChatVisionUserParts({
+      body: {
+        messages: [
+          {
+            role: 'user',
+            text: 'url',
+            files: [{ type: 'image', src: 'https://cdn.example.com/a.png', name: 'a.png' }],
+          },
+        ],
+      },
+      supportsVision: true,
+    });
+    expect(result.ok).toBe(false);
+    if (!result.ok) {
+      expect(result.error).toBe('涓嶆敮鎸佺綉缁滃浘鐗囧湴鍧€锛岃涓婁紶鏈湴鍥剧墖鏂囦欢銆?);
+    }
+  });
+
+  it('fails closed when decoded total exceeds 12MB', async () => {
+    // Three ~4.1MB data URLs 鈫?over 12MB total, each under 5MB
+    const per = Math.floor(DEEP_CHAT_VISION_MAX_FILE_BYTES * 0.82);
+    const payload = 'A'.repeat(Math.ceil((per * 4) / 3) + 16);
+    const src = `data:image/png;base64,${payload}`;
+    const files = [0, 1, 2].map(i => ({
+      type: 'image',
+      src,
+      name: `t${i}.png`,
+    }));
+    const result = await resolveDeepChatVisionUserParts({
+      body: { messages: [{ role: 'user', text: 'big', files }] },
+      supportsVision: true,
+    });
+    expect(result.ok).toBe(false);
+    if (!result.ok) {
+      expect(result.error).toBe('鏈疆鍥剧墖鍚堣瓒呰繃 12MB锛岃鍘嬬缉鎴栧噺灏戝紶鏁般€?);
+    }
+    expect(DEEP_CHAT_VISION_MAX_TOTAL_BYTES).toBe(12 * 1024 * 1024);
+  });
+
+  it('keeps non-vision and per-file size messages', async () => {
+    const nonVision = await resolveDeepChatVisionUserParts({
+      body: {
+        messages: [
+          {
+            role: 'user',
+            text: 'see',
+            files: [{ type: 'image', src: tinyPngDataUrl(), name: 'a.png' }],
+          },
+        ],
+      },
+      supportsVision: false,
+    });
+    expect(nonVision.ok).toBe(false);
+    if (!nonVision.ok) {
+      expect(nonVision.error).toBe(
+        '褰撳墠妯″瀷涓嶆敮鎸佸浘鐗囪緭鍏ワ紝璇峰垏鎹㈠埌鏀寔瑙嗚鐨勬ā鍨嬪悗鍐嶈瘯銆?
+      );
+    }
+
+    const oversized = await resolveDeepChatVisionUserParts({
+      body: {
+        messages: [
+          {
+            role: 'user',
+            text: 'big',
+            files: [{ type: 'image', src: oversizedDataUrl(), name: 'big.png' }],
+          },
+        ],
+      },
+      supportsVision: true,
+    });
+    expect(oversized.ok).toBe(false);
+    if (!oversized.ok) {
+      expect(oversized.error).toBe('鍥剧墖銆宐ig.png銆嶈秴杩?5MB 涓婇檺銆?);
+    }
   });
 });
diff --git a/src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts b/src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts
index c4e1a9f3..e89eb510 100644
--- a/src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts
+++ b/src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts
@@ -1,25 +1,59 @@
 /**
  * Deep Chat 鍥剧墖闄勪欢 鈫?visionUserParts銆?  *
  * 浜у搧瑙勫垯锛?  * - 浠呭綋妯″瀷 supportsVision 鏃跺惎鐢紱
  * - vision parts 鍙湇鍔″綋杞姹傦紝绂佹鎶?base64 鍐欒繘 thread / localStorage锛?- * - 鍗曞浘 / 鍗曡疆寮犳暟鏈夌‖涓婇檺锛岃秴闄?fail-closed銆?+ * - 鍗曞浘 / 鍗曡疆寮犳暟 / 鍚堣鏈夌‖涓婇檺锛岃秴闄?fail-closed锛?+ * - 鐧藉悕鍗?mime/鎵╁睍鍚嶏紱鎷掔粷 SVG銆乥mp銆佽繙绋?http(s)銆?  */
 
 export const DEEP_CHAT_VISION_MAX_FILES = 4;
 /** 鍗曞浘涓婇檺锛堝瓧鑺傦級锛?MB */
 export const DEEP_CHAT_VISION_MAX_FILE_BYTES = 5 * 1024 * 1024;
+/** 鏈疆鍚堣涓婇檺锛堝瓧鑺傦級锛?2MB */
+export const DEEP_CHAT_VISION_MAX_TOTAL_BYTES = 12 * 1024 * 1024;
+
+export const DEEP_CHAT_VISION_ACCEPTED_FORMATS =
+  'image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif';
+
 /** 鏃犳鏂囨椂鐨勫崰浣嶆枃鏈紙淇濊瘉 normalize 涓嶄細涓㈠純鏈疆鐢ㄦ埛娑堟伅锛?*/
 export const DEEP_CHAT_VISION_PLACEHOLDER_TEXT = '[鍥剧墖]';
 
+export const DEEP_CHAT_VISION_COPY = {
+  maxCount: (n: number) => `鍗曟鏈€澶氫笂浼?${n} 寮犲浘鐗囷紝璇峰噺灏戝悗閲嶈瘯銆俙,
+  maxFile: (name: string, mb: number) =>
+    `鍥剧墖銆?{name || '鏈懡鍚?}銆嶈秴杩?${mb}MB 涓婇檺銆俙,
+  maxTotal: (mb: number) => `鏈疆鍥剧墖鍚堣瓒呰繃 ${mb}MB锛岃鍘嬬缉鎴栧噺灏戝紶鏁般€俙,
+  type: '涓嶆敮鎸佺殑鏂囦欢绫诲瀷锛岃浣跨敤 PNG銆丣PEG銆乄ebP 鎴?GIF銆?,
+  svg: '涓嶆敮鎸?SVG 鍥剧墖锛岃鏀圭敤 PNG 鎴?JPEG銆?,
+  nonVision: '褰撳墠妯″瀷涓嶆敮鎸佸浘鐗囪緭鍏ワ紝璇峰垏鎹㈠埌鏀寔瑙嗚鐨勬ā鍨嬪悗鍐嶈瘯銆?,
+  remote: '涓嶆敮鎸佺綉缁滃浘鐗囧湴鍧€锛岃涓婁紶鏈湴鍥剧墖鏂囦欢銆?,
+  read: '鍥剧墖璇诲彇澶辫触锛岃閲嶈瘯銆?,
+  /** Gateway / provider payload-too-large (decoded 12MB still expands ~4/3 on wire). */
+  payloadLarge: '鍥剧墖杩囧ぇ鎴栫綉鍏虫嫆缁濓紝璇峰噺灏戝紶鏁版垨鍘嬬缉銆?,
+  helper: '鏈€澶?4 寮?路 鍗曞紶 鈮?5MB 路 鍚堣 鈮?12MB 路 浠呭綋杞彂閫?,
+  uploadTooltip: '涓婁紶鍥剧墖',
+  uploadAria: '涓婁紶鍥剧墖锛屾渶澶氬洓寮?,
+  historyMeta: (n: number) => `闄?${n} 寮犲浘鐗囷紙鍘熷浘鏈繚瀛橈級`,
+  modelSwitch: '宸插垏鎹㈠埌涓嶆敮鎸佸浘鐗囩殑妯″瀷锛屽彂閫佸墠璇风Щ闄ゅ浘鐗囨垨鎹㈠洖瑙嗚妯″瀷銆?,
+} as const;
+
+const ALLOWED_MIME = new Set([
+  'image/png',
+  'image/jpeg',
+  'image/jpg',
+  'image/webp',
+  'image/gif',
+]);
+
 export type DeepChatVisionUserPart = {
   type: 'input_image';
   image_url: string;
 };
 
 export type DeepChatMessageFileLike = {
   src?: string;
   name?: string;
   type?: string;
   ref?: File;
@@ -29,24 +63,33 @@ export type ResolveDeepChatVisionResult =
   | { ok: true; parts: DeepChatVisionUserPart[] }
   | { ok: false; error: string };
 
 type FileCandidate = {
   src?: string;
   file?: File;
   name?: string;
   type?: string;
 };
 
-function isImageMime(type: string | undefined, name?: string): boolean {
-  if (type && type.startsWith('image/')) return true;
-  if (!type && name) {
-    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
+function isSvg(type?: string, name?: string): boolean {
+  if (type && /image\/svg\+xml/i.test(type)) return true;
+  if (name && /\.svg$/i.test(name)) return true;
+  return false;
+}
+
+export function isAllowedVisionImage(type?: string, name?: string): boolean {
+  if (isSvg(type, name)) return false;
+  const mime = (type || '').toLowerCase().trim();
+  if (mime && ALLOWED_MIME.has(mime)) return true;
+  if (name && /\.(png|jpe?g|webp|gif)$/i.test(name)) {
+    // extension ok only if mime empty or also allowed / generic image
+    if (!mime || mime === 'image' || ALLOWED_MIME.has(mime)) return true;
   }
   return false;
 }
 
 function isDataUrlImage(src: string): boolean {
   return /^data:image\//i.test(src);
 }
 
 function isHttpImageUrl(src: string): boolean {
   return /^https?:\/\//i.test(src);
@@ -61,22 +104,25 @@ function estimateDataUrlBytes(dataUrl: string): number {
     // base64 绾?4/3 鑶ㄨ儉
     return Math.floor((payload.length * 3) / 4);
   }
   try {
     return decodeURIComponent(payload).length;
   } catch {
     return payload.length;
   }
 }
 
-function maxSizeError(label: string, maxFileBytes: number): string {
-  return `鍥剧墖銆?{label || '鏈懡鍚?}銆嶈秴杩?${Math.floor(maxFileBytes / (1024 * 1024))}MB 涓婇檺銆俙;
+function estimateCandidateBytes(candidate: FileCandidate): number | null {
+  if (candidate.file) return candidate.file.size;
+  const src = candidate.src?.trim() || '';
+  if (isDataUrlImage(src)) return estimateDataUrlBytes(src);
+  return null; // remote/unknown handled separately
 }
 
 function candidateFromNativeFile(file: File, name?: string, type?: string): FileCandidate {
   return { file, name: name || file.name, type: type || file.type };
 }
 
 function candidateFromMessageFile(item: unknown): FileCandidate | null {
   if (!item || typeof item !== 'object') return null;
   const mf = item as DeepChatMessageFileLike & { file?: File };
   if (mf.ref instanceof File) return candidateFromNativeFile(mf.ref, mf.name, mf.type);
@@ -144,117 +190,156 @@ function collectFileCandidates(body: unknown): FileCandidate[] {
 }
 
 function readFileAsDataUrl(file: File): Promise<string> {
   return new Promise((resolve, reject) => {
     const reader = new FileReader();
     reader.onload = () => {
       if (typeof reader.result === 'string' && reader.result) {
         resolve(reader.result);
         return;
       }
-      reject(new Error('鍥剧墖璇诲彇澶辫触'));
+      reject(new Error(DEEP_CHAT_VISION_COPY.read));
     };
-    reader.onerror = () => reject(new Error('鍥剧墖璇诲彇澶辫触'));
+    reader.onerror = () => reject(new Error(DEEP_CHAT_VISION_COPY.read));
     reader.readAsDataURL(file);
   });
 }
 
-async function partFromNativeFile(
-  file: File,
-  maxFileBytes: number
-): Promise<ResolveDeepChatVisionResult> {
-  if (!isImageMime(file.type, file.name)) {
-    return { ok: false, error: `涓嶆敮鎸佺殑鏂囦欢绫诲瀷锛?{file.name || '鏈煡鏂囦欢'}` };
-  }
-  if (file.size > maxFileBytes) {
-    return { ok: false, error: maxSizeError(file.name, maxFileBytes) };
-  }
+async function partFromNativeFile(file: File): Promise<ResolveDeepChatVisionResult> {
   const dataUrl = await readFileAsDataUrl(file);
   return { ok: true, parts: [{ type: 'input_image', image_url: dataUrl }] };
 }
 
-function partFromSrc(
-  src: string,
-  name: string | undefined,
-  maxFileBytes: number
-): ResolveDeepChatVisionResult {
+function partFromSrc(src: string): ResolveDeepChatVisionResult {
   if (isDataUrlImage(src)) {
-    if (estimateDataUrlBytes(src) > maxFileBytes) {
-      return { ok: false, error: maxSizeError(name || '', maxFileBytes) };
-    }
     return { ok: true, parts: [{ type: 'input_image', image_url: src }] };
   }
-  if (isHttpImageUrl(src)) {
-    return { ok: true, parts: [{ type: 'input_image', image_url: src }] };
-  }
-  return { ok: false, error: `鏃犳硶璇嗗埆鐨勫浘鐗囨潵婧愶細${name || '鏈煡鏂囦欢'}` };
+  return { ok: false, error: DEEP_CHAT_VISION_COPY.remote };
 }
 
 async function partFromFileCandidate(
-  candidate: FileCandidate,
-  maxFileBytes: number
+  candidate: FileCandidate
 ): Promise<ResolveDeepChatVisionResult> {
   if (candidate.file) {
-    return partFromNativeFile(candidate.file, maxFileBytes);
+    return partFromNativeFile(candidate.file);
   }
   const src = candidate.src?.trim() || '';
   if (!src) return { ok: true, parts: [] };
-  return partFromSrc(src, candidate.name, maxFileBytes);
+  return partFromSrc(src);
 }
 
 /**
  * 浠?deep-chat 璇锋眰 body 鎻愬彇 visionUserParts銆?  * - supportsVision=false锛氭湁鍥惧垯鎶ラ敊锛屾棤鍥捐繑鍥炵┖鏁扮粍锛?- * - 浠?image 绫诲瀷锛涜秴寮犳暟 / 瓒呬綋绉?fail-closed銆?+ * - 鐧藉悕鍗?image 绫诲瀷锛涜秴寮犳暟 / 瓒呬綋绉?/ 杩滅▼ URL fail-closed銆?  */
 export async function resolveDeepChatVisionUserParts(args: {
   body: unknown;
   supportsVision: boolean;
   maxFiles?: number;
   maxFileBytes?: number;
+  maxTotalBytes?: number;
 }): Promise<ResolveDeepChatVisionResult> {
   const maxFiles = args.maxFiles ?? DEEP_CHAT_VISION_MAX_FILES;
   const maxFileBytes = args.maxFileBytes ?? DEEP_CHAT_VISION_MAX_FILE_BYTES;
+  const maxTotalBytes = args.maxTotalBytes ?? DEEP_CHAT_VISION_MAX_TOTAL_BYTES;
   const candidates = collectFileCandidates(args.body);
 
   if (candidates.length === 0) {
     return { ok: true, parts: [] };
   }
   if (!args.supportsVision) {
     return {
       ok: false,
-      error: '褰撳墠妯″瀷涓嶆敮鎸佸浘鐗囪緭鍏ワ紝璇峰垏鎹㈠埌鏀寔瑙嗚鐨勬ā鍨嬪悗鍐嶈瘯銆?,
+      error: DEEP_CHAT_VISION_COPY.nonVision,
     };
   }
   if (candidates.length > maxFiles) {
     return {
       ok: false,
-      error: `鍗曟鏈€澶氫笂浼?${maxFiles} 寮犲浘鐗囷紝璇峰噺灏戝悗閲嶈瘯銆俙,
+      error: DEEP_CHAT_VISION_COPY.maxCount(maxFiles),
     };
   }
 
   const parts: DeepChatVisionUserPart[] = [];
+  let totalBytes = 0;
+
   for (const candidate of candidates) {
-    const result = await partFromFileCandidate(candidate, maxFileBytes);
+    if (isSvg(candidate.type, candidate.name)) {
+      return { ok: false, error: DEEP_CHAT_VISION_COPY.svg };
+    }
+    if (candidate.file) {
+      if (isSvg(candidate.file.type, candidate.file.name)) {
+        return { ok: false, error: DEEP_CHAT_VISION_COPY.svg };
+      }
+      if (!isAllowedVisionImage(candidate.file.type, candidate.file.name)) {
+        return { ok: false, error: DEEP_CHAT_VISION_COPY.type };
+      }
+    } else if (candidate.src) {
+      const src = candidate.src.trim();
+      if (isHttpImageUrl(src)) {
+        return { ok: false, error: DEEP_CHAT_VISION_COPY.remote };
+      }
+      if (isDataUrlImage(src)) {
+        const mimeMatch = /^data:(image\/[a-z0-9.+-]+)/i.exec(src);
+        const mime = mimeMatch?.[1];
+        if (isSvg(mime, candidate.name)) {
+          return { ok: false, error: DEEP_CHAT_VISION_COPY.svg };
+        }
+        if (!isAllowedVisionImage(mime, candidate.name)) {
+          return { ok: false, error: DEEP_CHAT_VISION_COPY.type };
+        }
+      }
+    }
+
+    const size = estimateCandidateBytes(candidate);
+    if (size !== null && size > maxFileBytes) {
+      return {
+        ok: false,
+        error: DEEP_CHAT_VISION_COPY.maxFile(
+          candidate.name || '',
+          Math.floor(maxFileBytes / (1024 * 1024))
+        ),
+      };
+    }
+    if (size !== null) {
+      totalBytes += size;
+      if (totalBytes > maxTotalBytes) {
+        return {
+          ok: false,
+          error: DEEP_CHAT_VISION_COPY.maxTotal(
+            Math.floor(maxTotalBytes / (1024 * 1024))
+          ),
+        };
+      }
+    }
+
+    const result = await partFromFileCandidate(candidate);
     if (!result.ok) return result;
     parts.push(...result.parts);
   }
   return { ok: true, parts };
 }
 
 /** 褰撳墠妯″瀷鏄惁搴斿紑鍚?deep-chat 鍥剧墖涓婁紶鍏ュ彛銆?*/
 export function resolveDeepChatImagesConfig(supportsVision: boolean):
   | false
   | {
       files: {
         maxNumberOfFiles: number;
         acceptedFormats: string;
       };
+      button?: {
+        tooltip: string;
+      };
     } {
   if (!supportsVision) return false;
   return {
     files: {
       maxNumberOfFiles: DEEP_CHAT_VISION_MAX_FILES,
-      acceptedFormats: 'image/*',
+      acceptedFormats: DEEP_CHAT_VISION_ACCEPTED_FORMATS,
+    },
+    button: {
+      tooltip: DEEP_CHAT_VISION_COPY.uploadTooltip,
     },
   };
 }

```
