/**
 * Host-side vision attachment composer (Approach B production surface).
 *
 * - Always-visible FA image button (disabled + reason when non-vision)
 * - Staged thumbnails with remove; count badge; helper microcopy
 * - deep-chat native #upload-images-button stays off — host owns UX
 * - Files live only in memory (object URLs); never thread/localStorage base64
 */

import type { DeepChatElement } from '../types';
import {
  DEEP_CHAT_VISION_ACCEPTED_FORMATS,
  DEEP_CHAT_VISION_COPY,
  DEEP_CHAT_VISION_MAX_FILE_BYTES,
  DEEP_CHAT_VISION_MAX_FILES,
  DEEP_CHAT_VISION_MAX_TOTAL_BYTES,
  isAllowedVisionImage,
} from '../request/visionAttachments';
import { createSvgIcon } from './skillContextChip';
import { showToast } from '@/common/ui/notifications';

export const VISION_COMPOSER_ROOT_ID = 'deep-chat-vision-composer-root';
export const VISION_STRIP_ID = 'deep-chat-vision-strip';
export const VISION_UPLOAD_BTN_ID = 'deep-chat-vision-upload';
export const VISION_FILE_INPUT_ID = 'deep-chat-vision-file-input';
export const VISION_HELPER_ID = 'deep-chat-vision-helper';
export const VISION_COUNT_ID = 'deep-chat-vision-count';
export const HAS_VISION_COMPOSER_CLASS = 'has-vision-composer';
export const HAS_VISION_STAGED_CLASS = 'has-vision-staged';

export type StagedVisionItem = {
  id: string;
  file: File;
  objectUrl: string;
  name: string;
  size: number;
};

type VisionComposerState = {
  chat: DeepChatElement | null;
  staged: StagedVisionItem[];
  supportsVision: boolean;
  pending: boolean;
  cleanups: Array<() => void>;
};

const state: VisionComposerState = {
  chat: null,
  staged: [],
  supportsVision: false,
  pending: false,
  cleanups: [],
};

let idSeq = 0;
function nextId(): string {
  idSeq += 1;
  return `vision-${Date.now()}-${idSeq}`;
}

export function getStagedVisionFiles(): File[] {
  return state.staged.map(item => item.file);
}

export function getStagedVisionCount(): number {
  return state.staged.length;
}

export function hasStagedVisionAttachments(): boolean {
  return state.staged.length > 0;
}

export function clearStagedVisionAttachments(): void {
  for (const item of state.staged) {
    URL.revokeObjectURL(item.objectUrl);
  }
  state.staged = [];
  renderVisionComposerDom();
}

/** Pure staging validation — used by tests and stageVisionFiles. */
export function validateVisionFileForStaging(
  file: File,
  already: ReadonlyArray<{ name: string; size: number }>
): string | null {
  if (!isAllowedVisionImage(file.type, file.name)) {
    if (/\.svg$/i.test(file.name) || /image\/svg\+xml/i.test(file.type)) {
      return DEEP_CHAT_VISION_COPY.svg;
    }
    return DEEP_CHAT_VISION_COPY.type;
  }
  if (file.size > DEEP_CHAT_VISION_MAX_FILE_BYTES) {
    return DEEP_CHAT_VISION_COPY.maxFile(
      file.name || '未命名',
      Math.floor(DEEP_CHAT_VISION_MAX_FILE_BYTES / (1024 * 1024))
    );
  }
  if (already.length >= DEEP_CHAT_VISION_MAX_FILES) {
    return DEEP_CHAT_VISION_COPY.maxCount(DEEP_CHAT_VISION_MAX_FILES);
  }
  const total = already.reduce((sum, f) => sum + f.size, 0) + file.size;
  if (total > DEEP_CHAT_VISION_MAX_TOTAL_BYTES) {
    return DEEP_CHAT_VISION_COPY.maxTotal(
      Math.floor(DEEP_CHAT_VISION_MAX_TOTAL_BYTES / (1024 * 1024))
    );
  }
  return null;
}

function beginStageVisionFiles(
  files: FileList | File[] | null | undefined
): { list: File[] } | { added: number; error?: string } {
  if (!files || (files as FileList).length === 0) {
    return { added: 0 };
  }
  if (!state.supportsVision) {
    showToast(DEEP_CHAT_VISION_COPY.nonVision, { type: 'warning' });
    return { added: 0, error: DEEP_CHAT_VISION_COPY.nonVision };
  }
  if (state.pending) {
    return { added: 0 };
  }
  return { list: Array.from(files as ArrayLike<File>) };
}

