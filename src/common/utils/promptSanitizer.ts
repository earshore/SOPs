/**
 * Sanitizes user-controlled text before embedding it into LLM prompts.
 */
export function sanitizePromptInput(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

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

  const maxLength = 10000;
  if (sanitized.length > maxLength) {
    sanitized = `${sanitized.substring(0, maxLength)}... [TRUNCATED]`;
  }

  return sanitized.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

/**
 * Sanitizes every string item in an array before prompt interpolation.
 */
export function sanitizePromptInputArray(texts: string[]): string[] {
  if (!Array.isArray(texts)) {
    return [];
  }

  return texts.map(text => sanitizePromptInput(text));
}

/**
 * Sanitizes the product fields commonly embedded into LLM prompts.
 */
export function sanitizeProductData<
  T extends {
    productTitle?: string;
    feature_bullets?: string[];
    customer_reviews?: Array<{
      headline?: string;
      body?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  },
>(
  product: T
): T & {
  productTitle: string;
  feature_bullets: string[];
  customer_reviews: Array<{
    headline: string;
    body: string;
    [key: string]: unknown;
  }>;
} {
  return {
    ...product,
    productTitle: product.productTitle ? sanitizePromptInput(product.productTitle) : '',
    feature_bullets: product.feature_bullets
      ? sanitizePromptInputArray(product.feature_bullets)
      : [],
    customer_reviews:
      product.customer_reviews?.map(review => ({
        ...review,
        headline: review.headline ? sanitizePromptInput(review.headline) : '',
        body: review.body ? sanitizePromptInput(review.body) : '',
      })) || [],
  };
}

/**
 * Flags suspicious model output that appears to leak or rewrite instructions.
 */
export function validateAIOutput(output: string): { isValid: boolean; reason?: string } {
  if (!output || typeof output !== 'string') {
    return { isValid: false, reason: 'Empty or invalid output' };
  }

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
        reason: `Output contains suspicious pattern: ${pattern.source}`,
      };
    }
  }

  return { isValid: true };
}
