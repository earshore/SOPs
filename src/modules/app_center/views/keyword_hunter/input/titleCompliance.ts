export interface ExtractedListingTitle {
  status: 'found' | 'not_found';
  title: string;
  marker?: string;
}

/**
 * Extracts the product-title value from common Listing output headings.
 * The caller must treat `not_found` as an explicit unknown state; an empty
 * title must never be passed to a compliance checker as if it were valid.
 */
export function extractListingTitle(text: string): ExtractedListingTitle {
  if (!text.trim()) return { status: 'not_found', title: '' };

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const match = line.match(
      /^\s*(?:#{1,6}\s+)?(?:\d+[.、)．]\s*)?(?:\*{1,2}|_{1,2})?(Title|Titel)(?:\*{1,2}|_{1,2})?(?=\s|[:：]|$)\s*(?::|：)?\s*(.*)$/i
    );
    if (!match) continue;

    let title = cleanExtractedTitle(match[2] ?? '');
    if (!title) {
      title = cleanExtractedTitle(lines[index + 1] ?? '');
    }
    if (!title) return { status: 'not_found', title: '', marker: match[1] };

    return { status: 'found', title, marker: match[1] };
  }

  return { status: 'not_found', title: '' };
}

function cleanExtractedTitle(value: string): string {
  return value
    .replace(/^\s*(?:#{1,6}\s+)?/, '')
    .replace(/^\s*(?:\*{1,2}|_{1,2})/, '')
    .replace(/(?:\*{1,2}|_{1,2})\s*$/, '')
    .trim();
}
