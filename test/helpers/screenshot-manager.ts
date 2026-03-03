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

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>失败截图索引</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px;
    }
    
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    
    .stats {
      color: #666;
      margin-bottom: 30px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    
    .stats span {
      margin-right: 20px;
    }
    
    .filters {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .filters input,
    .filters select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .screenshot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    
    .screenshot-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .screenshot-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .screenshot-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: #f0f0f0;
      cursor: pointer;
    }
    
    .screenshot-info {
      padding: 15px;
    }
    
    .screenshot-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    .screenshot-meta {
      font-size: 12px;
      color: #666;
      line-height: 1.6;
    }
    
    .screenshot-meta div {
      margin-bottom: 4px;
    }
    
    .browser-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      margin-right: 5px;
    }
    
    .browser-chromium { background: #4285f4; color: white; }
    .browser-firefox { background: #ff7139; color: white; }
    .browser-webkit { background: #147efb; color: white; }
    
    .error-message {
      margin-top: 8px;
      padding: 8px;
      background: #fff3cd;
      border-left: 3px solid #ffc107;
      font-size: 12px;
      color: #856404;
      border-radius: 3px;
    }
    
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    
    .modal.active {
      display: flex;
    }
    
    .modal-content {
      max-width: 90%;
      max-height: 90%;
      position: relative;
    }
    
    .modal-image {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
    }
    
    .modal-close {
      position: absolute;
      top: -40px;
      right: 0;
      color: white;
      font-size: 30px;
      cursor: pointer;
      background: none;
      border: none;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }
    
    .empty-state svg {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
      opacity: 0.3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📸 失败截图索引</h1>
    <div class="stats">
      <span><strong>总数:</strong> ${this.index.length}</span>
      <span><strong>最后更新:</strong> ${new Date().toLocaleString('zh-CN')}</span>
    </div>
    
    <div class="filters">
      <input type="text" id="searchInput" placeholder="搜索测试名称..." />
      <select id="browserFilter">
        <option value="">所有浏览器</option>
        <option value="chromium">Chromium</option>
        <option value="firefox">Firefox</option>
        <option value="webkit">WebKit</option>
      </select>
      <select id="sortBy">
        <option value="newest">最新优先</option>
        <option value="oldest">最旧优先</option>
        <option value="name">名称排序</option>
      </select>
    </div>
    
    <div class="screenshot-grid" id="screenshotGrid">
      ${this.index.length === 0 ? this.generateEmptyState() : this.generateScreenshotCards()}
    </div>
  </div>
  
  <div class="modal" id="modal">
    <div class="modal-content">
      <button class="modal-close" onclick="closeModal()">&times;</button>
      <img class="modal-image" id="modalImage" src="" alt="截图预览" />
    </div>
  </div>
  
  <script>
    const screenshots = ${JSON.stringify(this.index)};
    
    function renderScreenshots(filtered) {
      const grid = document.getElementById('screenshotGrid');
      
      if (filtered.length === 0) {
        grid.innerHTML = \`${this.generateEmptyState()}\`;
        return;
      }
      
      grid.innerHTML = filtered.map(entry => \`
        <div class="screenshot-card">
          <img 
            class="screenshot-image" 
            src="\${entry.path.replace(/\\\\/g, '/')}" 
            alt="\${entry.metadata.testName}"
            onclick="openModal('\${entry.path.replace(/\\\\/g, '/')}')"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\'%3E%3Crect fill=\\'%23f0f0f0\\' width=\\'100\\' height=\\'100\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\'%3E无法加载%3C/text%3E%3C/svg%3E'"
          />
          <div class="screenshot-info">
            <div class="screenshot-title">\${entry.metadata.testName}</div>
            <div class="screenshot-meta">
              <div>
                <span class="browser-badge browser-\${entry.metadata.browser}">\${entry.metadata.browser}</span>
                <span>\${new Date(entry.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <div><strong>文件:</strong> \${entry.metadata.testFile}</div>
              <div><strong>URL:</strong> \${entry.metadata.url || 'N/A'}</div>
              <div><strong>大小:</strong> \${(entry.size / 1024).toFixed(2)} KB</div>
              \${entry.metadata.error ? \`<div class="error-message">\${entry.metadata.error}</div>\` : ''}
            </div>
          </div>
        </div>
      \`).join('');
    }
    
    function filterAndSort() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      const browserFilter = document.getElementById('browserFilter').value;
      const sortBy = document.getElementById('sortBy').value;
      
      let filtered = screenshots.filter(entry => {
        const matchesSearch = entry.metadata.testName.toLowerCase().includes(searchTerm) ||
                             entry.metadata.testFile.toLowerCase().includes(searchTerm);
        const matchesBrowser = !browserFilter || entry.metadata.browser === browserFilter;
        return matchesSearch && matchesBrowser;
      });
      
      filtered.sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else {
          return a.metadata.testName.localeCompare(b.metadata.testName);
        }
      });
      
      renderScreenshots(filtered);
    }
    
    function openModal(imagePath) {
      document.getElementById('modalImage').src = imagePath;
      document.getElementById('modal').classList.add('active');
    }
    
    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }
    
    document.getElementById('searchInput').addEventListener('input', filterAndSort);
    document.getElementById('browserFilter').addEventListener('change', filterAndSort);
    document.getElementById('sortBy').addEventListener('change', filterAndSort);
    document.getElementById('modal').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
    
    // 初始渲染
    renderScreenshots(screenshots);
  </script>
</body>
</html>`;

    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log(`📄 HTML 索引已生成: ${htmlPath}`);
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
