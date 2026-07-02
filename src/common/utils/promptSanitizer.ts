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
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  });

  const maxLength = 10000;
  if (sanitized.length > maxLength) {
    sanitized = `${sanitized.substring(0, maxLength)}... [TRUNCATED]`;
  }

  return sanitized
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`');
}
