import { describe, expect, it } from 'vitest';
import { ERROR_TYPES, ErrorService } from './errorService';

describe('ErrorService', () => {
  it('classifies timeout errors first', () => {
    const error = new Error('network timeout');
    error.name = 'AbortError';

    expect(ErrorService.classify(error)).toBe(ERROR_TYPES.TIMEOUT);
  });

  it('classifies network errors', () => {
    const error = new TypeError('Failed to fetch');

    expect(ErrorService.classify(error)).toBe(ERROR_TYPES.NETWORK);
  });

  it('classifies auth errors', () => {
    expect(ErrorService.classify(new Error('401 unauthorized'))).toBe(ERROR_TYPES.AUTH);
  });

  it('classifies parse errors', () => {
    expect(ErrorService.classify(new SyntaxError('Unexpected JSON token'))).toBe(ERROR_TYPES.PARSE);
  });

  it('classifies storage errors', () => {
    const error = new Error('storage quota exceeded');
    error.name = 'QuotaExceededError';

    expect(ErrorService.classify(error)).toBe(ERROR_TYPES.STORAGE);
  });

  it('falls back to unknown for missing or unrecognized errors', () => {
    expect(ErrorService.classify(null)).toBe(ERROR_TYPES.UNKNOWN);
    expect(ErrorService.classify(new Error('something failed'))).toBe(ERROR_TYPES.UNKNOWN);
  });
});
