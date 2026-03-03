/**
 * 备份管理器 - 管理文件备份和回滚
 */

import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';

export class BackupManager {
  private backupRoot: string;

  constructor(backupRoot: string = '.naming-backup') {
    this.backupRoot = backupRoot;
  }

  /**
   * 创建备份
   */
  createBackup(files: string[], projectRoot: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = join(projectRoot, this.backupRoot, timestamp);

    // 创建备份目录
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // 复制文件
    for (const file of files) {
      const relativePath = relative(projectRoot, file);
      const backupPath = join(backupDir, relativePath);
      const backupDirPath = dirname(backupPath);

      // 确保目标目录存在
      if (!existsSync(backupDirPath)) {
        mkdirSync(backupDirPath, { recursive: true });
      }

      // 复制文件
      try {
        copyFileSync(file, backupPath);
      } catch (error) {
        console.error(`备份文件失败 ${file}:`, error);
      }
    }

    console.log(`✅ 备份已创建: ${backupDir}`);
    return backupDir;
  }

  /**
   * 回滚备份
   */
  rollback(backupDir: string, projectRoot: string): boolean {
    if (!existsSync(backupDir)) {
      console.error(`备份目录不存在: ${backupDir}`);
      return false;
    }

    try {
      // 递归恢复文件
      this.restoreDirectory(backupDir, projectRoot, backupDir);
      console.log(`✅ 已从备份恢复: ${backupDir}`);
      return true;
    } catch (error) {
      console.error('回滚失败:', error);
      return false;
    }
  }

  /**
   * 递归恢复目录
   */
  private restoreDirectory(
    backupDir: string,
    projectRoot: string,
    backupRoot: string
  ): void {
    const entries = readdirSync(backupDir);

    for (const entry of entries) {
      const backupPath = join(backupDir, entry);
      const stat = statSync(backupPath);

      if (stat.isDirectory()) {
        this.restoreDirectory(backupPath, projectRoot, backupRoot);
      } else {
        // 计算原始文件路径
        const relativePath = relative(backupRoot, backupPath);
        const originalPath = join(projectRoot, relativePath);
        const originalDir = dirname(originalPath);

        // 确保目标目录存在
        if (!existsSync(originalDir)) {
          mkdirSync(originalDir, { recursive: true });
        }

        // 恢复文件
        copyFileSync(backupPath, originalPath);
      }
    }
  }

  /**
   * 列出所有备份
   */
  listBackups(projectRoot: string): string[] {
    const backupPath = join(projectRoot, this.backupRoot);

    if (!existsSync(backupPath)) {
      return [];
    }

    return readdirSync(backupPath)
      .filter(name => {
        const fullPath = join(backupPath, name);
        return statSync(fullPath).isDirectory();
      })
      .sort()
      .reverse(); // 最新的在前
  }
}
