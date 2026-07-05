import { describe, expect, it, vi } from 'vitest';
import {
  renderEmpty,
  renderErrorBoundary,
  renderNotRegistered,
  renderTimeout,
} from '../../src/components/ErrorBoundary';

function createHost(): HTMLElement {
  const host = document.createElement('section');
  document.body.appendChild(host);
  return host;
}

describe('task-oriented fallback UI', () => {
  it('renders module errors with cause, recovery actions, and accessible focus states', async () => {
    const host = createHost();
    const onRetry = vi.fn();

    renderErrorBoundary(host, new Error('接口返回 500'), {
      color: 'blue',
      onRetry,
    });

    expect(host.querySelector('[role="alert"]')).toBeTruthy();
    expect(host.textContent).toContain('当前模块没有成功加载');
    expect(host.textContent).toContain('错误详情：接口返回 500');
    expect(host.textContent).toContain('重试加载');
    expect(host.textContent).toContain('刷新页面');
    expect(host.innerHTML).toContain('focus-visible:ring-2');
    expect(host.querySelector<HTMLButtonElement>('[data-action="reload-page-error"]')?.type).toBe(
      'button'
    );
    expect(host.querySelector<HTMLButtonElement>('[id^="btn-retry-"]')?.type).toBe('button');

    await new Promise(resolve => window.setTimeout(resolve, 0));
    host.querySelector<HTMLButtonElement>('[id^="btn-retry-"]')?.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty states as next-step guidance instead of a single dead-end sentence', () => {
    const host = createHost();

    renderEmpty(host, '还没有分析结果', 'fa-chart-line');

    expect(host.querySelector('[role="status"]')).toBeTruthy();
    expect(host.textContent).toContain('还没有分析结果');
    expect(host.textContent).toContain('完成导入、筛选或配置后');
    expect(host.textContent).toContain('重新执行当前任务');
  });

  it('explains unavailable modules with a clear recovery path', () => {
    const host = createHost();

    renderNotRegistered(host, 'missing-route');

    expect(host.textContent).toContain('功能暂未开放');
    expect(host.textContent).toContain('missing-route');
    expect(host.textContent).toContain('从顶部导航选择其他可用模块');
  });

  it('renders timeouts with task-specific recovery copy and focus-visible reload control', () => {
    const host = createHost();

    renderTimeout(host);

    expect(host.textContent).toContain('内容容器没有在预期时间内就绪');
    expect(host.textContent).toContain('重新初始化应用状态');
    expect(host.querySelector('[data-action="reload-page-timeout"]')).toBeTruthy();
    expect(host.innerHTML).toContain('focus-visible:ring-2');
    expect(host.querySelector<HTMLButtonElement>('[data-action="reload-page-timeout"]')?.type).toBe(
      'button'
    );
  });
});
