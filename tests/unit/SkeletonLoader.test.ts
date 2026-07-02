import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hideAllSkeletons,
  hideSkeleton,
  showSkeleton,
  SkeletonLoader,
  type SkeletonType,
} from '@/common/components/SkeletonLoader';
import { ValidationError } from '@/common/errors/AppError';

describe('SkeletonLoader', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(Date, 'now').mockReturnValue(1000);
  });

  it('creates every built-in skeleton type with defaults and custom styles', () => {
    const types: SkeletonType[] = ['text', 'title', 'paragraph', 'avatar', 'image', 'card', 'list', 'table', 'custom'];

    types.forEach((type) => {
      const skeleton = SkeletonLoader.create({
        type,
        count: 2,
        className: 'extra',
        width: '88px',
        style: { minHeight: '12px' },
      });

      expect(skeleton.className).toBe('skeleton-container');
      expect(skeleton.children).toHaveLength(2);
      expect(skeleton.querySelector('.extra')).not.toBeNull();
    });
  });

  it('applies specialized skeleton structure for content-heavy presets', () => {
    const paragraph = SkeletonLoader.create({ type: 'paragraph' });
    const card = SkeletonLoader.create({ type: 'card' });
    const list = SkeletonLoader.create({ type: 'list' });
    const table = SkeletonLoader.create({ type: 'table' });
    const avatar = SkeletonLoader.create({ type: 'avatar', height: '32px', animated: false });

    expect(paragraph.querySelectorAll('.skeleton-text')).toHaveLength(4);
    expect(card.querySelector('.skeleton-image')).not.toBeNull();
    expect(list.querySelectorAll('.skeleton-list-item')).toHaveLength(5);
    expect(table.querySelectorAll('.skeleton-table-row')).toHaveLength(5);
    expect((avatar.firstElementChild as HTMLElement).style.borderRadius).toBe('50%');
    expect(avatar.querySelector('.skeleton-animated')).toBeNull();
  });

  it('shows, hides, and clears skeletons by element or selector', () => {
    const target = document.createElement('section');
    target.id = 'target';
    document.body.append(target);

    const shownByElement = showSkeleton(target, { type: 'text' });
    const shownBySelector = showSkeleton('#target', { type: 'title' });

    expect(shownByElement.dataset.skeletonId).toBe('skeleton-1000');
    expect(target.querySelectorAll('.skeleton-container')).toHaveLength(2);

    hideSkeleton(shownByElement);
    expect(target.querySelectorAll('.skeleton-container')).toHaveLength(1);

    hideAllSkeletons(target);
    expect(target.querySelectorAll('.skeleton-container')).toHaveLength(0);

    target.append(shownBySelector);
    hideAllSkeletons('#target');
    expect(target.querySelector('.skeleton-container')).toBeNull();
  });

  it('throws a validation error when the target cannot be found', () => {
    expect(() => SkeletonLoader.show('#missing', { type: 'text' })).toThrow(ValidationError);
    expect(() => SkeletonLoader.show('#missing', { type: 'text' })).toThrow('目标元素未找到');
  });
});
