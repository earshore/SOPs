export function parseMetric(value: string): number {
  const cleaned = value.trim().replace(/["'%€$£¥\s]/g, '');
  if (!cleaned) return 0;

  const normalized = normalizeNumberString(cleaned);
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parsePercentageMetric(value: string, fallback: number): number {
  const rawValue = value.trim();
  if (!rawValue) return fallback;

  const parsed = parsePercentageNumber(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  if (rawValue.includes('%')) return parsed;
  if (parsed > 0 && parsed <= 1) return parsed * 100;
  return parsed;
}

export function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

export function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function parsePercentageNumber(value: string): number {
  const cleaned = value.trim().replace(/["'%€$£¥\s]/g, '');
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized = normalizeNumberString(cleaned);
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNumberString(value: string): string {
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return value.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
  }

  if (value.includes(',') && !value.includes('.')) {
    return normalizeSingleSeparatorNumber(value, ',');
  }

  if (value.includes('.') && !value.includes(',')) {
    return normalizeSingleSeparatorNumber(value, '.');
  }

  return value;
}

function normalizeSingleSeparatorNumber(value: string, separator: ',' | '.'): string {
  const parts = value.split(separator);
  if (parts.length > 2) return parts.join('');

  const integer = parts[0] || '';
  const fraction = parts[1] || '';
  if (fraction.length === 3 && integer.length <= 3) return parts.join('');
  if (separator === ',') return value.replace(',', '.');
  return value;
}
