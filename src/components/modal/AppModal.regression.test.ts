import { afterEach, describe, expect, it } from 'vitest';
import { AppModal } from './AppModal';

describe('AppModal regression', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('preserves shadow styles when rendering a closed no-header modal', () => {
    if (!customElements.get('app-modal')) {
      customElements.define('app-modal', AppModal);
    }

    const modal = document.createElement('app-modal');
    modal.setAttribute('no-header', '');

    const body = document.createElement('div');
    body.slot = 'body';
    body.textContent = 'This content must stay hidden while the modal is closed';
    modal.appendChild(body);

    document.body.appendChild(modal);

    const style = modal.shadowRoot?.querySelector('style');
    const container = modal.shadowRoot?.querySelector('.modal-container');

    expect(style).toBeInstanceOf(HTMLStyleElement);
    expect(style?.textContent).toContain('.hidden');
    expect(container).toBeInstanceOf(HTMLElement);
    expect(container?.classList.contains('hidden')).toBe(true);
  });
});
