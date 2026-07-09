import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from './sopCopyWorkflowFixture';

const mocks = {
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: '<section><input id="sop-owner" value="Default owner" /></section>',
};

const unmount = vi.fn();

describe('createSopCopyWorkflowFixture', () => {
  beforeEach(() => {
    unmount.mockClear();
    delete (window as unknown as Record<string, unknown>).sops_copyFixtureTemplate;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('prepares shared SOP copy mocks and verifies the successful copy workflow', async () => {
    const fixture = createSopCopyWorkflowFixture({ mocks, unmount });
    const container = fixture.setup({
      storageKey: 'fixture_owner_v1',
      defaultOwner: 'Default owner',
    });
    const mount = vi.fn(async (mountedContainer: HTMLElement) => {
      mountedContainer.innerHTML = await mocks.loadTemplate(
        'src/modules/sops/views/fixture/template.html'
      );
      window.sops_copyFixtureTemplate = async () => {
        const ownerInput = document.getElementById('sop-owner') as HTMLInputElement;
        await navigator.clipboard.writeText(`Owner: ${ownerInput.value}`);
        mocks.storageSet('fixture_owner_v1', ownerInput.value);
        mocks.showToast('Copied fixture template', { type: 'success' });
      };
    });

    await fixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyFixtureTemplate?.(),
      ownerInputId: 'sop-owner',
      ownerValue: 'Test owner',
      templatePath: 'src/modules/sops/views/fixture/template.html',
      storageKey: 'fixture_owner_v1',
      copiedText: 'Owner: Test owner',
      successMessage: 'Copied fixture template',
    });
    fixture.cleanup();

    expect(container.isConnected).toBe(false);
    expect(unmount).toHaveBeenCalledOnce();
  });

  it('restores only the clipboard mock owned by the fixture during cleanup', () => {
    const previousClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const originalClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    const unrelated = { run: () => 'real' };
    const unrelatedSpy = vi.spyOn(unrelated, 'run').mockReturnValue('mocked');

    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
      const fixture = createSopCopyWorkflowFixture({ mocks, unmount });

      fixture.setup({
        storageKey: 'fixture_owner_v1',
        defaultOwner: 'Default owner',
      });
      expect(navigator.clipboard).not.toBe(originalClipboard);

      fixture.cleanup();

      expect(navigator.clipboard).toBe(originalClipboard);
      expect(unrelated.run()).toBe('mocked');
      expect(unrelatedSpy).toHaveBeenCalledOnce();
    } finally {
      unrelatedSpy.mockRestore();
      if (previousClipboardDescriptor) {
        Object.defineProperty(navigator, 'clipboard', previousClipboardDescriptor);
      } else {
        delete (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
      }
    }
  });
});

declare global {
  interface Window {
    sops_copyFixtureTemplate?: () => Promise<void>;
  }
}
