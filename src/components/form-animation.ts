/**
 * 表单动画组件
 * 负责表单输入的动画效果控制
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { animationManager } from '../services/animation-manager';
import { ANIMATION_CLASSES } from '../config/animation-config';
import { setSafeHtml } from '../common/utils/security';

const SUCCESS_ICON_ANIMATED_CLASS = 'form-input-success-icon--animated';

/**
 * 初始化表单输入动画
 * 为所有表单输入添加动画效果
 */
export function initializeFormAnimations(): void {
  // 检查动画是否启用
  if (!animationManager.isCategoryEnabled('form')) {
    return;
  }

  // 初始化所有浮动标签输入框
  initializeFloatingLabels();

  // 初始化所有表单输入的焦点动画
  initializeFocusAnimations();
}

/**
 * 初始化浮动标签
 * Requirements 6.2: Label上浮动画
 */
function initializeFloatingLabels(): void {
  const floatGroups = document.querySelectorAll('.form-group-float');

  floatGroups.forEach(group => {
    const input = group.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      '.form-input, .form-textarea'
    );
    const label = group.querySelector<HTMLElement>('.form-label-float');

    if (!input || !label) return;

    // 检查初始值，如果有值则立即上浮
    checkAndFloatLabel(input, label);

    // 监听输入变化
    input.addEventListener('input', () => {
      checkAndFloatLabel(input, label);
    });

    // 监听焦点事件
    input.addEventListener('focus', () => {
      floatLabel(label);
    });

    input.addEventListener('blur', () => {
      if (!input.value) {
        unfloatLabel(label);
      }
    });
  });
}

/**
 * 检查并浮动标签
 */
function checkAndFloatLabel(
  input: HTMLInputElement | HTMLTextAreaElement,
  label: HTMLElement
): void {
  if (input.value) {
    floatLabel(label);
  } else {
    unfloatLabel(label);
  }
}

/**
 * 浮动标签
 * Requirements 6.2, 6.5: Label在250ms内上浮
 */
function floatLabel(label: HTMLElement): void {
  // CSS已经通过:focus和:not(:placeholder-shown)处理了动画
  // 这里只需要确保标签有正确的状态
  label.classList.add('is-floating');
}

/**
 * 取消浮动标签
 */
function unfloatLabel(label: HTMLElement): void {
  label.classList.remove('is-floating');
}

/**
 * 初始化焦点动画
 * Requirements 6.1: 输入框聚焦边框过渡 - 200ms
 */
function initializeFocusAnimations(): void {
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    '.form-input, .form-textarea, .form-select'
  );

  inputs.forEach(input => {
    // 焦点动画已经通过CSS处理
    // 这里可以添加额外的JavaScript逻辑（如果需要）

    // 监听焦点事件以触发自定义事件
    input.addEventListener('focus', () => {
      const event = new CustomEvent('form-input-focus', {
        detail: { input },
        bubbles: true,
      });
      input.dispatchEvent(event);
    });

    input.addEventListener('blur', () => {
      const event = new CustomEvent('form-input-blur', {
        detail: { input },
        bubbles: true,
      });
      input.dispatchEvent(event);
    });
  });
}

/**
 * 显示输入错误动画
 * Requirements 6.3: 输入验证失败时的抖动动画
 *
 * @param input - 输入元素
 * @param errorMessage - 错误消息（可选）
 */
export function showInputError(
  input: HTMLInputElement | HTMLTextAreaElement,
  errorMessage?: string
): void {
  // 检查动画是否启用
  if (animationManager.shouldReduceMotion()) {
    // 只添加错误状态，不播放动画
    input.classList.add('error');
    if (errorMessage) {
      showErrorMessage(input, errorMessage);
    }
    return;
  }

  // 添加错误状态
  input.classList.add('error');

  // 添加抖动动画类
  input.classList.add(ANIMATION_CLASSES.formInputError);

  // 显示错误消息
  if (errorMessage) {
    showErrorMessage(input, errorMessage);
  }

  // 动画结束后移除动画类（但保留error状态）
  input.addEventListener(
    'animationend',
    () => {
      input.classList.remove(ANIMATION_CLASSES.formInputError);
    },
    { once: true }
  );

  // 触发自定义事件
  const event = new CustomEvent('form-input-error', {
    detail: { input, message: errorMessage },
    bubbles: true,
  });
  input.dispatchEvent(event);
}

/**
 * 显示错误消息
 */
function showErrorMessage(input: HTMLInputElement | HTMLTextAreaElement, message: string): void {
  // 查找或创建错误消息元素
  let errorElement = input.parentElement?.querySelector<HTMLElement>('.form-error');

  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    input.parentElement?.appendChild(errorElement);
  }

  errorElement.textContent = message;
  errorElement.hidden = false;
}

/**
 * 清除输入错误状态
 *
 * @param input - 输入元素
 */
export function clearInputError(input: HTMLInputElement | HTMLTextAreaElement): void {
  input.classList.remove('error');
  input.classList.remove(ANIMATION_CLASSES.formInputError);

  // 隐藏错误消息
  const errorElement = input.parentElement?.querySelector<HTMLElement>('.form-error');
  if (errorElement) {
    errorElement.hidden = true;
  }
}

/**
 * 显示输入成功动画
 * Requirements 6.4: 输入验证成功时的勾选图标动画
 *
 * @param input - 输入元素
 */
