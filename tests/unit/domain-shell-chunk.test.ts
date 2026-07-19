import { describe, expect, it } from 'vitest';
import viteConfig, { assertNoDomainShellChunk } from '../../vite.config.js';

type ManualChunks = (id: string) => string | undefined;
type BuildPlugin = {
  apply?: string;
  generateBundle?: unknown;
  name: string;
};

const manualChunks = (
  viteConfig as unknown as {
    build?: {
      rolldownOptions?: {
        output?: {
          manualChunks?: ManualChunks;
        };
      };
    };
  }
).build?.rolldownOptions?.output?.manualChunks;

const domainShellModuleIds = [
  '/src/modules/app_center/app_center.ts',
  '/src/modules/sops/sops.ts',
  '/src/modules/more/more.ts',
  '/src/modules/amz_hub/amz_hub.ts',
];

const bundleGuardPlugin = (viteConfig as unknown as { plugins?: BuildPlugin[] }).plugins?.find(
  plugin => plugin.name === 'sops:domain-shell-entry-guard'
);

describe('domain shell chunks', () => {
  it('leaves dynamic domain shell roots under Vite default chunk assignment', () => {
    if (typeof manualChunks !== 'function') {
      throw new Error('Expected vite manualChunks configuration to be available');
    }

    expect(domainShellModuleIds.map(id => manualChunks(id))).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('rejects a generated domain-shells chunk', () => {
    expect(() =>
      assertNoDomainShellChunk({
        'assets/js/domain-shells-abcd1234.js': {
          fileName: 'assets/js/domain-shells-abcd1234.js',
          isEntry: false,
          type: 'chunk',
        },
      })
    ).toThrow('domain-shells');
  });

  it('rejects an entry chunk that statically imports a domain-shells chunk', () => {
    expect(() =>
      assertNoDomainShellChunk({
        'assets/js/index-abcd1234.js': {
          fileName: 'assets/js/index-abcd1234.js',
          imports: ['assets/js/domain-shells-abcd1234.js'],
          isEntry: true,
          type: 'chunk',
        },
      })
    ).toThrow('domain-shells');
  });

  it('allows an entry chunk without a domain-shells artifact or static import', () => {
    expect(() =>
      assertNoDomainShellChunk({
        'assets/js/index-abcd1234.js': {
          fileName: 'assets/js/index-abcd1234.js',
          imports: ['assets/js/vendor-core-abcd1234.js'],
          isEntry: true,
          type: 'chunk',
        },
      })
    ).not.toThrow();
  });

  it('registers the artifact guard for raw Vite builds', () => {
    expect(bundleGuardPlugin?.apply).toBe('build');
    expect(bundleGuardPlugin?.generateBundle).toBeTypeOf('function');
  });
});
