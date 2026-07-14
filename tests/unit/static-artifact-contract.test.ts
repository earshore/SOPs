import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseRedirectRules,
  validateStaticArtifact,
} from '../../scripts/release/static-artifact-contract';

const artifactRoots: string[] = [];

function makeArtifact(): string {
  const root = mkdtempSync(join(tmpdir(), 'sops-static-contract-'));
  artifactRoots.push(root);
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

afterEach(() => {
  for (const root of artifactRoots) rmSync(root, { recursive: true, force: true });
  artifactRoots.length = 0;
});

describe('static artifact contract', () => {
  it('parses redirect source, destination, and status', () => {
    expect(parseRedirectRules('/home /#/home 302\n')).toEqual([
      { source: '/home', destination: '/#/home', status: 302 },
    ]);
  });

  it('accepts a standalone 404 and safe redirect/header declarations', () => {
    expect(validateStaticArtifact(makeArtifact())).toEqual([]);
  });

  it('rejects redirect rules that shadow the required sequence', () => {
    const root = makeArtifact();
    const redirectsPath = join(root, '_redirects');
    writeFileSync(redirectsPath, `/home /wrong 301\n${readFileSync(redirectsPath, 'utf8')}`);

    expect(validateStaticArtifact(root)).toContain(
      'redirect declarations must exactly match required order'
    );
  });

  it('scopes immutable caching checks to the assets header block', () => {
    const root = makeArtifact();
    writeFileSync(
      join(root, '_headers'),
      [
        '/assets/*',
        '  Cache-Control: public, max-age=31536000',
        '/private/*',
        '  Cache-Control: public, max-age=31536000, immutable',
        '',
      ].join('\n')
    );

    expect(validateStaticArtifact(root)).not.toContain(
      '/assets/* must not apply immutable caching to missing resources'
    );
  });

  it('rejects immutable assets caching after a comment', () => {
    const root = makeArtifact();
    writeFileSync(
      join(root, '_headers'),
      [
        '/assets/*',
        '# cache policy',
        '  Cache-Control: public, max-age=31536000, immutable',
        '',
      ].join('\n')
    );

    expect(validateStaticArtifact(root)).toContain(
      '/assets/* must not apply immutable caching to missing resources'
    );
  });

  it('rejects an artifact without a standalone 404 document', () => {
    const root = makeArtifact();
    writeFileSync(join(root, '404.html'), '<script type="module" src="/src/main.ts"></script>');
    expect(validateStaticArtifact(root)).toContain('404.html must not bootstrap the application');
  });

  it('rejects an arbitrary public directory without its own index.html', () => {
    const projectRoot = makeArtifact();
    const publicRoot = join(projectRoot, 'public');
    mkdirSync(publicRoot);
    for (const name of ['_redirects', '_headers', '404.html']) {
      writeFileSync(join(publicRoot, name), readFileSync(join(projectRoot, name), 'utf8'));
    }

    expect(validateStaticArtifact(publicRoot)).toContain('index.html is missing');
  });

  it('keeps public hosting declarations release-safe', () => {
    expect(validateStaticArtifact('public')).toEqual([]);
  });
});
