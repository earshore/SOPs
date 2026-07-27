import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearStagedVisionAttachments,
  getStagedVisionCount,
  getStagedVisionFiles,
  hasStagedVisionAttachments,
  removeStagedVisionItem,
  stageVisionFiles,
  syncVisionComposerCapability,
  validateVisionFileForStaging,
  mountVisionComposer,
  unmountVisionComposer,
  VISION_UPLOAD_BTN_ID,
  VISION_HELPER_ID,
  VISION_STRIP_ID,
} from './visionComposer';
import { DEEP_CHAT_VISION_COPY, DEEP_CHAT_VISION_MAX_FILES } from '../request/visionAttachments';
import type { DeepChatElement } from '../types';

vi.mock('@/common/ui/notifications', () => ({
  showToast: vi.fn(),
}));

function makePngFile(name = 'a.png', size = 128): File {
  const bytes = new Uint8Array(size);
  bytes[0] = 0x89;
  bytes[1] = 0x50;
  return new File([bytes], name, { type: 'image/png' });
}

function makeSvgFile(): File {
  return new File(['<svg></svg>'], 'x.svg', { type: 'image/svg+xml' });
}

function createMockChat(): DeepChatElement {
  const host = document.createElement('div') as unknown as DeepChatElement;
  const shadow = host.attachShadow({ mode: 'open' });
  // Build fixture with DOM APIs (static structure only; no HTML string injection).
  const input = document.createElement('div');
  input.id = 'input';
  const textInputContainer = document.createElement('div');
  textInputContainer.id = 'text-input-container';
  const textInput = document.createElement('div');
  textInput.id = 'text-input';
  textInput.contentEditable = 'true';
  textInputContainer.append(textInput);
  input.append(textInputContainer);
  shadow.append(input);
  return host;
}

describe('validateVisionFileForStaging', () => {
  it('accepts png under caps', () => {
    expect(validateVisionFileForStaging(makePngFile(), [])).toBeNull();
  });

  it('rejects svg', () => {
    expect(validateVisionFileForStaging(makeSvgFile(), [])).toBe(DEEP_CHAT_VISION_COPY.svg);
  });

  it('rejects when already at max count', () => {
    const already = Array.from({ length: DEEP_CHAT_VISION_MAX_FILES }, (_, i) => ({
      name: `${i}.png`,
      size: 10,
    }));
    expect(validateVisionFileForStaging(makePngFile(), already)).toBe(
      DEEP_CHAT_VISION_COPY.maxCount(DEEP_CHAT_VISION_MAX_FILES)
    );
  });
});

describe('visionComposer stage / clear', () => {
  afterEach(() => {
    unmountVisionComposer();
  });

  it('stages files only when supportsVision', () => {
    syncVisionComposerCapability({ supportsVision: false });
    const blocked = stageVisionFiles([makePngFile()]);
    expect(blocked.added).toBe(0);
    expect(hasStagedVisionAttachments()).toBe(false);

    syncVisionComposerCapability({ supportsVision: true });
    const ok = stageVisionFiles([makePngFile('one.png'), makePngFile('two.png')]);
    expect(ok.added).toBe(2);
    expect(getStagedVisionCount()).toBe(2);
    expect(getStagedVisionFiles()).toHaveLength(2);

    clearStagedVisionAttachments();
    expect(getStagedVisionCount()).toBe(0);
  });

  it('removes a single staged item', () => {
    syncVisionComposerCapability({ supportsVision: true });
    stageVisionFiles([makePngFile('a.png'), makePngFile('b.png')]);
    const files = getStagedVisionFiles();
    // remove via internal staging by re-stage path: use remove after mount ids
    // Stage again through state — pull id by mounting
    const chat = createMockChat();
    mountVisionComposer(chat, { supportsVision: true });
    const strip = chat.shadowRoot?.querySelector(`#${VISION_STRIP_ID}`);
    const thumbs = strip?.querySelectorAll('.deep-chat-vision-thumb') ?? [];
    expect(thumbs.length).toBe(2);
    const id = (thumbs[0] as HTMLElement).dataset.visionId;
    expect(id).toBeTruthy();
    removeStagedVisionItem(id!);
    expect(getStagedVisionCount()).toBe(1);
    void files;
  });
});

describe('mountVisionComposer', () => {
  afterEach(() => {
    unmountVisionComposer();
  });

  it('always mounts upload control and helper (discoverable when non-vision)', () => {
    const chat = createMockChat();
    mountVisionComposer(chat, { supportsVision: false });

    const btn = chat.shadowRoot?.querySelector<HTMLButtonElement>(`#${VISION_UPLOAD_BTN_ID}`);
    const helper = chat.shadowRoot?.querySelector(`#${VISION_HELPER_ID}`);
    expect(btn).toBeTruthy();
    expect(helper).toBeTruthy();
    expect(btn?.disabled).toBe(true);
    expect(btn?.getAttribute('aria-label')).toBe(DEEP_CHAT_VISION_COPY.nonVision);
    expect(helper?.textContent).toBe(DEEP_CHAT_VISION_COPY.nonVision);
  });

  it('enables upload when supportsVision', () => {
    const chat = createMockChat();
    mountVisionComposer(chat, { supportsVision: true });
    const btn = chat.shadowRoot?.querySelector<HTMLButtonElement>(`#${VISION_UPLOAD_BTN_ID}`);
    expect(btn?.disabled).toBe(false);
    expect(btn?.classList.contains('is-vision-ready')).toBe(true);
  });
});
