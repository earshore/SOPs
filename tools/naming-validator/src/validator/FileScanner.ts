/**
 * 文件扫描器
 * 负责递归扫描目录，识别HTML和CSS文件
 */

import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';

/**
 * 扫描选项
 */
export interface ScanOptions {
  include: string[];
  exclude: string[];
  rootDir: string;
}

/**
 * 扫描结果
 */
export interface ScanResult {
  htmlFiles: string[];
  cssFiles: string[];
  totalFiles: number;
}

/**
 * 文件扫描器类
 */
export class FileScanner {
  /**
   * 扫描目录，返回匹配的HTML和CSS文件
   * @param options 扫描选项
   * @returns 扫描结果
   */
  async scan(options: ScanOptions): Promise<ScanResult> {
    const htmlFiles: string[] = [];
    const cssFiles: string[] = [];

    await this.scanDirectory(options.rootDir, options, htmlFiles, cssFiles);

    return {
      htmlFiles,
      cssFiles,
      totalFiles: htmlFiles.length + cssFiles.length,
    };
  }

  /**
   * 递归扫描目录
   * @param dirPath 目录路径
   * @param options 扫描选项
   * @param htmlFiles HTML文件列表
   * @param cssFiles CSS文件列表
   */
  private async scanDirectory(
    dirPath: string,
    options: ScanOptions,
    htmlFiles: string[],
    cssFiles: string[]
  ): Promise<void> {
    let entries: fs.Dirent[];
    
    try {
      entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
      // 忽略无法读取的目录
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(options.rootDir, fullPath);

      // 检查是否应该排除
      if (this.shouldExclude(relativePath, options.exclude)) {
        continue;
      }

      if (entry.isDirectory()) {
        // 递归扫描子目录
        await this.scanDirectory(fullPath, options, htmlFiles, cssFiles);
      } else if (entry.isFile()) {
        // 检查是否应该包含
        if (this.shouldInclude(relativePath, options.include)) {
          const ext = path.extname(entry.name).toLowerCase();
          
          if (ext === '.html') {
            htmlFiles.push(fullPath);
          } else if (ext === '.css') {
            cssFiles.push(fullPath);
          }
        }
      }
    }
  }

  /**
   * 检查文件是否应该包含
   * @param relativePath 相对路径
   * @param includePatterns 包含模式
   * @returns 是否应该包含
   */
  private shouldInclude(relativePath: string, includePatterns: string[]): boolean {
    if (includePatterns.length === 0) {
      return true;
    }

    return includePatterns.some(pattern => 
      minimatch(relativePath, pattern, { dot: true })
    );
  }

  /**
   * 检查文件是否应该排除
   * @param relativePath 相对路径
   * @param excludePatterns 排除模式
   * @returns 是否应该排除
   */
  private shouldExclude(relativePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => 
      minimatch(relativePath, pattern, { dot: true })
    );
  }
}
