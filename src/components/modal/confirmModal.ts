import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { StorageService } from '@/services/storageService';
import './confirmModal.css';

interface ConfirmModalRequest {
  title: string;
  content: string;
  ignoreKey: string;
  confirmLabel: string;
  isDestructive: boolean;
  resolve: (result: boolean) => void;
}

interface ConfirmModalElements {
  backdrop: HTMLDivElement;
  btnConfirm: HTMLButtonElement | null;
  btnCancel: HTMLButtonElement | null;
  dontAskCheckbox: HTMLInputElement | null;
}

interface ConfirmModalHandlers {
  handleConfirm: (event: Event) => void;
  handleCancel: (event: Event) => void;
  handleBackdropClick: (event: MouseEvent) => void;
  handleEscape: (event: KeyboardEvent) => void;
}

function getIgnoreKey(storageKey: string): string {
  const trimmedStorageKey = storageKey.trim();
  return trimmedStorageKey ? `modal_ignore_${trimmedStorageKey}` : '';
}

function getPreviousActiveElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function createBackdrop(modalId: string): HTMLDivElement {
  const backdrop = document.createElement('div');
  backdrop.id = modalId;
  backdrop.className =
    'app-confirm-modal-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center fade-in';
  return backdrop;
}

function buildDontAskMarkup(modalId: string, ignoreKey: string): string {
  if (!ignoreKey) return '';

  return `
        <label class="flex items-center gap-2 text-xs text-slate-500 mb-4 cursor-pointer">
            <input type="checkbox" id="dont-ask-again-${modalId}" class="app-confirm-modal-checkbox rounded border-slate-300">
            <span>不再提示</span>
        </label>
    `;
}

function buildDialogShell(options: {
  modalId: string;
  title: string;
  descriptionHtml: string;
  isDestructive: boolean;
  bodyExtraHtml?: string;
  actionsHtml: string;
  descriptionClass?: string;
  actionsClass?: string;
  renderer: SafeRenderer;
}): string {
  const titleId = `${options.modalId}-title`;
  const descriptionId = `${options.modalId}-description`;
  const variantClass = options.isDestructive
    ? 'app-confirm-modal--danger'
    : 'app-confirm-modal--theme';
  const iconClass = options.isDestructive
    ? 'fas fa-exclamation-triangle'
    : 'fas fa-circle-question';
  const descriptionClass = options.descriptionClass || 'text-slate-600 text-sm mb-4';
  const actionsClass = options.actionsClass || 'flex justify-end gap-3';

  return `
        <div class="app-confirm-modal ${variantClass} bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition"
            role="dialog"
            aria-modal="true"
            aria-labelledby="${titleId}"
            aria-describedby="${descriptionId}">
            <div class="app-confirm-modal-header p-5 text-white">
                <h3 id="${titleId}" class="text-lg font-bold flex items-center gap-2">
                    <i class="${iconClass}" aria-hidden="true"></i>
                    ${options.renderer.escapeHtml(options.title)}
                </h3>
            </div>

            <div class="p-6">
                <p id="${descriptionId}" class="${descriptionClass}">${options.descriptionHtml}</p>
                ${options.bodyExtraHtml || ''}

                <div class="${actionsClass}">
                    ${options.actionsHtml}
                </div>
            </div>
        </div>
    `;
}

function buildCancelButton(modalId: string, label: string, renderer: SafeRenderer): string {
  return `
                    <button type="button" id="btn-cancel-${modalId}" class="min-h-10 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
                        ${renderer.escapeHtml(label)}
                    </button>`;
}

function buildPrimaryButton(
  modalId: string,
  buttonId: string,
  label: string,
  renderer: SafeRenderer
): string {
  return `
                    <button type="button" id="${buttonId}-${modalId}" class="app-confirm-modal-confirm min-h-10 px-5 py-2 text-white rounded-lg text-sm font-bold shadow-md transition-transform transform active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                        ${renderer.escapeHtml(label)}
                    </button>`;
}

function buildModalContent(
  modalId: string,
  request: ConfirmModalRequest,
  renderer: SafeRenderer
): string {
  return buildDialogShell({
    modalId,
    title: request.title,
    descriptionHtml: request.content,
    isDestructive: request.isDestructive,
    bodyExtraHtml: buildDontAskMarkup(modalId, request.ignoreKey),
    actionsHtml: `${buildCancelButton(modalId, '取消', renderer)}${buildPrimaryButton(
      modalId,
      'btn-confirm',
      request.confirmLabel,
      renderer
    )}`,
    renderer,
  });
}

