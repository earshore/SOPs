import { describe, expect, it, vi } from 'vitest';
import { openFilePicker } from './filePicker';

describe('openFilePicker', () => {
  it('clears the previous selection and uses showPicker when available', () => {
    const input = document.createElement('input');
    input.value = 'previous';
    const showPicker = vi.fn();
    const click = vi.spyOn(input, 'click');
    Object.defineProperty(input, 'showPicker', { configurable: true, value: showPicker });

    expect(openFilePicker(input)).toBe(true);
    expect(input.value).toBe('');
    expect(showPicker).toHaveBeenCalledOnce();
    expect(click).not.toHaveBeenCalled();
  });

  it('falls back to click when showPicker is unavailable or rejected', () => {
    const input = document.createElement('input');
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    Object.defineProperty(input, 'showPicker', {
      configurable: true,
      value: vi.fn(() => {
        throw new DOMException('Not allowed', 'NotAllowedError');
      }),
    });

    expect(openFilePicker(input)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it('reports failure when no input exists or both browser paths fail', () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(openFilePicker(null)).toBe(false);
    expect(openFilePicker(input)).toBe(false);
  });
});
