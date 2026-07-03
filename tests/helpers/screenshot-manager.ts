// tests/helpers/screenshot-manager.ts
// ================================================================
// 📸 截图管理器
// 提供失败截图的自动管理、命名规范和清理策略
// ================================================================

import * as fs from 'fs';
import * as path from 'path';
import { Page, TestInfo } from '@playwright/test';

/**
 * 截图配置选项
 */
export interface ScreenshotConfig {
  baseDir?: string;           // 基础目录，默认 'tests/screenshots'
  failureDir?: string;        // 失败截图目录，默认 'failures'
  maxAge?: number;            // 最大保留时间（天），默认 7 天
  maxCount?: number;          // 最大保留数量，默认 100 个
  includeTimestamp?: boolean; // 是否包含时间戳，默认 true
  includeBrowser?: boolean;   // 是否包含浏览器类型，默认 true
  fullPage?: boolean;         // 是否全页截图，默认 false
}

/**
 * 截图元数据
 */
export interface ScreenshotMetadata {
  testName: string;           // 测试名称
  testFile: string;           // 测试文件路径
  browser: string;            // 浏览器类型
  timestamp: string;          // 时间戳
  error?: string;             // 错误信息
  url?: string;               // 页面 URL
  viewport?: {                // 视口大小
    width: number;
    height: number;
  };
}

/**
 * 截图索引条目
 */
export interface ScreenshotIndexEntry {
  filename: string;           // 文件名
  path: string;               // 完整路径
  metadata: ScreenshotMetadata;
  size: number;               // 文件大小（字节）
  createdAt: Date;            // 创建时间
}

/**
 * 截图管理器类
 * 
 * 提供失败截图的自动管理功能：
 * - 自动创建目录结构
 * - 规范化截图命名
 * - 生成截图索引
 * - 自动清理过期截图
 * 
 * @example
 * ```typescript
 * const manager = ScreenshotManager.getInstance();
 * await manager.captureFailure(page, testInfo);
 * ```
 */
export class ScreenshotManager {
  private static instance: ScreenshotManager;
  private config: Required<ScreenshotConfig>;
  private indexPath: string;
  private index: ScreenshotIndexEntry[] = [];

  private constructor(config: ScreenshotConfig = {}) {
    this.config = {
      baseDir: config.baseDir || 'tests/screenshots',
      failureDir: config.failureDir || 'failures',
      maxAge: config.maxAge || 7,
      maxCount: config.maxCount || 100,
      includeTimestamp: config.includeTimestamp !== false,
      includeBrowser: config.includeBrowser !== false,
      fullPage: config.fullPage || false
    };

    this.indexPath = path.join(this.config.baseDir, 'index.json');
    this.ensureDirectories();
    this.loadIndex();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: ScreenshotConfig): ScreenshotManager {
    if (!ScreenshotManager.instance) {
      ScreenshotManager.instance = new ScreenshotManager(config);
    }
    return ScreenshotManager.instance;
  }

