/**
 * Shared CSV helpers (authoritative sanitize/escape rules from PPC export).
 */

const NUMBER_LIKE = /^-?\d(?:[\d.,%€$£¥\s]*)$/;

export function sanitizeCsvCell(value: string): string {
  const trimmed = value.trimStart();
  if (!trimmed) return value;
  if (/^[=+@]/.test(trimmed)) return `'${value}`;
  if (trimmed.startsWith('-') && !NUMBER_LIKE.test(trimmed)) return `'${value}`;
  return value;
}

export function escapeCsvCell(
  value: string | number,
  options?: { allowFormula?: boolean }
): string {
  const raw = String(value);
  const safeValue = options?.allowFormula ? raw : sanitizeCsvCell(raw);
  if (!/[",\n]/.test(safeValue)) return safeValue;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function formatCsvRows(
  rows: Array<Array<string | number>>,
  options?: { allowFormula?: boolean }
): string {
  return rows.map(row => row.map(cell => escapeCsvCell(cell, options)).join(',')).join('\n');
}
