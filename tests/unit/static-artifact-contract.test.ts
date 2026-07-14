import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseRedirectRules,
  validateStaticArtifact,
} from '../../scripts/release/static-artifact-contract';

function makeArtifact(): string {
  const root = mkdtempSync(join(tmpdir(), 'sops-static-contract-'));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>SOPs</title>');
  writeFileSync(join(root, '404.html'), '<!doctype html><title>Not Found</title>');
  writeFileSync(
    join(root, '_redirects'),
    [
      '/home /#/home 302',
      '/app-center /#/app-center 302',
      '/app-center/* /#/app-center/:splat 302',
      '/sops /#/sops 302',
      '/sops/* /#/sops/:splat 302',
      '/amz-hub /#/amz-hub 302',
      '/amz-hub/* /#/amz-hub/:splat 302',
      '/more /#/more 302',
      '/more/* /#/more/:splat 302',
      '/sops_* /#/sops_:splat 302',
      '/amz_* /#/amz_:splat 302',
      '/more_* /#/more_:splat 302',
      '',
    ].join('\n')
  );
  writeFileSync(join(root, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n');
  return root;
}

describe('static artifact contract', () => {
  it('parses redirect source, destination, and status', () => {
    expect(parseRedirectRules('/home /#/home 302\n')).toEqual([
      { source: '/home', destination: '/#/home', status: 302 },
    ]);
  });

  it('accepts a standalone 404 and safe redirect/header declarations', () => {
    expect(validateStaticArtifact(makeArtifact())).toEqual([]);
  });

  it('rejects an artifact without a standalone 404 document', () => {
    const root = makeArtifact();
    writeFileSync(join(root, '404.html'), '<script type="module" src="/src/main.ts"></script>');
    expect(validateStaticArtifact(root)).toContain('404.html must not bootstrap the application');
  });
});
