/**
 * 引用追踪器 - 查找和更新HTML ID、CSS类和data属性的所有引用
 */

import { readFileSync, writeFileSync } from 'fs';
import { Reference, ReferenceMap, ReferenceType } from '../types/index.js';

export class ReferenceTracker {
  private references: ReferenceMap = {
    ids: new Map(),
    classes: new Map(),
    dataAttrs: new Map(),
  };

  /**
   * 在文件中搜索指定值的引用
   */
  private searchInFile(
    filePath: string,
    searchValue: string,
    type: ReferenceType
  ): Reference[] {
    const references: Reference[] = [];
    
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // 根据类型使用不同的搜索模式
      const patterns = this.getSearchPatterns(searchValue, type);

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          if (pattern.test(line)) {
            references.push({
              filePath,
              line: index + 1,
              column: line.search(pattern),
              context: line.trim(),
              type,
            });
          }
        });
      });
    } catch (error) {
      console.warn(`无法读取文件 ${filePath}:`, error);
    }

    return references;
  }

  /**
   * 获取搜索模式
   */
  private getSearchPatterns(value: string, type: ReferenceType): RegExp[] {
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    switch (type) {
      case 'id':
        return [
          // HTML: id="value"
          new RegExp(`id=["']${escapedValue}["']`, 'g'),
          // JavaScript: getElementById('value')
          new RegExp(`getElementById\\s*\\(\\s*["'\`]${escapedValue}["'\`]\\s*\\)`, 'g'),
          // JavaScript: querySelector('#value')
          new RegExp(`querySelector\\s*\\(\\s*["'\`]#${escapedValue}["'\`]\\s*\\)`, 'g'),
          // CSS: #value
          new RegExp(`#${escapedValue}\\b`, 'g'),
          // HTML: href="#value"
          new RegExp(`href=["']#${escapedValue}["']`, 'g'),
        ];

      case 'class':
        return [
          // HTML: class="... value ..."
          new RegExp(`class=["'][^"']*\\b${escapedValue}\\b[^"']*["']`, 'g'),
          // JavaScript: classList.add('value')
          new RegExp(`classList\\.(add|remove|toggle|contains)\\s*\\(\\s*["'\`]${escapedValue}["'\`]\\s*\\)`, 'g'),
          // CSS: .value
          new RegExp(`\\.${escapedValue}\\b`, 'g'),
        ];

      case 'data-attr':
        return [
          // HTML: data-attr="value"
          new RegExp(`${escapedValue}=["'][^"']*["']`, 'g'),
          // JavaScript: dataset.attr
          new RegExp(`dataset\\.${escapedValue.replace('data-', '')}`, 'g'),
          // JavaScript: getAttribute('data-attr')
          new RegExp(`getAttribute\\s*\\(\\s*["'\`]${escapedValue}["'\`]\\s*\\)`, 'g'),
        ];

      default:
        return [];
    }
  }

  /**
   * 查找ID的所有引用
   */
  findIdReferences(id: string, files: string[]): Reference[] {
    const references: Reference[] = [];

    for (const file of files) {
      const fileRefs = this.searchInFile(file, id, 'id');
      references.push(...fileRefs);
    }

    this.references.ids.set(id, references);
    return references;
  }

  /**
   * 查找CSS类的所有引用
   */
  findClassReferences(className: string, files: string[]): Reference[] {
    const references: Reference[] = [];

    for (const file of files) {
      const fileRefs = this.searchInFile(file, className, 'class');
      references.push(...fileRefs);
    }

    this.references.classes.set(className, references);
    return references;
  }

  /**
   * 查找data属性的所有引用
   */
  findDataAttrReferences(attrName: string, files: string[]): Reference[] {
    const references: Reference[] = [];

    for (const file of files) {
      const fileRefs = this.searchInFile(file, attrName, 'data-attr');
      references.push(...fileRefs);
    }

    this.references.dataAttrs.set(attrName, references);
    return references;
  }

  /**
   * 更新文件中的引用
   */
  updateReferences(
    oldValue: string,
    newValue: string,
    type: ReferenceType,
    filePath: string
  ): boolean {
    try {
      let content = readFileSync(filePath, 'utf-8');
      const patterns = this.getSearchPatterns(oldValue, type);
      
      // 根据类型进行替换
      patterns.forEach(pattern => {
        content = content.replace(pattern, (match) => {
          return match.replace(oldValue, newValue);
        });
      });

      writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error(`更新文件 ${filePath} 失败:`, error);
      return false;
    }
  }

  /**
   * 获取所有引用
   */
  getAllReferences(): ReferenceMap {
    return this.references;
  }

  /**
   * 清空引用缓存
   */
  clearReferences(): void {
    this.references = {
      ids: new Map(),
      classes: new Map(),
      dataAttrs: new Map(),
    };
  }
}
