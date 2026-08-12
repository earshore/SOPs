import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  navigateToRouteId: vi.fn(),
  saveListingCopy: vi.fn((copy: unknown) => copy),
  applyListingCopyToKeywordHunter: vi.fn(),
  registerListingCopyArtifact: vi.fn(),
  setWorkspaceContext: vi.fn(),
  flushThreadStore: vi.fn(),
}));

vi.mock('@/common/ui/notifications', () => ({
  showToast: (...args: unknown[]) => mocks.showToast(...args),
}));

vi.mock('@/common/router/initRouter', () => ({
  navigateToRouteId: (...args: unknown[]) => mocks.navigateToRouteId(...args),
}));

vi.mock('@/modules/app_center/listingCopyService', () => ({
  saveListingCopy: (copy: unknown) => mocks.saveListingCopy(copy),
}));

vi.mock('@/modules/app_center/artifactEnvelopeService', () => ({
  registerListingCopyArtifact: (copy: unknown) => mocks.registerListingCopyArtifact(copy),
}));

vi.mock('@/modules/app_center/keywordHunterListingHandoff', () => ({
  applyListingCopyToKeywordHunter: (copy: unknown) => mocks.applyListingCopyToKeywordHunter(copy),
}));

vi.mock('@/modules/app_center/workspaceContext', () => ({
  setWorkspaceContext: (ctx: unknown) => mocks.setWorkspaceContext(ctx),
}));

vi.mock('../session/threadStore', async importOriginal => ({
  ...(await importOriginal<typeof import('../session/threadStore')>()),
  flushThreadStore: () => mocks.flushThreadStore(),
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
    mocks.showToast.mockReset();
    mocks.navigateToRouteId.mockReset();
    mocks.navigateToRouteId.mockResolvedValue(true);
    mocks.saveListingCopy.mockClear();
    mocks.applyListingCopyToKeywordHunter.mockClear();
    mocks.registerListingCopyArtifact.mockClear();
    mocks.setWorkspaceContext.mockClear();
    mocks.flushThreadStore.mockReset();
    mocks.flushThreadStore.mockResolvedValue(true);
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
    expect(mocks.showToast).toHaveBeenCalledWith('回复生成超时未完成，无法推送复核', {
      type: 'warning',
    });
    expect(mocks.saveListingCopy).not.toHaveBeenCalled();
    expect(mocks.navigateToRouteId).not.toHaveBeenCalled();
  });

  it('blocks incomplete numbered structure', async () => {
    const truncated = '1. Title: Kabellose Ohrhörer\n2. Bullet 1: only one';
    await sendAssistantCopyToKeywordHunter(truncated);
    expect(mocks.showToast).toHaveBeenCalledWith('正文结构不完整，无法推送复核', {
      type: 'warning',
    });
    expect(mocks.saveListingCopy).not.toHaveBeenCalled();
  });

  it('uses DOM content when the toolbar has no stored assistant message', async () => {
    await sendAssistantCopyToKeywordHunter(fullListing);

    expect(mocks.saveListingCopy).toHaveBeenCalledWith(
      expect.objectContaining({ content: fullListing })
    );
    expect(mocks.registerListingCopyArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ content: fullListing })
    );
    expect(mocks.applyListingCopyToKeywordHunter).toHaveBeenCalledWith(
      expect.objectContaining({ content: fullListing })
    );
    expect(mocks.setWorkspaceContext).toHaveBeenCalledWith({
      workItemId: 'wi1',
      marketplace: 'DE',
      asinOrSku: 'B001',
      sourceRoute: 'keyword_hunter_input',
    });
    expect(mocks.navigateToRouteId).toHaveBeenCalledWith('keyword_hunter_input');
    expect(mocks.showToast).toHaveBeenCalledWith('已带入产品文案和 1 个 SEO 关键词', {
      type: 'success',
    });
  });

  it('prefers the stored assistant message to a stale DOM listing', async () => {
    const storedListing = fullListing.replace('Feature one', 'AUTHORITATIVE-SENTINEL');
    const staleDomListing = `${storedListing}\nSTALE-DOM-SENTINEL`;

    await sendAssistantCopyToKeywordHunter(staleDomListing, {
      role: 'ai',
      text: storedListing,
      createdAt: 1,
    });

    const savedCopy = mocks.saveListingCopy.mock.calls[0]?.[0] as {
      content: string;
    };
    expect(savedCopy.content).toContain('AUTHORITATIVE-SENTINEL');
    expect(savedCopy.content).not.toContain('STALE-DOM-SENTINEL');
  });

  it('keeps an unmatched toolbar fallback from replacing the visible listing', async () => {
    const visibleListing = fullListing.replace('Feature one', 'VISIBLE-SENTINEL');
    const unrelatedFallback = 'Saved answer from an earlier message';

    await sendAssistantCopyToKeywordHunter(visibleListing, {
      role: 'ai',
      text: unrelatedFallback,
      createdAt: 1,
    });

    const savedCopy = mocks.saveListingCopy.mock.calls[0]?.[0] as {
      content: string;
    };
    expect(savedCopy.content).toContain('VISIBLE-SENTINEL');
    expect(savedCopy.content).not.toContain(unrelatedFallback);
  });

  it('waits for thread persistence before navigating to Keyword Hunter', async () => {
    let resolveFlush: (saved: boolean) => void;
    mocks.flushThreadStore.mockReturnValueOnce(
      new Promise<boolean>(resolve => {
        resolveFlush = resolve;
      })
    );

    const push = sendAssistantCopyToKeywordHunter(fullListing);
    await vi.waitFor(() => expect(mocks.saveListingCopy).toHaveBeenCalled());

    expect(mocks.navigateToRouteId).not.toHaveBeenCalled();

    resolveFlush!(true);
    await push;

    expect(mocks.saveListingCopy).toHaveBeenCalled();
    expect(mocks.navigateToRouteId).toHaveBeenCalledWith('keyword_hunter_input');
  });

  it('keeps Deep Chat open when its persistence flush fails', async () => {
    mocks.flushThreadStore.mockResolvedValueOnce(false);

    await sendAssistantCopyToKeywordHunter(fullListing);

    expect(mocks.navigateToRouteId).not.toHaveBeenCalled();
  });
});
