// tests/visual/image-comparator.ts
// ================================================================
// 🎨 图像对比工具
// 使用 pixelmatch 进行像素级图像对比
// ================================================================

import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 图像对比选项
 */
export interface ImageCompareOptions {
  /**
   * 差异阈值 (0-1)
   * 0 = 完全相同，1 = 完全不同
   * 默认: 0.1 (10%)
   */
  threshold?: number;

  /**
   * 是否包含抗锯齿像素
   * 默认: true
   */
  includeAA?: boolean;

  /**
   * 透明度阈值 (0-1)
   * 默认: 0.1
   */
  alpha?: number;

  /**
   * 抗锯齿检测阈值 (0-1)
   * 默认: 0.1
   */
  aaThreshold?: number;

  /**
   * 差异颜色 (RGBA)
   * 默认: [255, 0, 0] (红色)
   */
  diffColor?: [number, number, number];

  /**
   * 差异透明度 (0-1)
   * 默认: 1
   */
  diffColorAlt?: [number, number, number];

  /**
   * 是否生成差异图
   * 默认: true
   */
  generateDiffImage?: boolean;

  /**
   * 差异图输出路径
   */
  diffOutputPath?: string;
}

/**
 * 图像对比结果
 */
export interface ImageCompareResult {
  /**
   * 是否匹配（差异在阈值内）
   */
  match: boolean;

  /**
   * 差异像素数量
   */
  diffPixels: number;

  /**
   * 差异百分比 (0-100)
   */
  diffPercentage: number;

  /**
   * 总像素数
   */
  totalPixels: number;

  /**
   * 图像尺寸
   */
  dimensions: {
    width: number;
    height: number;
  };

  /**
   * 差异图路径（如果生成）
   */
  diffImagePath?: string;

  /**
   * 错误信息（如果有）
   */
  error?: string;
}

/**
 * 图像对比器类
 */
export class ImageComparator {
  private defaultOptions: Required<Omit<ImageCompareOptions, 'diffOutputPath'>> = {
    threshold: 0.1,
    includeAA: true,
    alpha: 0.1,
    aaThreshold: 0.1,
    diffColor: [255, 0, 0],
    diffColorAlt: [255, 255, 0],
    generateDiffImage: true
  };

