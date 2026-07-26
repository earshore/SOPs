import { describe, expect, it } from 'vitest';
import {
  getCardClasses,
  getIconContainerClasses,
  getWorkbenchCardClasses,
  getWorkbenchIconContainerClasses,
} from './colorSchemes';

describe('colorSchemes entry vs workbench helpers (D4)', () => {
  it('getCardClasses keeps entry/marketing hover translate', () => {
    const classes = getCardClasses('blue');
    expect(classes).toContain('hover:-translate-y-0.5');
    expect(classes).toContain('rounded-2xl');
  });

  it('getWorkbenchCardClasses omits marketing lift motion', () => {
    const classes = getWorkbenchCardClasses('emerald');
    expect(classes).not.toMatch(/-translate-y/);
    expect(classes).not.toMatch(/scale-11/);
    expect(classes).toContain('rounded-lg');
    expect(classes).toContain('border-emerald-200/80');
  });

  it('getIconContainerClasses keeps entry/marketing icon scale', () => {
    const classes = getIconContainerClasses('rose', 'md');
    expect(classes).toContain('scale-110');
  });

  it('getWorkbenchIconContainerClasses omits scale-110', () => {
    const classes = getWorkbenchIconContainerClasses('rose', 'md');
    expect(classes).not.toMatch(/scale-11/);
    expect(classes).toContain('from-rose-500');
    expect(classes).toContain('rounded-lg');
  });
});
