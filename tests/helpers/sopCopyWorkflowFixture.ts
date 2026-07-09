import { expect, vi } from 'vitest';

export interface SopCopyWorkflowMocks {
  storageGet: ReturnType<typeof vi.fn>;
  storageSet: ReturnType<typeof vi.fn>;
  loadTemplate: ReturnType<typeof vi.fn>;
  showToast: ReturnType<typeof vi.fn>;
  template: string;
}

export interface SopCopyWorkflowFixtureConfig {
  mocks: SopCopyWorkflowMocks;
  unmount: () => void;
}

export interface SopCopyWorkflowSetupOptions {
  storageKey: string;
  defaultOwner: string;
}

export interface SopCopyWorkflowSuccessOptions {
  mount: (container: HTMLElement) => Promise<void>;
  action: () => Promise<void> | undefined;
  ownerInputId: string;
  ownerValue: string;
  templatePath: string;
  storageKey: string;
  copiedText: string;
  successMessage: string;
}

export function createSopCopyWorkflowFixture(config: SopCopyWorkflowFixtureConfig): {
  setup(options: SopCopyWorkflowSetupOptions): HTMLElement;
  cleanup(): void;
  copyAndExpectSuccess(options: SopCopyWorkflowSuccessOptions): Promise<void>;
} {
  let container: HTMLElement | null = null;
  let originalClipboardDescriptor: PropertyDescriptor | undefined;
  let hasCapturedClipboardDescriptor = false;

  return {
    setup({ storageKey, defaultOwner }) {
      container = document.createElement('div');
      document.body.appendChild(container);
      config.mocks.storageGet.mockClear();
      config.mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
        if (key === storageKey) return defaultOwner;
        return fallback;
      });
      config.mocks.storageSet.mockClear();
      config.mocks.loadTemplate.mockResolvedValue(config.mocks.template);
      config.mocks.loadTemplate.mockClear();
      if (!hasCapturedClipboardDescriptor) {
        originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        hasCapturedClipboardDescriptor = true;
      }
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
      config.mocks.showToast.mockClear();

      return container;
    },

    cleanup() {
      config.unmount();
      document.body.innerHTML = '';

      if (hasCapturedClipboardDescriptor) {
        if (originalClipboardDescriptor) {
          Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
        } else {
          delete (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
        }
        originalClipboardDescriptor = undefined;
        hasCapturedClipboardDescriptor = false;
      }

      container = null;
    },

    async copyAndExpectSuccess(options) {
      if (!container) {
        throw new Error('Call setup() before copyAndExpectSuccess().');
      }

      await options.mount(container);
      const ownerInput = document.getElementById(options.ownerInputId) as HTMLInputElement | null;
      if (ownerInput) ownerInput.value = options.ownerValue;

      const actionResult = options.action();
      if (!actionResult) {
        throw new Error(`SOP copy action for ${options.ownerInputId} was not registered.`);
      }
      await actionResult;

      expect(config.mocks.loadTemplate).toHaveBeenCalledWith(options.templatePath);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining(options.copiedText)
      );
      expect(config.mocks.storageSet).toHaveBeenCalledWith(options.storageKey, options.ownerValue);
      expect(config.mocks.showToast).toHaveBeenCalledWith(options.successMessage, {
        type: 'success',
      });
    },
  };
}
