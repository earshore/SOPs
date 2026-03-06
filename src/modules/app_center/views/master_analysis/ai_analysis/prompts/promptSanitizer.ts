/**
 * Prompt Injection 防护工具
 * 清洗用户输入数据，防止恶意内容干扰 AI 行为
 */

/**
 * 清洗文本，移除可能的 prompt injection 攻击向量
 */
export function sanitizePromptInput(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // 1. 移除可能的元指令关键词（常见的 prompt injection 模式）
  const dangerousPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /forget\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /new\s+instructions?:/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
  ];

  let sanitized = text;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  });

  // 2. 限制长度（防止超长输入导致 token 溢出）
  const MAX_LENGTH = 10000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH) + '... [TRUNCATED]';
  }

  // 3. 转义特殊字符（保护 prompt 模板结构）
  // 注意：不转义换行符，因为 reviews 需要保持格式
  sanitized = sanitized
    .replace(/\\/g, '\\\\')  // 转义反斜杠
    .replace(/`/g, '\\`');   // 转义反引号

  return sanitized;
}

/**
 * 批量清洗数组中的文本
 */
export function sanitizePromptInputArray(texts: string[]): string[] {
  if (!Array.isArray(texts)) {
    return [];
  }
  return texts.map(text => sanitizePromptInput(text));
}

/**
 * 清洗产品数据对象
 */
export function sanitizeProductData(product: {
  productTitle?: string;
  feature_bullets?: string[];
  customer_reviews?: Array<{
    headline?: string;
    body?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}): typeof product {
  return {
    ...product,
    productTitle: product.productTitle ? sanitizePromptInput(product.productTitle) : '',
    feature_bullets: product.feature_bullets ? sanitizePromptInputArray(product.feature_bullets) : [],
    customer_reviews: product.customer_reviews?.map(review => ({
      ...review,
      headline: review.headline ? sanitizePromptInput(review.headline) : '',
      body: review.body ? sanitizePromptInput(review.body) : '',
    })) || [],
  };
}

/**
 * 验证 AI 输出是否包含可疑内容
 */
export function validateAIOutput(output: string): { isValid: boolean; reason?: string } {
  if (!output || typeof output !== 'string') {
    return { isValid: false, reason: 'Empty or invalid output' };
  }

  // 检查是否包含元指令泄露
  const suspiciousPatterns = [
    /you are now/gi,
    /your new role is/gi,
    /system prompt/gi,
    /ignore previous/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(output)) {
      return {
        isValid: false,
        reason: `Output contains suspicious pattern: ${pattern.source}`
      };
    }
  }

  return { isValid: true };
}
