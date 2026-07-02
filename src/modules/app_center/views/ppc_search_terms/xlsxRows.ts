import { parseXml } from './xlsxXml';

export function parseWorksheetRows(sheetXml: string, sharedStrings: string[]): string[][] {
  const doc = parseXml(sheetXml, 'worksheet');
  return Array.from(doc.getElementsByTagName('row'))
    .map(row => parseWorksheetRow(row, sharedStrings))
    .filter(row => row.some(cell => cell.trim()));
}

export function rowsToDelimitedText(rows: string[][]): string {
  return rows.map(row => row.map(formatDelimitedCell).join('\t')).join('\n');
}

function parseWorksheetRow(row: Element, sharedStrings: string[]): string[] {
  const sparseCells: string[] = [];
  Array.from(row.getElementsByTagName('c')).forEach(cell => {
    const columnIndex = getColumnIndex(cell.getAttribute('r')) ?? sparseCells.length;
    sparseCells[columnIndex] = getCellText(cell, sharedStrings);
  });

  return Array.from({ length: sparseCells.length }, (_, index) => sparseCells[index] ?? '');
}

function getCellText(cell: Element, sharedStrings: string[]): string {
  const type = cell.getAttribute('t');
  if (type === 'inlineStr') {
    return Array.from(cell.getElementsByTagName('t'))
      .map(item => item.textContent ?? '')
      .join('');
  }

  const rawValue = cell.getElementsByTagName('v')[0]?.textContent ?? '';
  if (type === 's') {
    return sharedStrings[Number(rawValue)] ?? '';
  }
  if (type === 'b') {
    return rawValue === '1' ? 'TRUE' : 'FALSE';
  }
  return rawValue;
}

function getColumnIndex(cellRef: string | null): number | null {
  const letters = cellRef?.match(/^[A-Z]+/i)?.[0];
  if (!letters) {
    return null;
  }

  return (
    letters
      .toUpperCase()
      .split('')
      .reduce((column, letter) => column * 26 + letter.charCodeAt(0) - 64, 0) - 1
  );
}

function formatDelimitedCell(cell: string): string {
  if (!/[\t\r\n"]/.test(cell)) {
    return cell;
  }

  return `"${cell.replace(/"/g, '""')}"`;
}
