import { ValidationError } from '@/common/errors/AppError';
import { getZipText, parseXml, type XlsxZipFiles } from './xlsxXml';

export function getFirstWorksheetPath(files: XlsxZipFiles): string {
  const workbookXml = getZipText(files, 'xl/workbook.xml');
  if (!workbookXml) {
    throw new ValidationError('XLSX 文件没有可读取的工作簿', 'PPC_XLSX_003', 'workbook', null, {
      module: 'ppc_search_terms',
      action: 'getFirstWorksheetPath',
    });
  }

  const workbook = parseXml(workbookXml, 'xl/workbook.xml');
  const firstSheet = Array.from(workbook.getElementsByTagName('sheet'))[0];
  if (!firstSheet) {
    throw new ValidationError('XLSX 文件没有可读取的工作表', 'PPC_XLSX_004', 'sheet', null, {
      module: 'ppc_search_terms',
      action: 'getFirstWorksheetPath',
    });
  }

  const relationId = firstSheet.getAttribute('r:id');
  if (!relationId) {
    return 'xl/worksheets/sheet1.xml';
  }

  const relationsXml = getZipText(files, 'xl/_rels/workbook.xml.rels');
  if (!relationsXml) {
    return 'xl/worksheets/sheet1.xml';
  }

  const relations = parseXml(relationsXml, 'xl/_rels/workbook.xml.rels');
  const relation = Array.from(relations.getElementsByTagName('Relationship')).find(
    item => item.getAttribute('Id') === relationId
  );
  const target = relation?.getAttribute('Target');
  if (!target) {
    return 'xl/worksheets/sheet1.xml';
  }

  return resolveWorkbookTarget(target);
}

export function parseSharedStrings(files: XlsxZipFiles): string[] {
  const sharedStringsXml = getZipText(files, 'xl/sharedStrings.xml');
  if (!sharedStringsXml) {
    return [];
  }

  const doc = parseXml(sharedStringsXml, 'xl/sharedStrings.xml');
  return Array.from(doc.getElementsByTagName('si')).map(item => item.textContent ?? '');
}

function resolveWorkbookTarget(target: string): string {
  const normalized = target.replace(/\\/g, '/');
  if (normalized.startsWith('/')) {
    return normalized.slice(1);
  }
  if (normalized.startsWith('xl/')) {
    return normalized;
  }
  return `xl/${normalized}`;
}