  /**
   * 对比两张图像
   * 
   * @param baselinePath - 基准图路径
   * @param currentPath - 当前图路径
   * @param options - 对比选项
   * @returns 对比结果
   */
  async compare(
    baselinePath: string,
    currentPath: string,
    options: ImageCompareOptions = {}
  ): Promise<ImageCompareResult> {
    try {
      // 合并选项
      const opts = { ...this.defaultOptions, ...options };

      // 读取图像
      const baseline = await this.loadImage(baselinePath);
      const current = await this.loadImage(currentPath);

      // 检查尺寸是否一致
      if (baseline.width !== current.width || baseline.height !== current.height) {
        return {
          match: false,
          diffPixels: 0,
          diffPercentage: 100,
          totalPixels: baseline.width * baseline.height,
          dimensions: {
            width: baseline.width,
            height: baseline.height
          },
          error: `图像尺寸不匹配: 基准图 ${baseline.width}x${baseline.height}, 当前图 ${current.width}x${current.height}`
        };
      }

      const { width, height } = baseline;
      const totalPixels = width * height;

      // 创建差异图缓冲区
      const diff = opts.generateDiffImage ? new PNG({ width, height }) : null;

      // 执行像素对比
      const diffPixels = pixelmatch(
        baseline.data,
        current.data,
        diff?.data || null,
        width,
        height,
        {
          threshold: opts.threshold,
          includeAA: opts.includeAA,
          alpha: opts.alpha,
          aaColor: [opts.aaThreshold * 255, opts.aaThreshold * 255, opts.aaThreshold * 255] as [number, number, number],
          diffColor: opts.diffColor,
          diffColorAlt: opts.diffColorAlt
        }
      );

      // 计算差异百分比
      const diffPercentage = (diffPixels / totalPixels) * 100;

      // 生成差异图
      let diffImagePath: string | undefined;
      if (diff && opts.generateDiffImage && diffPixels > 0) {
        diffImagePath = opts.diffOutputPath || this.generateDiffPath(currentPath);
        await this.saveImage(diff, diffImagePath);
      }

      // 判断是否匹配（差异在阈值内）
      const match = diffPercentage <= opts.threshold * 100;

      return {
        match,
        diffPixels,
        diffPercentage: parseFloat(diffPercentage.toFixed(2)),
        totalPixels,
        dimensions: { width, height },
        diffImagePath
      };
    } catch (error) {
      return {
        match: false,
        diffPixels: 0,
        diffPercentage: 100,
        totalPixels: 0,
        dimensions: { width: 0, height: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 批量对比图像
   * 
   * @param comparisons - 对比任务列表
   * @returns 对比结果列表
   */
  async compareMultiple(
    comparisons: Array<{
      baseline: string;
      current: string;
      options?: ImageCompareOptions;
    }>
  ): Promise<ImageCompareResult[]> {
    const results: ImageCompareResult[] = [];

    for (const { baseline, current, options } of comparisons) {
      const result = await this.compare(baseline, current, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 加载 PNG 图像
   * 
   * @param imagePath - 图像路径
   * @returns PNG 对象
   */
  private async loadImage(imagePath: string): Promise<PNG> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(imagePath)) {
        reject(new Error(`图像文件不存在: ${imagePath}`));
        return;
      }

      const stream = fs.createReadStream(imagePath);
      const png = new PNG();

      stream
        .pipe(png)
        .on('parsed', function (this: PNG) {
          resolve(this);
        })
        .on('error', (error: Error) => {
          reject(new Error(`读取图像失败: ${error.message}`));
        });
    });
  }

  /**
   * 保存 PNG 图像
   * 
   * @param png - PNG 对象
   * @param outputPath - 输出路径
   */
  private async saveImage(png: PNG, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 确保输出目录存在
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(outputPath);

      png
        .pack()
        .pipe(stream)
        .on('finish', () => resolve())
        .on('error', (error: Error) => {
          reject(new Error(`保存图像失败: ${error.message}`));
        });
    });
  }

  /**
   * 生成差异图路径
   * 
   * @param currentPath - 当前图路径
   * @returns 差异图路径
   */
  private generateDiffPath(currentPath: string): string {
    const parsed = path.parse(currentPath);
    const diffDir = path.join(parsed.dir, 'diffs');
    
    if (!fs.existsSync(diffDir)) {
      fs.mkdirSync(diffDir, { recursive: true });
    }

    return path.join(diffDir, `${parsed.name}-diff${parsed.ext}`);
  }

  /**
   * 检查图像是否存在
   * 
   * @param imagePath - 图像路径
   * @returns 是否存在
   */
  imageExists(imagePath: string): boolean {
    return fs.existsSync(imagePath);
  }

  /**
   * 获取图像信息
   * 
   * @param imagePath - 图像路径
   * @returns 图像信息
   */
  async getImageInfo(imagePath: string): Promise<{
    width: number;
    height: number;
    size: number;
  }> {
    const png = await this.loadImage(imagePath);
    const stats = fs.statSync(imagePath);

    return {
      width: png.width,
      height: png.height,
      size: stats.size
    };
  }

  /**
   * 删除差异图
   * 
   * @param diffPath - 差异图路径
   */
  deleteDiffImage(diffPath: string): void {
    if (fs.existsSync(diffPath)) {
      fs.unlinkSync(diffPath);
    }
  }

  /**
   * 清理所有差异图
   * 
   * @param diffDir - 差异图目录
   */
  cleanupDiffImages(diffDir: string): void {
    if (fs.existsSync(diffDir)) {
      const files = fs.readdirSync(diffDir);
      for (const file of files) {
        if (file.endsWith('-diff.png')) {
          fs.unlinkSync(path.join(diffDir, file));
        }
      }
    }
  }
}

/**
 * 创建图像对比器实例
 */
export function createImageComparator(): ImageComparator {
  return new ImageComparator();
}

/**
 * 快速对比两张图像（使用默认选项）
 * 
 * @param baselinePath - 基准图路径
 * @param currentPath - 当前图路径
 * @returns 对比结果
 */
export async function compareImages(
  baselinePath: string,
  currentPath: string
): Promise<ImageCompareResult> {
  const comparator = createImageComparator();
  return comparator.compare(baselinePath, currentPath);
}
