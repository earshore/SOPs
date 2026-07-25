import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadCsv, downloadJson, downloadText } from '@/common/utils/download';

describe('download utils', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let click: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click,
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tagName);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(node => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(node => node);
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('downloads text and revokes object URLs', () => {
    downloadText('a.txt', 'hello');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('downloads json and csv', () => {
    downloadJson('a.json', { ok: true });
    downloadCsv('a.csv', 'h,v\n1,2');
    downloadCsv('b.csv', 'h,v\n1,2', { bom: false });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
  });
});