export function stageVisionFiles(files: FileList | File[] | null | undefined): {
  added: number;
  error?: string;
} {
  const started = beginStageVisionFiles(files);
  if (!('list' in started)) {
    return started;
  }

  let added = 0;
  let firstError: string | undefined;
  const working = state.staged.map(s => ({ name: s.name, size: s.size }));

  for (const file of started.list) {
    const error = validateVisionFileForStaging(file, working);
    if (error) {
      firstError ??= error;
      continue;
    }
    const objectUrl = URL.createObjectURL(file);
    const item: StagedVisionItem = {
      id: nextId(),
      file,
      objectUrl,
      name: file.name || '未命名',
      size: file.size,
    };
    state.staged.push(item);
    working.push({ name: item.name, size: item.size });
    added += 1;
  }

  if (firstError) {
    showToast(firstError, { type: 'warning' });
  }
  if (added > 0) {
    renderVisionComposerDom();
  }
  return { added, error: firstError };
}

export function removeStagedVisionItem(id: string): void {
  const idx = state.staged.findIndex(item => item.id === id);
  if (idx < 0) return;
  const [removed] = state.staged.splice(idx, 1);
  if (removed) URL.revokeObjectURL(removed.objectUrl);
  renderVisionComposerDom();
}

export function syncVisionComposerCapability(opts: {
  supportsVision: boolean;
  pending?: boolean;
}): void {
  const wasVision = state.supportsVision;
  state.supportsVision = opts.supportsVision;
  if (typeof opts.pending === 'boolean') {
    state.pending = opts.pending;
  }
  if (wasVision && !state.supportsVision && state.staged.length > 0) {
    showToast(DEEP_CHAT_VISION_COPY.modelSwitch, { type: 'warning' });
  }
  renderVisionComposerDom();
}

export function setVisionComposerPending(pending: boolean): void {
  state.pending = pending;
  renderVisionComposerDom();
}

function ensureRoot(chat: DeepChatElement): {
  input: HTMLElement;
  card: HTMLElement;
  root: HTMLElement;
} | null {
  const shadow = chat.shadowRoot;
  const input = shadow?.querySelector<HTMLElement>('#input');
  const card = shadow?.querySelector<HTMLElement>('#text-input-container');
  if (!shadow || !input || !card) return null;

  let root = shadow.querySelector<HTMLElement>(`#${VISION_COMPOSER_ROOT_ID}`);
  if (!root) {
    root = document.createElement('div');
    root.id = VISION_COMPOSER_ROOT_ID;
    root.className = 'deep-chat-vision-composer-root';
    // 发送框正上方：文字入口 + 缩略图，简单粗暴。
    input.insertBefore(root, card);
  } else if (root.nextElementSibling !== card) {
    input.insertBefore(root, card);
  }
  card.classList.add(HAS_VISION_COMPOSER_CLASS);
  return { input, card, root };
}

function buildUploadButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = VISION_UPLOAD_BTN_ID;
  btn.className = 'deep-chat-vision-upload';
  btn.textContent = '上传图片';
  return btn;
}

function buildFileInput(): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.id = VISION_FILE_INPUT_ID;
  input.className = 'deep-chat-vision-file-input';
  input.accept = DEEP_CHAT_VISION_ACCEPTED_FORMATS;
  input.multiple = true;
  input.hidden = true;
  input.setAttribute('tabindex', '-1');
  return input;
}

function buildStrip(): HTMLElement {
  const strip = document.createElement('div');
  strip.id = VISION_STRIP_ID;
  strip.className = 'deep-chat-vision-strip';
  strip.setAttribute('role', 'list');
  strip.setAttribute('aria-label', '待发送图片');
  strip.hidden = true;
  return strip;
}

function buildHelper(): HTMLElement {
  const helper = document.createElement('span');
  helper.id = VISION_HELPER_ID;
  helper.className = 'deep-chat-vision-helper';
  helper.textContent = DEEP_CHAT_VISION_COPY.helper;
  return helper;
}

function buildCountBadge(): HTMLElement {
  const badge = document.createElement('span');
  badge.id = VISION_COUNT_ID;
  badge.className = 'deep-chat-vision-count';
  badge.hidden = true;
  return badge;
}

function ensureStructure(chat: DeepChatElement): void {
  const parts = ensureRoot(chat);
  if (!parts) return;
  const { root } = parts;

  if (!root.querySelector(`#${VISION_UPLOAD_BTN_ID}`)) {
    const row = document.createElement('div');
    row.className = 'deep-chat-vision-row';
    row.append(buildUploadButton(), buildCountBadge(), buildHelper(), buildFileInput());
    root.appendChild(row);
  }

  if (!root.querySelector(`#${VISION_STRIP_ID}`)) {
    root.appendChild(buildStrip());
  }
}

