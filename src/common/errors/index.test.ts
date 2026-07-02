import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  BusinessError,
  NetworkError,
  SystemError,
  ValidationError,
  handleApiError,
  handleBusinessError,
  handleError,
  handleNetworkError,
  handleSystemError,
  handleValidationError,
  tryCatch,
  tryCatchSync,
  withErrorHandler,
  withErrorHandlerSync,
} from './index';
import { globalErrorHandler } from './GlobalErrorHandler';

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
}));

vi.mock('./GlobalErrorHandler', () => ({
  globalErrorHandler: {
    handle: mocks.handle,
  },
  GlobalErrorHandler: class GlobalErrorHandler {},
}));

beforeEach(() => {
  mocks.handle.mockReset();
});

describe('errors index helpers', () => {
  it('delegates direct and typed error handling to the global handler', () => {
    const original = new Error('raw');
    handleError(original, { notify: false });
    handleNetworkError('NET_TIMEOUT', { module: 'network' }, original, { log: false });
    handleApiError('API_INVALID_KEY', {
      statusCode: 401,
      response: { error: 'bad-key' },
      context: { module: 'api' },
      originalError: original,
      handlerOptions: { report: false },
    });
    handleValidationError('VAL_REQUIRED_FIELD', 'email', '', { module: 'form' }, { notify: false });
    handleBusinessError('BIZ_NO_DATA', { module: 'business' }, { notify: false });
    handleSystemError('SYS_INIT_FAILED', { module: 'system' }, original, { log: false });

    expect(globalErrorHandler.handle).toHaveBeenNthCalledWith(1, original, { notify: false });
    expect(mocks.handle.mock.calls[1]?.[0]).toBeInstanceOf(NetworkError);
    expect(mocks.handle.mock.calls[1]?.[0]).toMatchObject({ code: 'NET_TIMEOUT' });
    expect(mocks.handle.mock.calls[2]?.[0]).toBeInstanceOf(ApiError);
    expect(mocks.handle.mock.calls[2]?.[0]).toMatchObject({ code: 'API_INVALID_KEY' });
    expect(mocks.handle.mock.calls[3]?.[0]).toBeInstanceOf(ValidationError);
    expect(mocks.handle.mock.calls[3]?.[0]).toMatchObject({ code: 'VAL_REQUIRED_FIELD' });
    expect(mocks.handle.mock.calls[4]?.[0]).toBeInstanceOf(BusinessError);
    expect(mocks.handle.mock.calls[4]?.[0]).toMatchObject({ code: 'BIZ_NO_DATA' });
    expect(mocks.handle.mock.calls[5]?.[0]).toBeInstanceOf(SystemError);
    expect(mocks.handle.mock.calls[5]?.[0]).toMatchObject({ code: 'SYS_INIT_FAILED' });
  });

  it('wraps async and sync functions while rethrowing handled failures', async () => {
    const asyncError = new Error('async failed');
    const syncError = new Error('sync failed');
    const asyncSuccess = withErrorHandler(async (value: unknown) => `ok:${String(value)}`);
    const syncSuccess = withErrorHandlerSync((value: unknown) => `sync:${String(value)}`);
    const asyncFailure = withErrorHandler(
      async () => {
        throw asyncError;
      },
      { notify: false }
    );
    const syncFailure = withErrorHandlerSync(
      () => {
        throw syncError;
      },
      { log: false }
    );

    await expect(asyncSuccess('value')).resolves.toBe('ok:value');
    expect(syncSuccess('value')).toBe('sync:value');
    await expect(asyncFailure()).rejects.toBe(asyncError);
    expect(() => syncFailure()).toThrow(syncError);
    expect(globalErrorHandler.handle).toHaveBeenCalledWith(asyncError, { notify: false });
    expect(globalErrorHandler.handle).toHaveBeenCalledWith(syncError, { log: false });
  });

  it('returns tuple results from tryCatch helpers', async () => {
    await expect(tryCatch(Promise.resolve('ok'))).resolves.toEqual([null, 'ok']);

    const asyncError = new Error('tuple async');
    await expect(tryCatch(Promise.reject(asyncError), { notify: false })).resolves.toEqual([
      asyncError,
      null,
    ]);

    expect(tryCatchSync(() => 42)).toEqual([null, 42]);

    const syncError = new Error('tuple sync');
    expect(
      tryCatchSync(
        () => {
          throw syncError;
        },
        { log: false }
      )
    ).toEqual([syncError, null]);

    expect(globalErrorHandler.handle).toHaveBeenCalledWith(asyncError, { notify: false });
    expect(globalErrorHandler.handle).toHaveBeenCalledWith(syncError, { log: false });
  });
});
