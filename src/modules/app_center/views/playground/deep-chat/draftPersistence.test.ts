import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDraftPersistController } from './draftPersistence';

describe('Draft persist controller', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces repeated persist requests', () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const controller = createDraftPersistController(persist, 400);

    controller.schedule();
    controller.schedule();
    controller.schedule();

    expect(controller.hasPending()).toBe(true);
    expect(persist).not.toHaveBeenCalled();

    vi.advanceTimersByTime(399);
    expect(persist).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(controller.hasPending()).toBe(false);
  });

  it('flushes the pending persist immediately', () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const controller = createDraftPersistController(persist, 400);

    controller.schedule();
    controller.flush();
    vi.advanceTimersByTime(400);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(controller.hasPending()).toBe(false);
  });

  it('cancels pending persist requests', () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const controller = createDraftPersistController(persist, 400);

    controller.schedule();
    controller.cancel();
    vi.advanceTimersByTime(400);

    expect(persist).not.toHaveBeenCalled();
    expect(controller.hasPending()).toBe(false);
  });
});