function renderStrip(strip: HTMLElement): void {
  strip.replaceChildren();
  if (state.staged.length === 0) {
    strip.hidden = true;
    return;
  }
  strip.hidden = false;
  for (const item of state.staged) {
    const thumb = document.createElement('div');
    thumb.className = 'deep-chat-vision-thumb';
    thumb.setAttribute('role', 'listitem');
    thumb.dataset.visionId = item.id;

    const img = document.createElement('img');
    img.src = item.objectUrl;
    img.alt = item.name;
    img.width = 48;
    img.height = 48;
    img.draggable = false;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'deep-chat-vision-thumb__remove';
    remove.setAttribute('aria-label', `移除图片 ${item.name}`);
    remove.title = '移除';
    remove.appendChild(createSvgIcon(['M18 6 6 18M6 6l12 12'], 11, '2.2'));
    remove.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      removeStagedVisionItem(item.id);
    });

    thumb.append(img, remove);
    strip.appendChild(thumb);
  }
}

function updateVisionBadge(badge: HTMLElement | null): void {
  if (!badge) return;
  if (state.staged.length > 0) {
    badge.hidden = false;
    badge.textContent = `已选 ${state.staged.length}/${DEEP_CHAT_VISION_MAX_FILES}`;
    return;
  }
  badge.hidden = true;
  badge.textContent = '';
}

function updateVisionHelper(helper: HTMLElement | null): void {
  if (!helper) return;
  helper.textContent = state.supportsVision
    ? DEEP_CHAT_VISION_COPY.helper
    : DEEP_CHAT_VISION_COPY.nonVision;
  helper.hidden = false;
}

function updateVisionUploadButton(btn: HTMLButtonElement | null): void {
  if (!btn) return;
  const atCap = state.staged.length >= DEEP_CHAT_VISION_MAX_FILES;
  const disabled = !state.supportsVision || state.pending || atCap;
  btn.disabled = disabled;
  btn.setAttribute('aria-disabled', String(disabled));
  btn.classList.toggle('is-disabled', disabled);
  btn.classList.toggle('is-vision-ready', state.supportsVision && !state.pending);
  btn.classList.toggle('is-vision-blocked', !state.supportsVision);
  btn.textContent = '上传图片';

  if (!state.supportsVision) {
    btn.title = DEEP_CHAT_VISION_COPY.nonVision;
    btn.setAttribute('aria-label', DEEP_CHAT_VISION_COPY.nonVision);
  } else if (state.pending) {
    btn.title = '生成中，暂不可上传';
    btn.setAttribute('aria-label', '生成中，暂不可上传');
  } else if (atCap) {
    const msg = DEEP_CHAT_VISION_COPY.maxCount(DEEP_CHAT_VISION_MAX_FILES);
    btn.title = msg;
    btn.setAttribute('aria-label', msg);
  } else {
    btn.title = DEEP_CHAT_VISION_COPY.uploadTooltip;
    btn.setAttribute('aria-label', DEEP_CHAT_VISION_COPY.uploadAria);
  }
}

function renderVisionComposerDom(): void {
  const chat = state.chat;
  if (!chat?.shadowRoot) return;
  ensureStructure(chat);

  const root = chat.shadowRoot.querySelector<HTMLElement>(`#${VISION_COMPOSER_ROOT_ID}`);
  const card = chat.shadowRoot.querySelector<HTMLElement>('#text-input-container');
  const btn = chat.shadowRoot.querySelector<HTMLButtonElement>(`#${VISION_UPLOAD_BTN_ID}`);
  const strip = chat.shadowRoot.querySelector<HTMLElement>(`#${VISION_STRIP_ID}`);
  const helper = chat.shadowRoot.querySelector<HTMLElement>(`#${VISION_HELPER_ID}`);
  const badge = chat.shadowRoot.querySelector<HTMLElement>(`#${VISION_COUNT_ID}`);
  const fileInput = chat.shadowRoot.querySelector<HTMLInputElement>(`#${VISION_FILE_INPUT_ID}`);

  card?.classList.add(HAS_VISION_COMPOSER_CLASS);
  card?.classList.remove(HAS_VISION_STAGED_CLASS);
  root?.classList.toggle(HAS_VISION_STAGED_CLASS, state.staged.length > 0);
  if (strip) renderStrip(strip);
  updateVisionBadge(badge);
  updateVisionHelper(helper);
  updateVisionUploadButton(btn);
  if (fileInput) {
    fileInput.disabled = !state.supportsVision || state.pending;
  }
}

