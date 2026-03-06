/**
 * 技术规格工具函数
 * 用于识别和处理技术规格相关的文本模式
 */

/**
 * 判断文本是否为技术规格
 *
 * 检测以下模式：
 * - 数字 + 单位 (如: 50ml, 100g, 1.7oz)
 * - 数字 + 百分号 (如: 95%, 50%)
 * - 数字范围 (如: 10-20, 5~10)
 * - 小数 (如: 1.5, 3.14)
 * - 尺寸规格 (如: 10x5x3, 20×15)
 *
 * @param text 待检测的文本
 * @returns true 如果文本包含技术规格模式
 */
export function isTechnicalSpec(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // 模式 1: 数字 + 单位
  const hasNumberWithUnit = /\d+\s*[a-zA-Z]+/.test(text);

  // 模式 2: 数字 + 百分号
  const hasPercentage = /\d+\s*%/.test(text);

  // 模式 3: 数字范围
  const hasRange = /\d+\s*[-~x]\s*\d+/i.test(text);

  // 模式 4: 小数
  const hasDecimal = /\d+\.\d+/.test(text);

  // 模式 5: 尺寸规格
  const hasDimension = /\d+\s*[x×]\s*\d+/.test(text);

  return hasNumberWithUnit || hasPercentage || hasRange || hasDecimal || hasDimension;
}
