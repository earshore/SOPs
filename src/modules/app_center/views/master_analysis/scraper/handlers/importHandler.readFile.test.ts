import { describe, expect, it } from 'vitest';
import { SystemError, ValidationError } from '@common/errors/AppError';
import { readFileAsJSON } from './importHandler';

function createJsonFile(content: string, filename = 'sample.json'): File {
  return new File([content], filename, { type: 'application/json' });
}

async function readRejectedFile(file: File): Promise<unknown> {
  try {
    await readFileAsJSON(file);
  } catch (error) {
    return error;
  }

  throw new Error('Expected readFileAsJSON to reject');
}

describe('readFileAsJSON', () => {
  it('reads a valid JSON file', async () => {
    const data = { metadata: { marketplace: 'DE' }, products: [{ asin: 'B0TEST001' }] };
    const result = await readFileAsJSON(createJsonFile(JSON.stringify(data), 'valid.json'));

    expect(result).toEqual({ data, filename: 'valid.json' });
  });

  it('rejects empty content as a validation error', async () => {
    const error = await readRejectedFile(createJsonFile('', 'empty.json'));

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe('SCRAPER_IMP_001');
  });

  it('rejects malformed JSON as a system error', async () => {
    const error = await readRejectedFile(createJsonFile('{ invalid json }', 'invalid.json'));

    expect(error).toBeInstanceOf(SystemError);
    expect((error as SystemError).code).toBe('SCRAPER_IMP_002');
  });

  it('rejects null JSON as an invalid JSON value', async () => {
    const error = await readRejectedFile(createJsonFile('null', 'null.json'));

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe('SCRAPER_IMP_003');
  });
});
