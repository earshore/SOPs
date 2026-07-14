import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseRedirectRules,
  validateStaticArtifact,
} from '../../scripts/release/static-artifact-contract';

const artifactRoots: string[] = [];
const publicHeaders = readFileSync('public/_headers', 'utf8');

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
  writeFileSync(join(root, '_headers'), publicHeaders);
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

  it('does not parse malformed redirect declarations', () => {
    expect(
      parseRedirectRules(
        ['/home /#/home 302 ignored-field', '/home /#/home invalid', '/home /#/home 30'].join('\n')
      )
    ).toEqual([]);
  });

  it('accepts a standalone 404 and safe redirect/header declarations', () => {
    expect(validateStaticArtifact(makeArtifact())).toEqual([]);
  });

  it('rejects an empty headers file', () => {
    const root = makeArtifact();
    writeFileSync(join(root, '_headers'), '');

    expect(validateStaticArtifact(root)).toContain('root header block must appear exactly once');
  });

  it('rejects non-root header override blocks', () => {
    const root = makeArtifact();
    writeFileSync(
      join(root, '_headers'),
      [
        publicHeaders.trimEnd(),
        '/assets/*',
        '  Content-Type: application/javascript',
        '  Cache-Control: public, max-age=3600',
        '',
      ].join('\n')
    );

    expect(validateStaticArtifact(root)).toContain(
      'non-root header block is not allowed: /assets/*'
    );
  });

  it('preserves extension-wide MIME override diagnostics', () => {
    const root = makeArtifact();
    writeFileSync(
      join(root, '_headers'),
      `${publicHeaders.trimEnd()}\n/*.js\n  Content-Type: application/javascript\n`
    );

    expect(validateStaticArtifact(root)).toContain('extension-wide MIME overrides are not allowed');
  });

  it.each([
    {
      description: 'missing',
      headers: publicHeaders.replace(/  X-Frame-Options: DENY\r?\n/, ''),
      error: 'missing root security header: X-Frame-Options',
    },
    {
      description: 'wrong',
      headers: publicHeaders.replace('X-Frame-Options: DENY', 'X-Frame-Options: SAMEORIGIN'),
      error: 'invalid root security header: X-Frame-Options',
    },
    {
      description: 'extra',
      headers: `${publicHeaders.trimEnd()}\n  X-Test-Header: unexpected\n`,
      error: 'unexpected root security header: X-Test-Header',
    },
  ])('rejects $description root security headers', ({ headers, error }) => {
    const root = makeArtifact();
    writeFileSync(join(root, '_headers'), headers);

    expect(validateStaticArtifact(root)).toContain(error);
  });

  it('rejects malformed header declarations', () => {
    const root = makeArtifact();
    writeFileSync(join(root, '_headers'), `${publicHeaders.trimEnd()}\n  invalid declaration\n`);

    expect(validateStaticArtifact(root)).toContain(
      'malformed header declaration: invalid declaration'
    );
  });

  it('rejects redirect rules that shadow the required sequence', () => {
    const root = makeArtifact();
    const redirectsPath = join(root, '_redirects');
    writeFileSync(redirectsPath, `/home /wrong 301\n${readFileSync(redirectsPath, 'utf8')}`);

    expect(validateStaticArtifact(root)).toContain(
      'redirect declarations must exactly match required order'
    );
  });

  it('reports malformed redirects without accepting them as canonical rules', () => {
    const root = makeArtifact();
    const redirectsPath = join(root, '_redirects');
    writeFileSync(
      redirectsPath,
      readFileSync(redirectsPath, 'utf8').replace(
        '/home /#/home 302',
        '/home /#/home 302 ignored-field'
      )
    );

    const errors = validateStaticArtifact(root);
    expect(errors).toContain('malformed redirect: /home /#/home 302 ignored-field');
    expect(errors).toContain('missing redirect: /home /#/home 302');
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

  it.each(['_redirects', '_headers', '404.html', 'index.html'])(
    'reports a missing %s artifact file',
    name => {
      const root = makeArtifact();
      rmSync(join(root, name));

      expect(validateStaticArtifact(root)).toContain(`${name} is missing`);
    }
  );

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
