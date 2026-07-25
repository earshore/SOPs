/**
 * Browser download helpers (Blob → object URL → anchor click).
 * Guards document/URL for SSR and unit tests.
 */

export function downloadBlob(filename: string, data: BlobPart, mimeType: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }

  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadText(
  filename: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8'
): void {
  downloadBlob(filename, content, mimeType);
}

export function downloadJson(filename: string, content: string | unknown): void {
  const payload = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  downloadBlob(filename, payload, 'application/json');
}

export function downloadCsv(filename: string, content: string, options?: { bom?: boolean }): void {
  const bom = options?.bom !== false;
  const payload = bom ? `\uFEFF${content}` : content;
  downloadBlob(filename, payload, 'text/csv;charset=utf-8');
}
