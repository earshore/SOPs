import { StorageService } from '../../../../../services/storageService';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';

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
  handleConfirm: (e: Event) => void;
  handleCancel: (e: Event) => void;
  handleBackdropClick: (e: MouseEvent) => void;
  handleEscape: (e: KeyboardEvent) => void;
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
    'ma-confirm-modal-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center fade-in';
  return backdrop;
}

function buildDontAskMarkup(modalId: string, ignoreKey: string): string {
  if (!ignoreKey) return '';

  return `
        <label class="flex items-center gap-2 text-xs text-slate-500 mb-4 cursor-pointer">
            <input type="checkbox" id="dont-ask-again-${modalId}" class="ma-confirm-modal-checkbox rounded border-slate-300">
            <span>不再提示</span>
        </label>
    `;
}

function buildModalContent(
  modalId: string,
  request: ConfirmModalRequest,
  renderer: SafeRenderer
): string {
  const titleId = `${modalId}-title`;
  const descriptionId = `${modalId}-description`;
  const variantClass = request.isDestructive
    ? 'ma-confirm-modal--danger'
    : 'ma-confirm-modal--theme';
  const iconClass = request.isDestructive
    ? 'fas fa-exclamation-triangle'
    : 'fas fa-circle-question';

  return `
        <div class="ma-confirm-modal ${variantClass} bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition"
            role="dialog"
            aria-modal="true"
            aria-labelledby="${titleId}"
            aria-describedby="${descriptionId}">
            <div class="ma-confirm-modal-header p-5 text-white">
                <h3 id="${titleId}" class="text-lg font-bold flex items-center gap-2">
                    <i class="${iconClass}" aria-hidden="true"></i>
                    ${renderer.escapeHtml(request.title)}
                </h3>
            </div>

            <div class="p-6">
                <p id="${descriptionId}" class="text-slate-600 text-sm mb-4">${request.content}</p>
                ${buildDontAskMarkup(modalId, request.ignoreKey)}

                <div class="flex justify-end gap-3">
                    <button type="button" id="btn-cancel-${modalId}" class="min-h-10 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
                        取消
                    </button>
                    <button type="button" id="btn-confirm-${modalId}" class="ma-confirm-modal-confirm min-h-10 px-5 py-2 text-white rounded-lg text-sm font-bold shadow-md transition-transform transform active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                        ${renderer.escapeHtml(request.confirmLabel)}
                    </button>
                </div>
            </div>
        </div>
    `;
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
    console.error('[MasterAnalysis] 清理确认对话框失败:', error);
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
    handleConfirm: e => {
      e.preventDefault();
      e.stopPropagation();

      if (request.ignoreKey && elements.dontAskCheckbox?.checked) {
        StorageService.set(request.ignoreKey, true);
      }

      finish(true);
    },
    handleCancel: e => {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    },
    handleBackdropClick: e => {
      if (e.target === elements.backdrop) finish(false);
    },
    handleEscape: e => {
      if (e.key === 'Escape') finish(false);
    },
  };

  if (!elements.btnConfirm || !elements.btnCancel) {
    console.error('[MasterAnalysis] 确认对话框渲染不完整，已自动关闭');
    finish(false);
    return;
  }

  addListeners(elements, handlers);
  requestAnimationFrame(() => elements.btnCancel?.focus());
}

function isDestructiveConfirmation(title: string, content: string, confirmLabel: string): boolean {
  return /删除|清空|移除|无法撤销|无法从/.test(`${title} ${content} ${confirmLabel}`);
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