function getElements(modalId: string, backdrop: HTMLDivElement): ConfirmModalElements {
  return {
    backdrop,
    btnConfirm: document.getElementById(`btn-confirm-${modalId}`) as HTMLButtonElement | null,
    btnCancel: document.getElementById(`btn-cancel-${modalId}`) as HTMLButtonElement | null,
    dontAskCheckbox: document.getElementById(
      `dont-ask-again-${modalId}`
    ) as HTMLInputElement | null,
  };
}

function addListeners(elements: ConfirmModalElements, handlers: ConfirmModalHandlers): void {
  elements.btnConfirm?.addEventListener('click', handlers.handleConfirm, { once: true });
  elements.btnCancel?.addEventListener('click', handlers.handleCancel, { once: true });
  elements.backdrop.addEventListener('click', handlers.handleBackdropClick);
  document.addEventListener('keydown', handlers.handleEscape);
}

function removeListeners(elements: ConfirmModalElements, handlers: ConfirmModalHandlers): void {
  elements.btnConfirm?.removeEventListener('click', handlers.handleConfirm);
  elements.btnCancel?.removeEventListener('click', handlers.handleCancel);
  elements.backdrop.removeEventListener('click', handlers.handleBackdropClick);
  document.removeEventListener('keydown', handlers.handleEscape);
}

function cleanupModal(
  elements: ConfirmModalElements,
  handlers: ConfirmModalHandlers,
  previousActiveElement: HTMLElement | null
): void {
  removeListeners(elements, handlers);

  try {
    if (document.body.contains(elements.backdrop)) {
      document.body.removeChild(elements.backdrop);
    }
    if (previousActiveElement?.isConnected) {
      previousActiveElement.focus();
    }
  } catch (error) {
    console.error('[AppConfirmModal] failed to clean up confirmation dialog', error);
  }
}

function mountConfirmModal(request: ConfirmModalRequest): void {
  const renderer = SafeRenderer.getInstance();
  const modalId = `confirm-modal-${Date.now()}`;
  const backdrop = createBackdrop(modalId);
  const previousActiveElement = getPreviousActiveElement();

  renderer.renderTemplate(backdrop, buildModalContent(modalId, request, renderer));
  document.body.appendChild(backdrop);

  const elements = getElements(modalId, backdrop);
  let resolved = false;

  const finish = (result: boolean) => {
    if (resolved) return;
    resolved = true;
    cleanupModal(elements, handlers, previousActiveElement);
    request.resolve(result);
  };

  const handlers: ConfirmModalHandlers = {
    handleConfirm: event => {
      event.preventDefault();
      event.stopPropagation();

      if (request.ignoreKey && elements.dontAskCheckbox?.checked) {
        StorageService.set(request.ignoreKey, true);
      }

      finish(true);
    },
    handleCancel: event => {
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    },
    handleBackdropClick: event => {
      if (event.target === elements.backdrop) finish(false);
    },
    handleEscape: event => {
      if (event.key === 'Escape') finish(false);
    },
  };

  if (!elements.btnConfirm || !elements.btnCancel) {
    console.error('[AppConfirmModal] confirmation dialog rendered without required controls');
    finish(false);
    return;
  }

  addListeners(elements, handlers);
  requestAnimationFrame(() => elements.btnCancel?.focus());
}

function isDestructiveConfirmation(title: string, content: string, confirmLabel: string): boolean {
  return /删除|清空|移除|无法撤销|无法恢复/.test(`${title} ${content} ${confirmLabel}`);
}

export function confirmWithModal(
  title: string,
  content: string,
  storageKey = '',
  confirmLabel = '确认删除'
): Promise<boolean> {
  const ignoreKey = getIgnoreKey(storageKey);

  if (ignoreKey && StorageService.get(ignoreKey) === true) {
    return Promise.resolve(true);
  }

  return new Promise(resolve => {
    mountConfirmModal({
      title,
      content,
      ignoreKey,
      confirmLabel,
      isDestructive: isDestructiveConfirmation(title, content, confirmLabel),
      resolve,
    });
  });
}

export type ModalChoice = 'primary' | 'secondary' | 'cancel';

export interface ChooseWithModalOptions {
  title: string;
  content: string;
  primaryLabel: string;
  secondaryLabel: string;
  cancelLabel?: string;
  primaryIsDestructive?: boolean;
}

