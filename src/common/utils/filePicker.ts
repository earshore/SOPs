/**
 * Opens a file input while the caller is still inside the user's click event.
 * `showPicker` is preferred in supporting browsers; `click` keeps older browsers working.
 */
export function openFilePicker(input: HTMLInputElement | null): boolean {
  if (!input) return false;

  input.value = '';

  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return true;
    } catch {
      // Embedded or older browser runtimes can reject showPicker; use the legacy path below.
    }
  }

  try {
    input.click();
    return true;
  } catch {
    return false;
  }
}
