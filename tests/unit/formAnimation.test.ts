import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ANIMATION_CLASSES } from '@/config/animation-config';

type AnimationManagerMock = {
  shouldReduceMotion: ReturnType<typeof vi.fn>;
  isCategoryEnabled: ReturnType<typeof vi.fn>;
};

async function importFormAnimation(options: {
  reducedMotion?: boolean;
  categoryEnabled?: boolean;
} = {}) {
  const animationManager: AnimationManagerMock = {
    shouldReduceMotion: vi.fn(() => options.reducedMotion ?? false),
    isCategoryEnabled: vi.fn(() => options.categoryEnabled ?? true),
  };

  vi.resetModules();
  vi.doMock('@/services/animation-manager', () => ({ animationManager }));

  const module = await import('@/components/form-animation');

  return {
    ...module,
    animationManager,
  };
}

function appendInput(name = 'email', value = ''): HTMLInputElement {
  const group = document.createElement('label');
  group.className = 'form-group-float';
  const input = document.createElement('input');
  input.className = 'form-input';
  input.name = name;
  input.value = value;
  const label = document.createElement('span');
  label.className = 'form-label-float';
  group.append(input, label);
  document.body.append(group);
  return input;
}

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.doUnmock('@/services/animation-manager');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes floating labels and focus custom events', async () => {
    const input = appendInput('email', 'hello@example.com');
    const label = document.querySelector<HTMLElement>('.form-label-float');
    const focusListener = vi.fn();
    const blurListener = vi.fn();
    input.addEventListener('form-input-focus', focusListener);
    input.addEventListener('form-input-blur', blurListener);
    const { initializeFormAnimations } = await importFormAnimation();

    initializeFormAnimations();

    expect(label?.classList.contains('is-floating')).toBe(true);

    input.value = '';
    input.dispatchEvent(new Event('blur'));
    expect(label?.classList.contains('is-floating')).toBe(false);

    input.dispatchEvent(new Event('focus'));
    expect(label?.classList.contains('is-floating')).toBe(true);
    expect(focusListener).toHaveBeenCalled();

    input.dispatchEvent(new Event('blur'));
    expect(blurListener).toHaveBeenCalled();
  });

  it('skips form initialization when the form category is disabled', async () => {
    const input = appendInput('email', 'hello@example.com');
    const label = document.querySelector<HTMLElement>('.form-label-float');
    const { initializeFormAnimations } = await importFormAnimation({ categoryEnabled: false });

    initializeFormAnimations();
    input.dispatchEvent(new Event('focus'));

    expect(label?.classList.contains('is-floating')).toBe(false);
  });

  it('shows and clears input error state with animation cleanup', async () => {
    const input = appendInput();
    const listener = vi.fn();
    input.addEventListener('form-input-error', listener);
    const { showInputError, clearInputError } = await importFormAnimation();

    showInputError(input, 'Required');

    const error = input.parentElement?.querySelector<HTMLElement>('.form-error');
    expect(input.classList.contains('error')).toBe(true);
    expect(input.classList.contains(ANIMATION_CLASSES.formInputError)).toBe(true);
    expect(error?.textContent).toBe('Required');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      detail: { input, message: 'Required' },
    }));

    input.dispatchEvent(new Event('animationend'));
    expect(input.classList.contains(ANIMATION_CLASSES.formInputError)).toBe(false);

    clearInputError(input);
    expect(input.classList.contains('error')).toBe(false);
    expect(error?.style.display).toBe('none');
  });

  it('shows success state, success icon, and reduced-motion fallback', async () => {
    const input = appendInput();
    const listener = vi.fn();
    input.addEventListener('form-input-success', listener);
    const { showInputSuccess, clearInputSuccess } = await importFormAnimation();

    showInputSuccess(input);

    expect(input.classList.contains('success')).toBe(true);
    expect(input.parentElement?.classList.contains('form-group-success')).toBe(true);
    expect(input.parentElement?.querySelector(`.${ANIMATION_CLASSES.formInputSuccessIcon}`)).not.toBeNull();
    expect(listener).toHaveBeenCalled();

    clearInputSuccess(input);
    expect(input.classList.contains('success')).toBe(false);
    expect(input.parentElement?.querySelector(`.${ANIMATION_CLASSES.formInputSuccessIcon}`)).toBeNull();

    const reducedInput = appendInput('name');
    const reducedModule = await importFormAnimation({ reducedMotion: true });
    reducedModule.showInputSuccess(reducedInput);
    const reducedIcon = reducedInput.parentElement?.querySelector<HTMLElement>(
      `.${ANIMATION_CLASSES.formInputSuccessIcon}`
    );
    expect(reducedIcon?.style.animation).toBe('none');
  });

  it('validates inputs and handles validator errors', async () => {
    const input = appendInput();
    input.value = 'ok';
    const { validateInput } = await importFormAnimation();

    await expect(validateInput(input, (value) => value === 'ok')).resolves.toBe(true);
    expect(input.classList.contains('success')).toBe(true);

    input.value = 'bad';
    await expect(validateInput(input, (value) => value === 'ok', 'Invalid')).resolves.toBe(false);
    expect(input.classList.contains('error')).toBe(true);
    expect(input.parentElement?.querySelector('.form-error')?.textContent).toBe('Invalid');

    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(validateInput(input, () => {
      throw new Error('validator failed');
    })).resolves.toBe(false);
    expect(input.parentElement?.querySelector('.form-error')?.textContent).toBe('验证失败');
  });

  it('supports live validation, form-level validation, and reset', async () => {
    vi.useFakeTimers();
    const form = document.createElement('form');
    const input = appendInput('email');
    form.append(input.parentElement as HTMLElement);
    document.body.append(form);
    const {
      addLiveValidation,
      initializeFormValidation,
      resetFormState,
    } = await importFormAnimation();
    const validator = vi.fn((value: string) => value.includes('@'));
    const successListener = vi.fn();
    const errorListener = vi.fn();
    form.addEventListener('form-validation-success', successListener);
    form.addEventListener('form-validation-error', errorListener);

    const cleanup = addLiveValidation(input, validator, 'Bad email', 100);
    input.value = 'bad';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(100);
    await Promise.resolve();

    expect(validator).toHaveBeenCalledWith('bad');
    expect(input.classList.contains('error')).toBe(true);

    cleanup();
    initializeFormValidation(form, {
      email: { validator, errorMessage: 'Bad email' },
      missing: { validator: () => false, errorMessage: 'Missing' },
    });

    input.value = 'ok@example.com';
    form.dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      expect(successListener).toHaveBeenCalled();
    });

    input.value = 'bad';
    form.dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      expect(errorListener).toHaveBeenCalled();
    });

    resetFormState(form);
    expect(input.classList.contains('error')).toBe(false);
    expect(input.classList.contains('success')).toBe(false);
  });
