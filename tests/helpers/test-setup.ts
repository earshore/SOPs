// test/helpers/test-setup.ts
// ================================================================
// 🧪 测试环境设置辅助函数
// 用于在测试前配置应用所需的环境
// ================================================================

import { Page } from '@playwright/test';

/**
 * 配置 API 密钥和 LLM 设置
 *
 * @param page - Playwright Page 对象
 * @param apiKey - API 密钥
 * @param provider - LLM 提供商（默认: new_api）
 */
export async function setupAPIConfig(
  page: Page,
  apiKey: string = 'AI2026',
  provider: string = 'new_api'
): Promise<void> {
  // 导航到首页
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // 在 localStorage / SecureStorage 中设置 API 配置
  await page.evaluate(async ({ apiKey, provider }) => {
    // 设置活跃的 LLM 提供商
    localStorage.setItem('llm_active_provider', JSON.stringify(provider));

    // 设置 LLM 配置
    const llmConfig = {
      provider: provider,
      endpoint: 'https://new.hongecb.store/v1',
      model: 'gpt-4o-mini',
      apiKey: '',
      enabled: true,
    };
    localStorage.setItem(`llm_${provider}`, JSON.stringify(llmConfig));

    const { SecureStorage } = await import('/src/common/utils/secureStorage.ts');
    await SecureStorage.setSecure(`llm_key_${provider}`, apiKey);

    // 设置应用初始化标志
    localStorage.setItem('app_initialized', JSON.stringify(true));
  }, { apiKey, provider });

  console.log(`✅ API 配置已设置: provider=${provider}, apiKey=${apiKey.substring(0, 4)}***`);
}

/**
 * 清理测试环境
 *
 * @param page - Playwright Page 对象
 */
export async function cleanupTestEnvironment(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  console.log('🧹 测试环境已清理');
}

/**
 * 等待应用初始化完成
 *
 * @param page - Playwright Page 对象
 * @param timeout - 超时时间（毫秒）
 */
export async function waitForAppReady(page: Page, timeout: number = 10000): Promise<void> {
  // 等待 Alpine.js 初始化
  await page.waitForFunction(() => {
    return window.hasOwnProperty('Alpine') && (window as any).Alpine !== undefined;
  }, { timeout });

  // 等待路由器初始化
  await page.waitForFunction(() => {
    return window.hasOwnProperty('router') || window.hasOwnProperty('Router');
  }, { timeout });

  console.log('✅ 应用初始化完成');
}
