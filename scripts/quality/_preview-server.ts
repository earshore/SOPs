/**
 * 共享工具：为无头 UI 审计门禁自动拉起 / 回收 vite preview 服务。
 *
 * 设计约束（保持与 smoke 验证链一致）：
 * - 基于 `dist` 的 `vite preview`，非 dev server；CI 中 `ci:ui-audit` 先 build 再跑。
 * - 默认 `http://127.0.0.1:5175`，端口 5175 / `--strictPort`，避免与 dev 5173 冲突。
 * - `CARD_AUDIT_BASE_URL` 覆盖时跳过拉起（保留本地 dev 调试体验）。
 * - teardown 通过进程 SIGTERM + 超时 SIGKILL，避免孤儿进程。
 */
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';

export const DEFAULT_PREVIEW_PORT = 5175;
export const DEFAULT_PREVIEW_URL = `http://127.0.0.1:${DEFAULT_PREVIEW_PORT}`;

export interface PreviewServer {
  base: string;
  stop: () => Promise<void>;
}

/** 端口是否已被监听（含其他服务占用）。 */
async function portInUse(port: number): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const socket = net.createConnection({ port, host: '127.0.0.1' }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(1500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/** 轮询等待 URL 返回 2xx。 */
async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      if (res.status >= 200 && res.status < 400) {
        return;
      }
    } catch {
      // preview 尚未就绪，继续轮询
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`preview server at ${url} did not become ready within ${timeoutMs}ms`);
}

/**
 * 拉起 preview 服务。
 * - 若 `CARD_AUDIT_BASE_URL` 已显式指定，直接返回该 base，不拉起服务（dev 调试路径）。
 * - 若 5175 已被占用（例如并发门禁或人工 dev），直接复用该端点。
 * - 否则 spawn `npm run preview -- --host 127.0.0.1 --port 5175 --strictPort`。
 */
export async function launchPreviewServer(): Promise<PreviewServer> {
  const overridden = process.env.CARD_AUDIT_BASE_URL?.trim();
  if (overridden) {
    return { base: overridden.replace(/\/$/, ''), stop: async () => {} };
  }
  const port = DEFAULT_PREVIEW_PORT;
  if (!(await portInUse(port))) {
    execSync('npm run build:app', { stdio: 'inherit' });
    // Windows 下 npm 为 npm.cmd，需经 shell 解析（Node 24 直接 spawn .cmd 会抛 EINVAL）。
    const child: ChildProcess = spawn(
      `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
      {
        shell: true,
        stdio: ['ignore', 'ignore', 'inherit'],
      }
    );
    child.unref();
    await waitForReady(DEFAULT_PREVIEW_URL, 120_000);
    let stopped = false;
    const stop = async (): Promise<void> => {
      if (stopped) return;
      stopped = true;
      if (child.pid) {
        child.kill('SIGTERM');
        await new Promise<void>(resolve => {
          const timer = setTimeout(() => {
            try {
              process.kill(child.pid!, 'SIGKILL');
            } catch {
              // 进程已退出
            }
            resolve();
          }, 5000);
          child.once('exit', () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
    };
    return { base: DEFAULT_PREVIEW_URL, stop };
  }
  // 端口已被占用：复用现有端点，不接管生命周期
  return { base: DEFAULT_PREVIEW_URL, stop: async () => {} };
}
