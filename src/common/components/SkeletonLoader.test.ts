import { describe, expect, it } from 'vitest';
import { SkeletonLoader } from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('creates repeated typed skeletons with default styling', () => {
    const skeleton = SkeletonLoader.create({ type: 'title', count: 2 });
    const items = skeleton.querySelectorAll('.skeleton-title');

    expect(skeleton.className).toBe('skeleton-container');
    expect(items).toHaveLength(2);
    expect((items[0] as HTMLElement).classList.contains('skeleton-title')).toBe(true);
    expect((items[0] as HTMLElement).classList.contains('skeleton-animated')).toBe(true);
    expect(skeleton.querySelector('[style]')).toBeNull();
  });

  it('renders custom skeletons without type-specific children or inline styles', () => {
    const skeleton = SkeletonLoader.create({
      type: 'custom',
      count: 1,
      className: 'custom-loader',
      width: '12px',
      height: '16px',
    });
    const item = skeleton.firstElementChild as HTMLElement;

    expect(item.classList.contains('skeleton-custom')).toBe(true);
    expect(item.classList.contains('custom-loader')).toBe(true);
    expect(item.children).toHaveLength(0);
    expect(item.getAttribute('style')).toBeNull();
  });

  it('removes skeleton containers from a target', () => {
    const target = document.createElement('div');
    SkeletonLoader.show(target, { type: 'text' });
    SkeletonLoader.show(target, { type: 'avatar' });

    expect(target.querySelectorAll('.skeleton-container')).toHaveLength(2);

    SkeletonLoader.hideAll(target);

    expect(target.querySelectorAll('.skeleton-container')).toHaveLength(0);
  });
});
