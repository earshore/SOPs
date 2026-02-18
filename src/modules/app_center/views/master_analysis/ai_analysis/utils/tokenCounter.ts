/**
 * Token 计数工具
 * 用于估算 AI 提示词的 token 数量
 */

/**
 * 估算文本的 token 数量
 * 基于经验法则:
 * - 英文: 1 token ≈ 4 个字符
 * - 中文: 1 个汉字 ≈ 1.5-2 tokens (取平均值 1.75)
 * - 数字/符号: 按英文规则计算
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  // 分离中文字符和其他字符
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const chineseCount = chineseChars.length;
  
  // 其他字符(英文、数字、符号等)
  const otherCharsCount = text.length - chineseCount;
  
  // 计算 token 数量
  const chineseTokens = chineseCount * 1.75; // 中文字符
  const otherTokens = otherCharsCount / 4;   // 英文等字符
  
  return Math.ceil(chineseTokens + otherTokens);
}

/**
 * 格式化 token 数量显示
 * @param count token 数量
 * @returns 格式化后的字符串,如 "1.2K" 或 "850"
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

/**
 * 估算 token 成本(基于 GPT-4 定价)
 * @param tokenCount token 数量
 * @param model 模型类型
 * @returns 成本估算(美元)
 */
export function estimateTokenCost(tokenCount: number, model: 'gpt-4' | 'gpt-3.5' = 'gpt-4'): number {
  // GPT-4: $0.03 / 1K tokens (input)
  // GPT-3.5: $0.0015 / 1K tokens (input)
  const pricePerK = model === 'gpt-4' ? 0.03 : 0.0015;
  return (tokenCount / 1000) * pricePerK;
}

/**
 * 格式化成本显示
 * @param cost 成本(美元)
 * @returns 格式化后的字符串
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return '<$0.01';
  }
  return '$' + cost.toFixed(2);
}