function onUploadClick(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  if (!state.supportsVision) {
    showToast(DEEP_CHAT_VISION_COPY.nonVision, { type: 'warning' });
    return;
  }
  if (state.pending) return;
  if (state.staged.length >= DEEP_CHAT_VISION_MAX_FILES) {
    showToast(DEEP_CHAT_VISION_COPY.maxCount(DEEP_CHAT_VISION_MAX_FILES), { type: 'warning' });
    return;
  }
  const input = state.chat?.shadowRoot?.querySelector<HTMLInputElement>(`#${VISION_FILE_INPUT_ID}`);
  input?.click();
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  stageVisionFiles(input.files);
  input.value = '';
}

function onPaste(event: ClipboardEvent): void {
  const items = event.clipboardData?.items;
  if (!items) return;
  const files: File[] = [];
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  if (files.length === 0) return;
  if (!state.supportsVision) {
    showToast(DEEP_CHAT_VISION_COPY.nonVision, { type: 'warning' });
    return;
  }
  event.preventDefault();
  stageVisionFiles(files);
}

function onDragOver(event: DragEvent): void {
  if (!event.dataTransfer?.types?.includes('Files')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = state.supportsVision ? 'copy' : 'none';
  state.chat?.shadowRoot
    ?.querySelector(`#${VISION_COMPOSER_ROOT_ID}`)
    ?.classList.add('is-vision-dragover');
}

function onDragLeave(event: DragEvent): void {
  const root = state.chat?.shadowRoot?.querySelector(`#${VISION_COMPOSER_ROOT_ID}`);
  if (!root) return;
  if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
  root.classList.remove('is-vision-dragover');
}

function onDrop(event: DragEvent): void {
  const root = state.chat?.shadowRoot?.querySelector(`#${VISION_COMPOSER_ROOT_ID}`);
  root?.classList.remove('is-vision-dragover');
  const files = event.dataTransfer?.files;
  if (!files?.length) return;
  const images = Array.from(files).filter(
    f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name)
  );
  if (images.length === 0) return;
  event.preventDefault();
  event.stopPropagation();
  stageVisionFiles(images);
}

function bindEvents(chat: DeepChatElement): void {
  unbindEvents();
  const shadow = chat.shadowRoot;
  if (!shadow) return;

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.(`#${VISION_UPLOAD_BTN_ID}`)) {
      onUploadClick(event);
    }
  };
  shadow.addEventListener('click', onClick);
  state.cleanups.push(() => shadow.removeEventListener('click', onClick));

  const fileInput = shadow.querySelector<HTMLInputElement>(`#${VISION_FILE_INPUT_ID}`);
  if (fileInput) {
    fileInput.addEventListener('change', onFileChange);
    state.cleanups.push(() => fileInput.removeEventListener('change', onFileChange));
  }

  const dropTarget = shadow.querySelector<HTMLElement>(`#${VISION_COMPOSER_ROOT_ID}`);
  if (dropTarget) {
    dropTarget.addEventListener('dragover', onDragOver);
    dropTarget.addEventListener('dragleave', onDragLeave);
    dropTarget.addEventListener('drop', onDrop);
    state.cleanups.push(() => {
      dropTarget.removeEventListener('dragover', onDragOver);
      dropTarget.removeEventListener('dragleave', onDragLeave);
      dropTarget.removeEventListener('drop', onDrop);
    });
  }

  // Paste on host deep-chat element (bubbles from shadow contenteditable in most browsers).
  chat.addEventListener('paste', onPaste);
  state.cleanups.push(() => chat.removeEventListener('paste', onPaste));
}

function unbindEvents(): void {
  state.cleanups.forEach(fn => fn());
  state.cleanups = [];
}

/**
 * Mount (or re-bind) host vision chrome into deep-chat shadow.
 * Safe to call on every chat replace / config refresh.
 */
export function mountVisionComposer(
  chat: DeepChatElement | null | undefined,
  opts?: { supportsVision?: boolean; pending?: boolean }
): void {
  if (!chat) return;
  if (state.chat && state.chat !== chat) {
    unmountVisionComposer({ keepStaged: true });
  }
  state.chat = chat;
  if (typeof opts?.supportsVision === 'boolean') {
    state.supportsVision = opts.supportsVision;
  }
  if (typeof opts?.pending === 'boolean') {
    state.pending = opts.pending;
  }
  ensureStructure(chat);
  bindEvents(chat);
  renderVisionComposerDom();
}

export function unmountVisionComposer(opts?: { keepStaged?: boolean }): void {
  unbindEvents();
  const chat = state.chat;
  if (chat?.shadowRoot) {
    chat.shadowRoot.querySelector(`#${VISION_COMPOSER_ROOT_ID}`)?.remove();
    chat.shadowRoot
      .querySelector('#text-input-container')
      ?.classList.remove(HAS_VISION_COMPOSER_CLASS, HAS_VISION_STAGED_CLASS);
  }
  state.chat = null;
  if (!opts?.keepStaged) {
    clearStagedVisionAttachments();
  }
}