  /**
   * 确保目录结构存在
   */
  private ensureDirectories(): void {
    const dirs = [
      this.config.baseDir,
      path.join(this.config.baseDir, this.config.failureDir),
      path.join(this.config.baseDir, 'temp')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * 加载截图索引
   */
  private loadIndex(): void {
    if (fs.existsSync(this.indexPath)) {
      try {
        const data = fs.readFileSync(this.indexPath, 'utf-8');
        this.index = JSON.parse(data);
      } catch (error) {
        console.warn('⚠️  无法加载截图索引，将创建新索引');
        this.index = [];
      }
    }
  }

  /**
   * 保存截图索引
   */
  private saveIndex(): void {
    try {
      fs.writeFileSync(
        this.indexPath,
        JSON.stringify(this.index, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('❌ 保存截图索引失败:', error);
    }
  }

  /**
   * 生成截图文件名
   * 
   * 格式: {testName}_{browser}_{timestamp}.png
   * 例如: promptlab-loading_chromium_20250122-143025.png
   */
  private generateFilename(metadata: ScreenshotMetadata): string {
    const parts: string[] = [];

    // 测试名称（清理特殊字符）
    const cleanTestName = metadata.testName
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    parts.push(cleanTestName);

    // 浏览器类型
    if (this.config.includeBrowser) {
      parts.push(metadata.browser);
    }

    // 时间戳
    if (this.config.includeTimestamp) {
      parts.push(metadata.timestamp);
    }

    return `${parts.join('_')}.png`;
  }

  /**
   * 捕获失败截图
   * 
   * @param page - Playwright Page 对象
   * @param testInfo - Playwright TestInfo 对象
   * @returns 截图文件路径
   */
  public async captureFailure(
    page: Page,
    testInfo: TestInfo
  ): Promise<string | null> {
    try {
      // 提取测试信息
      const metadata: ScreenshotMetadata = {
        testName: testInfo.title,
        testFile: path.relative(process.cwd(), testInfo.file),
        browser: testInfo.project.name,
        timestamp: this.formatTimestamp(new Date()),
        error: testInfo.error?.message,
        url: page.url(),
        viewport: page.viewportSize() || undefined
      };

      // 生成文件名和路径
      const filename = this.generateFilename(metadata);
      const screenshotPath = path.join(
        this.config.baseDir,
        this.config.failureDir,
        filename
      );

      // 捕获截图
      await page.screenshot({
        path: screenshotPath,
        fullPage: this.config.fullPage
      });

      // 获取文件大小
      const stats = fs.statSync(screenshotPath);

      // 添加到索引
      const entry: ScreenshotIndexEntry = {
        filename,
        path: screenshotPath,
        metadata,
        size: stats.size,
        createdAt: new Date()
      };

      this.index.push(entry);
      this.saveIndex();

      console.log(`📸 失败截图已保存: ${filename}`);

      return screenshotPath;
    } catch (error) {
      console.error('❌ 捕获失败截图时出错:', error);
      return null;
    }
  }

  /**
   * 格式化时间戳
   * 格式: YYYYMMDD-HHMMSS
   */
  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * 清理过期截图
   * 
   * 根据配置的 maxAge 和 maxCount 清理旧截图
   */
  public cleanup(): void {
    console.log('🧹 开始清理过期截图...');

    const now = Date.now();
    const maxAgeMs = this.config.maxAge * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    // 按时间排序（最新的在前）
    this.index.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 清理逻辑
    const toDelete: ScreenshotIndexEntry[] = [];

    this.index.forEach((entry, index) => {
      const age = now - new Date(entry.createdAt).getTime();
      const shouldDelete = 
        age > maxAgeMs ||                    // 超过最大保留时间
        index >= this.config.maxCount;       // 超过最大保留数量

      if (shouldDelete) {
        toDelete.push(entry);
      }
    });

    // 删除文件
    for (const entry of toDelete) {
      try {
        if (fs.existsSync(entry.path)) {
          fs.unlinkSync(entry.path);
          deletedCount++;
        }
        
        // 从索引中移除
        const indexPos = this.index.indexOf(entry);
        if (indexPos > -1) {
          this.index.splice(indexPos, 1);
        }
      } catch (error) {
        console.error(`❌ 删除截图失败: ${entry.filename}`, error);
      }
    }

    // 保存更新后的索引
    this.saveIndex();

    console.log(`✅ 清理完成，删除了 ${deletedCount} 个过期截图`);
    console.log(`📊 当前保留 ${this.index.length} 个截图`);
  }

  /**
   * 生成 HTML 索引页面
   * 
   * 创建一个可视化的截图浏览页面
   */
  public generateHtmlIndex(): void {
    const htmlPath = path.join(this.config.baseDir, 'index.html');
    const template = this.loadHtmlIndexTemplate();
    const html = this.populateHtmlIndexTemplate(template);

    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log(`📄 HTML 索引已生成: ${htmlPath}`);
  }

  private loadHtmlIndexTemplate(): string {
    const templateName = 'screenshot-index-template.html';
    const candidates: Array<string | URL> = [
      new URL(`./${templateName}`, import.meta.url),
      path.resolve(process.cwd(), 'tests/helpers', templateName)
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate, 'utf-8');
      }
    }

    throw new Error(`截图索引模板不存在: ${templateName}`);
  }

  private populateHtmlIndexTemplate(template: string): string {
    const replacements = [
      ['__SCREENSHOT_COUNT__', String(this.index.length)],
      ['__LAST_UPDATED__', new Date().toLocaleString('zh-CN')],
      [
        '__INITIAL_GRID__',
        this.index.length === 0
          ? this.generateEmptyState()
          : this.generateScreenshotCards()
      ],
      ['__SCREENSHOTS_JSON__', JSON.stringify(this.index)],
      ['__EMPTY_STATE__', this.generateEmptyState()]
    ];

    return replacements.reduce(
      (html, [token, value]) => html.split(token).join(value),
      template
    );
  }

  /**
   * 生成空状态 HTML
   */
  private generateEmptyState(): string {
    return `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3>暂无失败截图</h3>
        <p>所有测试都通过了！🎉</p>
      </div>
    `;
  }

  /**
   * 生成截图卡片 HTML
   */
  private generateScreenshotCards(): string {
    return this.index.map(entry => {
      const relativePath = path.relative(
        path.join(this.config.baseDir),
        entry.path
      ).replace(/\\/g, '/');

      return `
        <div class="screenshot-card">
          <img 
            class="screenshot-image" 
            src="${relativePath}" 
            alt="${entry.metadata.testName}"
            onclick="openModal('${relativePath}')"
          />
          <div class="screenshot-info">
            <div class="screenshot-title">${entry.metadata.testName}</div>
            <div class="screenshot-meta">
              <div>
                <span class="browser-badge browser-${entry.metadata.browser}">${entry.metadata.browser}</span>
                <span>${new Date(entry.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <div><strong>文件:</strong> ${entry.metadata.testFile}</div>
              <div><strong>URL:</strong> ${entry.metadata.url || 'N/A'}</div>
              <div><strong>大小:</strong> ${(entry.size / 1024).toFixed(2)} KB</div>
              ${entry.metadata.error ? `<div class="error-message">${entry.metadata.error}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    total: number;
    byBrowser: Record<string, number>;
    totalSize: number;
    oldestDate: Date | null;
    newestDate: Date | null;
  } {
    const stats = {
      total: this.index.length,
      byBrowser: {} as Record<string, number>,
      totalSize: 0,
      oldestDate: null as Date | null,
      newestDate: null as Date | null
    };

    for (const entry of this.index) {
      // 按浏览器统计
      const browser = entry.metadata.browser;
      stats.byBrowser[browser] = (stats.byBrowser[browser] || 0) + 1;

      // 总大小
      stats.totalSize += entry.size;

      // 日期范围
      const date = new Date(entry.createdAt);
      if (!stats.oldestDate || date < stats.oldestDate) {
        stats.oldestDate = date;
      }
      if (!stats.newestDate || date > stats.newestDate) {
        stats.newestDate = date;
      }
    }

    return stats;
  }

  /**
   * 打印统计信息
   */
  public printStats(): void {
    const stats = this.getStats();

    console.log('\n📊 截图统计信息:');
    console.log(`   总数: ${stats.total}`);
    console.log(`   总大小: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (stats.total > 0) {
      console.log('   按浏览器分布:');
      for (const [browser, count] of Object.entries(stats.byBrowser)) {
        console.log(`     - ${browser}: ${count}`);
      }
      
      if (stats.oldestDate && stats.newestDate) {
        console.log(`   时间范围: ${stats.oldestDate.toLocaleDateString()} - ${stats.newestDate.toLocaleDateString()}`);
      }
    }
    console.log('');
  }
}