export function showInputSuccess(input: HTMLInputElement | HTMLTextAreaElement): void {
  // 清除错误状态
  clearInputError(input);

  // 添加成功状态
  input.classList.add('success');

  // 检查动画是否启用
  if (animationManager.shouldReduceMotion()) {
    // 只显示成功图标，不播放动画
    showSuccessIcon(input, false);
    return;
  }

  // 显示成功图标并播放动画
  showSuccessIcon(input, true);

  // 触发自定义事件
  const event = new CustomEvent('form-input-success', {
    detail: { input },
    bubbles: true,
  });
  input.dispatchEvent(event);
}

/**
 * 显示成功图标
 */
function showSuccessIcon(input: HTMLInputElement | HTMLTextAreaElement, animate: boolean): void {
  // 查找或创建成功图标容器
  const parent = input.parentElement;
  if (!parent) return;

  // 确保父容器有正确的类
  if (!parent.classList.contains('form-group-success')) {
    parent.classList.add('form-group-success');
  }

  // 查找现有图标
  let iconElement = parent.querySelector<HTMLElement>(`.${ANIMATION_CLASSES.formInputSuccessIcon}`);

  if (!iconElement) {
    // 创建成功图标
    iconElement = document.createElement('span');
    iconElement.className = ANIMATION_CLASSES.formInputSuccessIcon;
    // ✅ 安全: createCheckmarkSVG()返回静态SVG模板
    setSafeHtml(iconElement, createCheckmarkSVG());
    parent.appendChild(iconElement);
  }

  // 如果需要动画，重新触发动画
  iconElement.classList.remove(SUCCESS_ICON_ANIMATED_CLASS);
  if (animate) {
    // 强制重排
    void iconElement.offsetHeight;
    iconElement.classList.add(SUCCESS_ICON_ANIMATED_CLASS);
  }
}

/**
 * 创建勾选图标SVG
 */
function createCheckmarkSVG(): string {
  // ✅ 安全: 静态SVG模板
  return `
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
    </svg>
  `;
}

/**
 * 清除输入成功状态
 *
 * @param input - 输入元素
 */
export function clearInputSuccess(input: HTMLInputElement | HTMLTextAreaElement): void {
  input.classList.remove('success');

  // 移除成功图标
  const parent = input.parentElement;
  if (!parent) return;

  const iconElement = parent.querySelector(`.${ANIMATION_CLASSES.formInputSuccessIcon}`);
  if (iconElement) {
    iconElement.remove();
  }

  parent.classList.remove('form-group-success');
}

/**
 * 验证输入并显示相应动画
 *
 * @param input - 输入元素
 * @param validator - 验证函数
 * @param errorMessage - 错误消息
 */
export async function validateInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  validator: (value: string) => boolean | Promise<boolean>,
  errorMessage: string = '输入无效'
): Promise<boolean> {
  const value = input.value;

  try {
    const isValid = await validator(value);

    if (isValid) {
      showInputSuccess(input);
      return true;
    } else {
      showInputError(input, errorMessage);
      return false;
    }
  } catch (error) {
    console.error('Validation error:', error);
    showInputError(input, '验证失败');
    return false;
  }
}

/**
 * 为输入框添加实时验证
 *
 * @param input - 输入元素
 * @param validator - 验证函数
 * @param errorMessage - 错误消息
 * @param debounceMs - 防抖延迟（毫秒）
 */
export function addLiveValidation(
  input: HTMLInputElement | HTMLTextAreaElement,
  validator: (value: string) => boolean | Promise<boolean>,
  errorMessage: string = '输入无效',
  debounceMs: number = 500
): () => void {
  let timeoutId: number | undefined;

  const handleInput = () => {
    // 清除之前的定时器
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    // 设置新的定时器
    timeoutId = window.setTimeout(() => {
      validateInput(input, validator, errorMessage);
    }, debounceMs);
  };

  input.addEventListener('input', handleInput);

  // 返回清理函数
  return () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    input.removeEventListener('input', handleInput);
  };
}

/**
 * 批量初始化表单验证
 *
 * @param form - 表单元素
 * @param validators - 验证器映射（字段名 -> 验证函数）
 */
export function initializeFormValidation(
  form: HTMLFormElement,
  validators: Record<
    string,
    {
      validator: (value: string) => boolean | Promise<boolean>;
      errorMessage: string;
    }
  >
): void {
  Object.entries(validators).forEach(([fieldName, config]) => {
    const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[name="${fieldName}"]`
    );

    if (input) {
      addLiveValidation(input, config.validator, config.errorMessage);
    }
  });

  // 表单提交时验证所有字段
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const validationPromises = Object.entries(validators).map(async ([fieldName, config]) => {
      const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${fieldName}"]`
      );

      if (input) {
        return validateInput(input, config.validator, config.errorMessage);
      }

      return true;
    });

    const results = await Promise.all(validationPromises);
    const allValid = results.every(result => result);

    if (allValid) {
      // 所有字段验证通过，触发自定义事件
      const event = new CustomEvent('form-validation-success', {
        detail: { form },
        bubbles: true,
      });
      form.dispatchEvent(event);
    } else {
      // 有字段验证失败，触发自定义事件
      const event = new CustomEvent('form-validation-error', {
        detail: { form },
        bubbles: true,
      });
      form.dispatchEvent(event);
    }
  });
}

/**
 * 重置表单状态
 * 清除所有验证状态和动画
 *
 * @param form - 表单元素
 */
export function resetFormState(form: HTMLFormElement): void {
  const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    '.form-input, .form-textarea'
  );

  inputs.forEach(input => {
    clearInputError(input);
    clearInputSuccess(input);
  });
}
