/**
 * Clipboard helpers shared across modules.
 * Prefer the Clipboard API; fall back to a selection-preserving execCommand path.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue with the selection-based fallback below.
  }

  return copyTextWithSelectionFallback(text);
}

function copyTextWithSelectionFallback(text: string): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.className = 'sr-only';
  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const selectedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index))
    : [];

  textarea.select();

  let copied = false;
  try {
    if (typeof document.execCommand === 'function') {
      copied = document.execCommand('copy');
    }
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    if (selection) {
      selection.removeAllRanges();
      selectedRanges.forEach(range => selection.addRange(range));
    }
  }

  return copied;
}
