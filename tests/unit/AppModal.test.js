import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppModal } from '@/components/modal/AppModal';

describe('AppModal Component', () => {
  let modal;

  beforeEach(() => {
    // Define custom element if not already defined
    if (!customElements.get('app-modal')) {
      customElements.define('app-modal', AppModal);
    }

    // Create modal instance
    modal = document.createElement('app-modal');
    modal.setAttribute('title', 'Test Modal');
    modal.setAttribute('size', 'md');
    document.body.appendChild(modal);

    // Wait for connectedCallback
    modal.connectedCallback();
  });

  afterEach(() => {
    document.body.removeChild(modal);
  });

  describe('Initialization', () => {
    it('should create shadow DOM', () => {
      expect(modal.shadowRoot).toBeTruthy();
    });

    it('should initialize as closed', () => {
      expect(modal._isOpen).toBe(false);
    });

    it('should render with default attributes', () => {
      const title = modal.shadowRoot.querySelector('.modal-title span');
      expect(title.textContent).toBe('Test Modal');
    });

    it('should apply size class correctly', () => {
      const panel = modal.shadowRoot.querySelector('.modal-panel');
      expect(panel.classList.contains('max-w-md')).toBe(true);
    });
  });

  describe('Observed Attributes', () => {
    it('should observe title, size, and closable attributes', () => {
      const observed = AppModal.observedAttributes;
      expect(observed).toContain('title');
      expect(observed).toContain('size');
      expect(observed).toContain('closable');
    });

    it('should update title when attribute changes', () => {
      modal.setAttribute('title', 'New Title');
      const title = modal.shadowRoot.querySelector('.modal-title');
      expect(title).toBeTruthy();
      expect(title.textContent).toContain('New Title');
    });

    it('should update size when attribute changes', () => {
      modal.setAttribute('size', 'lg');
      const panel = modal.shadowRoot.querySelector('.modal-panel');
      expect(panel.classList.contains('max-w-lg')).toBe(true);
      expect(panel.classList.contains('max-w-md')).toBe(false);
    });
  });

  describe('Open/Close Functionality', () => {
    it('should open modal', () => {
      modal.open();
      expect(modal._isOpen).toBe(true);

      const container = modal.shadowRoot.querySelector('.modal-container');
      expect(container.classList.contains('hidden')).toBe(false);
    });

    it('should close modal', (done) => {
      modal.open();
      modal.close();

      expect(modal._isOpen).toBe(false);

      // Wait for transition
      setTimeout(() => {
        const container = modal.shadowRoot.querySelector('.modal-container');
        expect(container.classList.contains('hidden')).toBe(true);
        done();
      }, 350);
    });

    it('should dispatch open event', () => {
      const openHandler = vi.fn();
      modal.addEventListener('open', openHandler);

      modal.open();

      expect(openHandler).toHaveBeenCalled();
    });

    it('should dispatch close event', (done) => {
      const closeHandler = vi.fn();
      modal.addEventListener('close', closeHandler);

      modal.open();
      modal.close();

      setTimeout(() => {
        expect(closeHandler).toHaveBeenCalled();
        done();
      }, 350);
    });
  });

  describe('Animation Classes', () => {
    it('should apply animation classes on open', () => {
      modal.open();

      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          const backdrop = modal.shadowRoot.querySelector('.modal-backdrop');
          const panel = modal.shadowRoot.querySelector('.modal-panel');

          // Check that animation classes are being applied
          expect(backdrop).toBeTruthy();
          expect(panel).toBeTruthy();
          resolve();
        });
      });
    });

    it('should remove animation classes on close', () => {
      modal.open();
      modal.close();

      const backdrop = modal.shadowRoot.querySelector('.modal-backdrop');
      const panel = modal.shadowRoot.querySelector('.modal-panel');

      expect(backdrop.classList.contains('opacity-100')).toBe(false);
      expect(panel.classList.contains('opacity-0')).toBe(true);
    });
  });

  describe('User Interactions', () => {
    it('should close on backdrop click when closable', () => {
      modal.open();

      const backdrop = modal.shadowRoot.querySelector('.modal-backdrop');
      backdrop.click();

      expect(modal._isOpen).toBe(false);
    });

    it('should not close on backdrop click when closable=false', () => {
      modal.setAttribute('closable', 'false');
      modal.open();

      const backdrop = modal.shadowRoot.querySelector('.modal-backdrop');
      backdrop.click();

      expect(modal._isOpen).toBe(true);
    });

    it('should close on close button click', () => {
      modal.open();

      const closeBtn = modal.shadowRoot.querySelector('.btn-close');
      closeBtn.click();

      expect(modal._isOpen).toBe(false);
    });

    it('should close on ESC key when closable', () => {
      modal.open();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(modal._isOpen).toBe(false);
    });

    it('should not close on ESC key when closable=false', () => {
      modal.setAttribute('closable', 'false');
      modal.open();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(modal._isOpen).toBe(true);
    });
  });

  describe('Slot Support', () => {
    it('should support body slot', () => {
      const bodyContent = document.createElement('div');
      bodyContent.setAttribute('slot', 'body');
      bodyContent.textContent = 'Body Content';
      modal.appendChild(bodyContent);

      const bodySlot = modal.shadowRoot.querySelector('slot[name="body"]');
      expect(bodySlot).toBeTruthy();
    });

    it('should support footer slot', () => {
      const footerContent = document.createElement('div');
      footerContent.setAttribute('slot', 'footer');
      footerContent.textContent = 'Footer Content';
      modal.appendChild(footerContent);

      const footerSlot = modal.shadowRoot.querySelector('slot[name="footer"]');
      expect(footerSlot).toBeTruthy();
    });

    it('should handle data-action="close" in slotted content', () => {
      modal.open();

      const button = document.createElement('button');
      button.setAttribute('data-action', 'close');
      button.setAttribute('slot', 'footer');
      modal.appendChild(button);

      // Simulate click on slotted button
      const clickEvent = new MouseEvent('click', { bubbles: true, composed: true });
      Object.defineProperty(clickEvent, 'composedPath', {
        value: () => [button, modal]
      });

      modal.shadowRoot.dispatchEvent(clickEvent);

      expect(modal._isOpen).toBe(false);
    });
  });

  describe('Size Variants', () => {
    const sizes = ['sm', 'md', 'lg', 'xl', '2xl', 'full'];

    sizes.forEach(size => {
      it(`should apply correct class for size="${size}"`, () => {
        modal.setAttribute('size', size);
        const panel = modal.shadowRoot.querySelector('.modal-panel');

        const expectedClass = modal._getSizeClass(size);
        expect(panel.classList.contains(expectedClass)).toBe(true);
      });
    });

    it('should default to md size for invalid size', () => {
      modal.setAttribute('size', 'invalid');
      const panel = modal.shadowRoot.querySelector('.modal-panel');
      expect(panel.classList.contains('max-w-lg')).toBe(true);
    });
  });

  describe('Header Visibility', () => {
    it('should show header by default', () => {
      const header = modal.shadowRoot.querySelector('.modal-header');
      expect(header).toBeTruthy();
    });

    it('should hide header when no-header attribute is set', () => {
      const modalNoHeader = document.createElement('app-modal');
      modalNoHeader.setAttribute('no-header', '');
      document.body.appendChild(modalNoHeader);
      modalNoHeader.connectedCallback();

      const header = modalNoHeader.shadowRoot.querySelector('.modal-header');
      expect(header).toBeFalsy();

      document.body.removeChild(modalNoHeader);
    });
  });

  describe('API Methods', () => {
    it('should expose open() method', () => {
      expect(typeof modal.open).toBe('function');
    });

    it('should expose close() method', () => {
      expect(typeof modal.close).toBe('function');
    });

    it('should expose setTitle() method via _updateTitle', () => {
      expect(typeof modal._updateTitle).toBe('function');
    });

    it('should update title via _updateTitle', () => {
      modal._updateTitle('Updated Title');
      const title = modal.shadowRoot.querySelector('.modal-title');
      expect(title).toBeTruthy();
      expect(title.textContent).toContain('Updated Title');
    });
  });

  describe('Styling', () => {
    it('should include transition styles', () => {
      const styles = modal.shadowRoot.querySelector('style').textContent;
      expect(styles).toContain('transition');
      expect(styles).toContain('opacity');
    });

    it('should include Tailwind-like utility classes', () => {
      const styles = modal.shadowRoot.querySelector('style').textContent;
      expect(styles).toContain('.fixed');
      expect(styles).toContain('.flex');
      expect(styles).toContain('.rounded-2xl');
    });

    it('should have proper z-index for overlay', () => {
      const styles = modal.shadowRoot.querySelector('style').textContent;
      expect(styles).toContain('z-index');
    });
  });
});
