import { beforeEach, describe, expect, it, vi } from 'vitest';

const showToast = vi.fn();
const navigateToRouteId = vi.fn();
const saveListingCopy = vi.fn((copy: unknown) => copy);
const applyListingCopyToKeywordHunter = vi.fn();
const registerListingCopyArtifact = vi.fn();
const setWorkspaceContext = vi.fn();

vi.mock('@/common/ui/notifications', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

vi.mock('@/common/router', () => ({
  navigateToRouteId: (...args: unknown[]) => navigateToRouteId(...args),
}));

vi.mock('@/modules/app_center/listingWorkflowHandoff', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/app_center/listingWorkflowHandoff')>();
  return {
    ...actual,
    saveListingCopy: (copy: unknown) => saveListingCopy(copy),
    applyListingCopyToKeywordHunter: (copy: unknown) => applyListingCopyToKeywordHunter(copy),
    registerListingCopyArtifact: (copy: unknown) => registerListingCopyArtifact(copy),
  };
});

vi.mock('@/modules/app_center/workspaceContext', () => ({
  setWorkspaceContext: (ctx: unknown) => setWorkspaceContext(ctx),
}));

const { sessionState } = await import('../session/sessionState');
const { sendAssistantCopyToKeywordHunter } = await import('./handoffs');

const fullListing = [
  '1. Title: Kabellose Ohrhörer',
  '2. Bullet 1: Feature one',
  '3. Bullet 2: Feature two',
  '4. Bullet 3: Feature three',
  '5. Bullet 4: Feature four',
  '6. Bullet 5: Feature five',
  '7. Description: Long product description here.',
].join('\n');

describe('sendAssistantCopyToKeywordHunter push guards', () => {
  beforeEach(() => {
    showToast.mockReset();
    navigateToRouteId.mockReset();
    saveListingCopy.mockClear();
    applyListingCopyToKeywordHunter.mockClear();
    registerListingCopyArtifact.mockClear();
    setWorkspaceContext.mockClear();
    sessionState.threadStore = {
      activeThreadId: 't1',
      threads: [
        {
          id: 't1',
          title: 'Listing',
          messages: [{ role: 'ai', text: fullListing, createdAt: 1 }],
          listingPromptContext: {
            promptId: 'p1',
            prompt: 'Write listing',
            seoKeywords: ['kw1'],
            workItemId: 'wi1',
            marketplace: 'DE',
            asinOrSku: 'B001',
          },
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    };
  });

  it('blocks timeout-retained partial with dedicated toast', async () => {
    await sendAssistantCopyToKeywordHunter(fullListing, {
      role: 'ai',
      text: fullListing,
      assistantPushBlockReason: 'partial_timeout',
    });
    expect(showToast).toHaveBeenCalledWith('回复生成超时未完成，无法推送复核', {
      type: 'warning',
    });
    expect(saveListingCopy).not.toHaveBeenCalled();
    expect(navigateToRouteId).not.toHaveBeenCalled();
  });

  it('blocks incomplete numbered structure', async () => {
    const truncated = '1. Title: Kabellose Ohrhörer\n2. Bullet 1: only one';
    await sendAssistantCopyToKeywordHunter(truncated);
    expect(showToast).toHaveBeenCalledWith('正文结构不完整，无法推送复核', { type: 'warning' });
    expect(saveListingCopy).not.toHaveBeenCalled();
  });

  it('does not show structure/timeout block toast for a complete listing', async () => {
    await sendAssistantCopyToKeywordHunter(fullListing);
    const toastMessages = showToast.mock.calls.map(call => String(call[0] ?? ''));
    expect(toastMessages.some(m => m.includes('结构不完整') || m.includes('超时未完成'))).toBe(
      false
    );
  });
});
