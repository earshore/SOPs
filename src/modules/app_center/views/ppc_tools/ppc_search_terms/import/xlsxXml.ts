import { strFromU8 } from 'fflate';

export type XlsxZipFiles = Record<string, Uint8Array>;

export function getZipText(files: XlsxZipFiles, path: string): string | null {
  const file = files[path];
  return file ? strFromU8(file) : null;
}

export function parseXml(xml: string, fileName: string): Document {
  if (typeof DOMParser === 'undefined') {
    throw new Error('当前环境不支持 XLSX XML 解析');
  }

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error(`XLSX XML 解析失败: ${fileName}`);
  }
  return doc;
}
