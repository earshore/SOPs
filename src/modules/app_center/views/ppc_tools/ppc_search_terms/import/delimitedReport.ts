import { ValidationError } from '@/common/errors/AppError';

import { assertReportRowLimit } from '../analysis/reportLimits';

export type RawRecord = Record<string, string>;

export interface ParsedReport {
  headers: string[];
  records: RawRecord[];
}

export function parseReport(text: string): ParsedReport {
  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text, delimiter).filter(row => row.some(cell => cell.trim()));
  assertReportRowLimit(Math.max(0, rows.length - 1));
  const headerRow = rows[0];
  if (!headerRow || headerRow.length < 2) {
    throw new ValidationError(
      '未识别到表头，请确认首行包含列名',
      'PPC_IMPORT_003',
      'headers',
      headerRow,
      { module: 'ppc_search_terms', action: 'parseReport' }
    );
  }

  const headers = headerRow.map((header, index) => header.trim() || `column_${index + 1}`);
  const records = rows.slice(1).map(row => rowToRecord(headers, row));
  return { headers, records };
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find(line => line.trim()) || '';
  const candidates = [',', '\t', ';'];
  return (
    candidates
      .map(delimiter => ({ delimiter, count: firstLine.split(delimiter).length }))
      .sort((a, b) => b.count - a.count)[0]?.delimiter || ','
  );
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] || '';
    const next = text[index + 1] || '';

    if (isEscapedQuote(char, next, inQuotes)) {
      cell += '"';
      index += 1;
      continue;
    }

    if (isQuote(char)) {
      inQuotes = !inQuotes;
      continue;
    }

    if (isDelimiter(char, delimiter, inQuotes)) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (isRowBreak(char, next, inQuotes)) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && next === '\n') index += 1;
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function isEscapedQuote(char: string, next: string, inQuotes: boolean): boolean {
  return char === '"' && inQuotes && next === '"';
}

function isQuote(char: string): boolean {
  return char === '"';
}

function isDelimiter(char: string, delimiter: string, inQuotes: boolean): boolean {
  return char === delimiter && !inQuotes;
}

function isRowBreak(char: string, next: string, inQuotes: boolean): boolean {
  return isLineBreak(char, next) && !inQuotes;
}

function isLineBreak(char: string, next: string): boolean {
  return char === '\n' || (char === '\r' && next === '\n') || char === '\r';
}

function rowToRecord(headers: string[], row: string[]): RawRecord {
  return headers.reduce<RawRecord>((record, header, index) => {
    record[header] = row[index]?.trim() || '';
    return record;
  }, {});
}
