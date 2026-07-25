import { describe, expect, it } from 'vitest';
import { escapeCsvCell, formatCsvRows, sanitizeCsvCell } from '@/common/utils/csv';

describe('csv utils', () => {
  it('sanitizes formula-like cells by default', () => {
    expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
    expect(sanitizeCsvCell('+cmd')).toBe("'+cmd");
    expect(sanitizeCsvCell('@sum')).toBe("'@sum");
    expect(sanitizeCsvCell('-abc')).toBe("'-abc");
    expect(sanitizeCsvCell('-12.5%')).toBe('-12.5%');
  });

  it('keeps Excel formulas when allowFormula is true', () => {
    expect(escapeCsvCell('=A1/0.35', { allowFormula: true })).toBe('=A1/0.35');
  });

  it('escapes commas quotes and newlines', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
  });

  it('formats rows', () => {
    expect(
      formatCsvRows([
        ['name', 'value'],
        ['a,b', 1],
      ])
    ).toBe('name,value\n"a,b",1');

    expect(formatCsvRows([['formula'], ['=B2/0.35']], { allowFormula: true })).toBe(
      'formula\n=B2/0.35'
    );
  });
});
