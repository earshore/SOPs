import { describe, expect, it } from 'vitest';
import { ParamParser } from './ParamParser';

describe('ParamParser', () => {
  it('parses configured path params and reports validation errors', () => {
    const parser = new ParamParser();

    const result = parser.parsePathParams(
      {
        id: '42',
        active: 'true',
        invalid: 'abc',
        slug: 'draft',
      },
      {
        id: { type: 'number', required: true },
        active: { type: 'boolean' },
        status: { type: 'string', default: 'pending' },
        invalid: { type: 'number' },
        missing: { type: 'string', required: true },
        slug: { type: 'string', validate: value => value === 'published' },
      }
    );

    expect(result.params).toEqual({
      id: 42,
      active: true,
      status: 'pending',
    });
    expect(result.errors).toEqual([
      'Invalid type for parameter "invalid": expected number',
      'Missing required parameter: missing',
      'Validation failed for parameter: slug',
    ]);
  });
});
