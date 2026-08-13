import { TransitionLoader } from './TransitionLoader';

describe('TransitionLoader', () => {
  it('renders the enterprise transition visual layers', () => {
    const loader = TransitionLoader.render();

    expect(loader.className).toBe('transition-loader-wrapper');
    expect(loader.querySelector('svg.transition-svg')).not.toBeNull();
    expect(loader.querySelector('.transition-surface')).not.toBeNull();
    expect(loader.querySelector('.transition-panel')).not.toBeNull();
    expect(loader.querySelector('.transition-orbit')).not.toBeNull();
    expect(loader.querySelectorAll('.transition-particle')).toHaveLength(5);
    expect(loader.querySelector('.transition-progress-value')).not.toBeNull();
    expect(loader.querySelector('animate')).toBeNull();
  });

  it('provides a complete production-oriented easter-egg message set', () => {
    const loader = TransitionLoader.render();
    const messages = Array.from(loader.querySelectorAll<SVGTextElement>('.transition-egg')).map(
      element => element.textContent
    );

    expect(messages).toEqual([
      '正在整理本次作业的上下文…',
      '正在校验流程节点与权限边界…',
      '正在让数据和界面保持同频…',
      '正在准备下一步高效作业…',
    ]);
  });

  it('ships light and dark semantic color tokens with reduced-motion fallbacks', () => {
    const loader = TransitionLoader.render();
    const style = loader.querySelector('style')?.textContent ?? '';

    expect(style).toContain('--tl-surface');
    expect(style).toContain('[data-color-mode-resolved=\'dark\'] .transition-svg');
    expect(style).toContain('@media (prefers-reduced-motion: reduce)');
    expect(style).toContain('.no-loading-animations .transition-svg *');
  });
});
