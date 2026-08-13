import { TransitionLoader } from './TransitionLoader';

describe('TransitionLoader', () => {
  it('renders an accessible SVG-based resilient loader', () => {
    const loader = TransitionLoader.render();

    expect(loader.className).toBe('transition-loader-wrapper');
    expect(loader.querySelector('svg.transition-svg')).not.toBeNull();
    expect(loader.querySelector('.main-container')).not.toBeNull();
    expect(loader.querySelector('.shimmer')).not.toBeNull();
    expect(loader.querySelector('.progress-bar-inner')).not.toBeNull();
    expect(loader.querySelector('animate')).toBeNull();
  });

  it('includes the complete non-overlapping easter-egg message set', () => {
    const loader = TransitionLoader.render();
    const messages = Array.from(loader.querySelectorAll<SVGTextElement>('.egg-text')).map(
      element => element.textContent
    );

    expect(messages).toEqual([
      '正在捕捉逃跑的代码行...',
      '正在给服务器喂咖啡...',
      '正在说服数据保持冷静...',
      '正在搬运像素点，请稍候...',
    ]);
  });
});
