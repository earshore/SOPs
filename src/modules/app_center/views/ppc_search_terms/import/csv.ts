export function formatCsvRows(rows: string[][]): string {
  return rows.map(row => row.map(escapeCsv).join(',')).join('\n');
}

function escapeCsv(value: string): string {
  const safeValue = sanitizeCsvCell(value);
  if (!/[",\n]/.test(safeValue)) return safeValue;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function sanitizeCsvCell(value: string): string {
  const trimmed = value.trimStart();
  if (!trimmed) return value;
  if (/^[=+@]/.test(trimmed)) return `'${value}`;
  if (trimmed.startsWith('-') && !/^-?\d(?:[\d.,%€$£¥\s]*)$/.test(trimmed)) return `'${value}`;
  return value;
}
