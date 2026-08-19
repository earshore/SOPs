import { strFromU8 } from 'fflate';

import { SystemError, ValidationError } from '@/common/errors/AppError';

export type XlsxZipFiles = Record<string, Uint8Array>;

export function getZipText(files: XlsxZipFiles, path: string): string | null {
  const file = files[path];
  return file ? strFromU8(file) : null;
}

export function parseXml(xml: string, fileName: string): Document {
  if (typeof DOMParser === 'undefined') {
    throw new SystemError('当前环境不支持 XLSX XML 解析', 'PPC_XLSX_001', {
      module: 'ppc_search_terms',
      action: 'parseXml',
      fileName,
    });
  }

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new ValidationError(
      `XLSX XML 解析失败: ${fileName}`,
      'PPC_XLSX_002',
      'fileName',
      fileName,
      {
        module: 'ppc_search_terms',
        action: 'parseXml',
      }
    );
  }
  return doc;
}