interface ChoiceModalRequest {
  title: string;
  content: string;
  primaryLabel: string;
  secondaryLabel: string;
  cancelLabel: string;
  primaryIsDestructive: boolean;
  resolve: (result: ModalChoice) => void;
}

function buildChoiceModalContent(
  modalId: string,
  request: ChoiceModalRequest,
  renderer: SafeRenderer
): string {
  const safeContent = renderer.escapeHtml(request.content).replace(/\r\n|\n|\r/g, '<br>');
  const secondaryButton = `
                    <button type="button" id="btn-secondary-${modalId}" class="min-h-10 px-4 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                        ${renderer.escapeHtml(request.secondaryLabel)}
                    </button>`;

  return buildDialogShell({
    modalId,
    title: request.title,
    descriptionHtml: safeContent,
    isDestructive: request.primaryIsDestructive,
    descriptionClass: 'text-slate-600 text-sm mb-4 leading-relaxed',
    actionsClass: 'flex flex-wrap justify-end gap-2',
    actionsHtml: `${buildCancelButton(modalId, request.cancelLabel, renderer)}${secondaryButton}${buildPrimaryButton(
      modalId,
      'btn-primary',
      request.primaryLabel,
      renderer
    )}`,
    renderer,
  });
}

function mountChoiceModal(request: ChoiceModalRequest): void {
  const renderer = SafeRenderer.getInstance();
  const modalId = `choice-modal-${Date.now()}`;
  const backdrop = createBackdrop(modalId);
  const previousActiveElement = getPreviousActiveElement();

  renderer.renderTemplate(backdrop, buildChoiceModalContent(modalId, request, renderer));
  document.body.appendChild(backdrop);

  const elements = {
    backdrop,
    btnPrimary: document.getElementById(`btn-primary-${modalId}`) as HTMLButtonElement | null,
    btnSecondary: document.getElementById(`btn-secondary-${modalId}`) as HTMLButtonElement | null,
    btnCancel: document.getElementById(`btn-cancel-${modalId}`) as HTMLButtonElement | null,
  };

  let resolved = false;
  const handlers = {
    handlePrimary: (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      finish('primary');
    },
    handleSecondary: (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      finish('secondary');
    },
    handleCancel: (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      finish('cancel');
    },
    handleBackdropClick: (event: MouseEvent) => {
      if (event.target === elements.backdrop) finish('cancel');
    },
    handleEscape: (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish('cancel');
    },
  };

  const finish = (result: ModalChoice) => {
    if (resolved) return;
    resolved = true;
    elements.btnPrimary?.removeEventListener('click', handlers.handlePrimary);
    elements.btnSecondary?.removeEventListener('click', handlers.handleSecondary);
    elements.btnCancel?.removeEventListener('click', handlers.handleCancel);
    elements.backdrop.removeEventListener('click', handlers.handleBackdropClick);
    document.removeEventListener('keydown', handlers.handleEscape);
    try {
      if (document.body.contains(elements.backdrop)) {
        document.body.removeChild(elements.backdrop);
      }
      if (previousActiveElement?.isConnected) {
        previousActiveElement.focus();
      }
    } catch (error) {
      console.error('[AppConfirmModal] failed to clean up choice dialog', error);
    }
    request.resolve(result);
  };

  if (!elements.btnPrimary || !elements.btnSecondary || !elements.btnCancel) {
    console.error('[AppConfirmModal] choice dialog rendered without required controls');
    finish('cancel');
    return;
  }

  elements.btnPrimary.addEventListener('click', handlers.handlePrimary, { once: true });
  elements.btnSecondary.addEventListener('click', handlers.handleSecondary, { once: true });
  elements.btnCancel.addEventListener('click', handlers.handleCancel, { once: true });
  elements.backdrop.addEventListener('click', handlers.handleBackdropClick);
  document.addEventListener('keydown', handlers.handleEscape);
  requestAnimationFrame(() => elements.btnCancel?.focus());
}

/**
 * Three-way choice dialog: primary / secondary / cancel.
 * Escape, backdrop click, and cancel all resolve to "cancel".
 */
export function chooseWithModal(options: ChooseWithModalOptions): Promise<ModalChoice> {
  return new Promise(resolve => {
    mountChoiceModal({
      title: options.title,
      content: options.content,
      primaryLabel: options.primaryLabel,
      secondaryLabel: options.secondaryLabel,
      cancelLabel: options.cancelLabel || '取消',
      primaryIsDestructive:
        options.primaryIsDestructive ??
        isDestructiveConfirmation(options.title, options.content, options.primaryLabel),
      resolve,
    });
  });
}
