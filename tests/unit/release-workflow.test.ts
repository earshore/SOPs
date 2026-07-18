import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const releaseWorkflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/release.yml'),
  'utf8'
);
const qualityWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/test.yml'), 'utf8');

function extractReleaseStep(name: string): string {
  const marker = `      - name: ${name}`;
  const start = releaseWorkflow.indexOf(marker);
  if (start === -1) {
    throw new Error(`Release workflow step not found: ${name}`);
  }

  const next = releaseWorkflow.indexOf('\n      - name:', start + marker.length);
  return releaseWorkflow.slice(start, next === -1 ? releaseWorkflow.length : next);
}

function extractReleaseRunBlock(name: string): string {
  const step = extractReleaseStep(name);
  const marker = '\n        run: |';
  const start = step.indexOf(marker);
  if (start === -1) {
    throw new Error(`Release workflow run block not found: ${name}`);
  }

  return step.slice(start + marker.length);
}

function effectivePowerShellLines(runBlock: string): string[] {
  return runBlock
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'));
}

function hasPowerShellToken(line: string, token: string): boolean {
  return line
    .replace(/[(),]/g, ' ')
    .split(/\s+/)
    .map(part => part.replace(/^['"]|['"]$/g, ''))
    .includes(token);
}

function releaseMutationIndexes(lines: string[]): number[] {
  return lines
    .map((line, index) => ({ line, index }))
    .filter(
      ({ line }) =>
        /^& gh release (?:upload|edit|create)\b/.test(line) || /^& gh @\w+$/.test(line)
    )
    .map(({ index }) => index);
}

function extractReleaseLookupDecision(): string {
  const lines = effectivePowerShellLines(
    extractReleaseRunBlock('Create or update GitHub Release')
  );
  const start = lines.findIndex(
    line =>
      line.startsWith('$releaseLookupErrorActionPreference =') ||
      line.startsWith('$releaseLookup = & gh api ')
  );
  const end = lines.indexOf('if ($exists) {', start + 1);

  if (start === -1 || end === -1) {
    throw new Error('Release lookup decision block not found');
  }

  return lines.slice(start, end).join('\r\n');
}

function runReleaseLookupWithHttpError(statusCode: number) {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'release-workflow-'));
  const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') ?? 'Path';
  const environment = { ...process.env };
  environment[pathKey] = `${tempDirectory};${environment[pathKey] ?? ''}`;

  writeFileSync(
    join(tempDirectory, 'gh.cmd'),
    `@echo off\r\necho gh: synthetic response ^(HTTP ${statusCode}^) 1>&2\r\nexit /b 1\r\n`
  );

  try {
    return spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        [
          "$ErrorActionPreference = 'Stop'",
          "$env:GITHUB_REPOSITORY = 'example/repository'",
          "$tag = 'v1.2.3'",
          extractReleaseLookupDecision(),
          'Write-Output "exists=$exists"',
        ].join('\r\n'),
      ],
      { encoding: 'utf8', env: environment, windowsHide: true }
    );
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

function runResolveReleaseTagForTagPush() {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'release-tag-push-'));
  const outputPath = join(tempDirectory, 'github-output.txt');
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (key.toLowerCase() === 'raw_tag_input' || key.toLowerCase() === 'raw_publish_input') {
      delete environment[key];
    }
  }
  Object.assign(environment, {
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF_NAME: 'v3.0.7',
    GITHUB_REF_TYPE: 'tag',
    GITHUB_OUTPUT: outputPath,
  });

  try {
    const result = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        ["$ErrorActionPreference = 'Stop'", extractReleaseRunBlock('Resolve release tag')].join(
          '\r\n'
        ),
      ],
      { cwd: process.cwd(), encoding: 'utf8', env: environment, windowsHide: true }
    );
    const outputBytes = result.status === 0 ? readFileSync(outputPath) : Buffer.alloc(0);
    const output =
      outputBytes[0] === 0xff && outputBytes[1] === 0xfe
        ? outputBytes.subarray(2).toString('utf16le')
        : outputBytes.toString('utf8');
    return { output, result };
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

describe('release workflow safety contract', () => {
  it('requires an explicit manual publish opt-in and a tag', () => {
    expect(releaseWorkflow).toMatch(
      /workflow_dispatch:[\s\S]*?publish:\s*\n[\s\S]*?default:\s*false/
    );
    expect(releaseWorkflow).toContain("throw 'tag is required when publish=true'");
    expect(releaseWorkflow).toContain('publish=$($shouldPublish.ToString().ToLowerInvariant())');
    expect(releaseWorkflow).toMatch(
      /- name: Create or update GitHub Release\s*\n\s+if: steps\.meta\.outputs\.publish == 'true'/
    );
  });

  it('checks out and verifies the exact tag source before publishing', () => {
    expect(releaseWorkflow).toContain(
      "ref: ${{ github.event_name == 'workflow_dispatch' && inputs.tag != '' && inputs.tag || github.ref }}"
    );
    expect(releaseWorkflow).toContain('$headSha = (git rev-parse HEAD).Trim()');
    expect(releaseWorkflow).toContain('$tagSha = (git rev-list -n 1 $tag).Trim()');
    expect(releaseWorkflow).toContain('Checkout/tag mismatch');
  });

  it('passes dynamic release values through env and validates the tag before shell use', () => {
    const resolveStep = releaseWorkflow.match(
      /- name: Resolve release tag[\s\S]*?\n\s+- name: Verify tag and successful Quality Gate/
    )?.[0];

    expect(resolveStep).toBeDefined();
    expect(resolveStep).toContain('RAW_TAG_INPUT: ${{ inputs.tag }}');
    expect(resolveStep).toContain('RAW_PUBLISH_INPUT: ${{ inputs.publish }}');
    expect(resolveStep).toContain('$inputTag = ([string]$env:RAW_TAG_INPUT).Trim()');
    expect(resolveStep).not.toContain("$inputTag = '${{ inputs.tag }}'");
    expect(resolveStep).toContain(
      "if ($tag -notmatch '^v\\d+\\.\\d+\\.\\d+(?:-(?:alpha|beta|rc)\\.\\d+)?$')"
    );
    expect(releaseWorkflow).not.toContain("$tag = '${{ steps.meta.outputs.tag }}'");
    expect(releaseWorkflow).not.toMatch(
      /--(?:tag|version) \$\{\{ steps\.meta\.outputs\.(?:tag|version) \}\}/
    );
  });

  it('resolves a tag push when workflow dispatch inputs are absent', () => {
    const { output, result } = runResolveReleaseTagForTagPush();

    expect(result.status, result.stderr).toBe(0);
    expect(output).toContain('tag=v3.0.7');
    expect(output).toContain('version=3.0.7');
    expect(output).toContain('publish=true');
    expect(output).toContain('is_prerelease=false');
  });

  it('fails closed unless the tag SHA has a successful main Quality Gate run', () => {
    expect(releaseWorkflow).toMatch(/permissions:[\s\S]*?actions:\s*read/);
    expect(releaseWorkflow).toContain('Verify tag and successful Quality Gate');
    expect(releaseWorkflow).toContain('--workflow test.yml');
    expect(releaseWorkflow).toContain('--commit $tagSha');
    expect(releaseWorkflow).toContain("$_.headBranch -eq 'main'");
    expect(releaseWorkflow).toContain("$_.conclusion -eq 'success'");
    expect(releaseWorkflow).toContain('No successful Quality Gate');
  });

  it('pins release actions and prevents checkout credential persistence', () => {
    const checkoutStep = extractReleaseStep('Checkout');
    const setupNodeStep = extractReleaseStep('Setup Node.js');
    const uploadArtifactStep = extractReleaseStep('Upload workflow artifacts');

    expect(checkoutStep).toMatch(
      /^\s*uses: actions\/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4\.3\.1\s*$/m
    );
    expect(checkoutStep).toMatch(/^\s*persist-credentials: false\s*$/m);
    expect(setupNodeStep).toMatch(
      /^\s*uses: actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4\.4\.0\s*$/m
    );
    expect(uploadArtifactStep).toMatch(
      /^\s*uses: actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4\.6\.2\s*$/m
    );
  });

  it('uses the effective tag for concurrency and never normalizes manual tag input', () => {
    const concurrencyStart = releaseWorkflow.indexOf('\nconcurrency:');
    const jobsStart = releaseWorkflow.indexOf('\njobs:', concurrencyStart);
    const concurrencyBlock = releaseWorkflow.slice(concurrencyStart, jobsStart);
    const dispatchStart = releaseWorkflow.indexOf('  workflow_dispatch:');
    const permissionsStart = releaseWorkflow.indexOf('\npermissions:', dispatchStart);
    const dispatchBlock = releaseWorkflow.slice(dispatchStart, permissionsStart);
    const resolveRun = extractReleaseRunBlock('Resolve release tag');

    expect(concurrencyBlock).toMatch(
      /^\s*group: release-\$\{\{ inputs\.tag \|\| github\.ref_name \}\}\s*$/m
    );
    expect(dispatchBlock).toMatch(/tag:[\s\S]*description:.*must include v/);
    expect(resolveRun).not.toContain(`if ($tag -notmatch '^v') { $tag = "v$tag" }`);
    expect(resolveRun).toContain(
      "if ($tag -notmatch '^v\\d+\\.\\d+\\.\\d+(?:-(?:alpha|beta|rc)\\.\\d+)?$')"
    );
  });

  it('requires an annotated tag at the checked-out commit and verifies it on create', () => {
    const verifyRun = extractReleaseRunBlock('Verify tag and successful Quality Gate');
    const releaseRun = extractReleaseRunBlock('Create or update GitHub Release');
    const verifyLines = effectivePowerShellLines(verifyRun);
    const releaseLines = effectivePowerShellLines(releaseRun);
    const tagTypeIndex = verifyLines.indexOf(
      '$tagType = (git cat-file -t "refs/tags/$tag").Trim()'
    );
    const headShaIndex = verifyLines.indexOf('$headSha = (git rev-parse HEAD).Trim()');
    const peeledShaIndex = verifyLines.indexOf('$tagSha = (git rev-list -n 1 $tag).Trim()');
    const mismatchIndex = verifyLines.indexOf('if ($headSha -ne $tagSha) {');
    const createArgs = releaseLines.find(line => line.startsWith('$createArgs = @('));

    expect(verifyRun).toContain('git show-ref --verify --quiet "refs/tags/$tag"');
    expect(tagTypeIndex).toBeGreaterThan(-1);
    expect(verifyLines[tagTypeIndex + 1]).toMatch(/^if \(\$LASTEXITCODE -ne 0\) \{ throw /);
    expect(verifyRun).toContain("if ($tagType -ne 'tag')");
    expect(headShaIndex).toBeGreaterThan(tagTypeIndex);
    expect(peeledShaIndex).toBeGreaterThan(headShaIndex);
    expect(mismatchIndex).toBeGreaterThan(peeledShaIndex);
    expect(createArgs).toBeDefined();
    expect(hasPowerShellToken(createArgs ?? '', '--verify-tag')).toBe(true);
  });

  it('treats only an explicit release lookup HTTP 404 as absent', () => {
    const releaseRun = extractReleaseRunBlock('Create or update GitHub Release');
    const lines = effectivePowerShellLines(releaseRun);
    const preferenceIndex = lines.indexOf(
      '$releaseLookupErrorActionPreference = $ErrorActionPreference'
    );
    const tryIndex = lines.indexOf('try {', preferenceIndex + 1);
    const continueIndex = lines.indexOf("$ErrorActionPreference = 'Continue'", tryIndex + 1);
    const lookupIndex = lines.indexOf(
      '$releaseLookup = & gh api "repos/$env:GITHUB_REPOSITORY/releases/tags/$tag" 2>&1'
    );
    const exitCodeIndex = lines.indexOf('$releaseLookupExitCode = $LASTEXITCODE');
    const finallyIndex = lines.indexOf('} finally {', exitCodeIndex + 1);
    const restoreIndex = lines.indexOf(
      '$ErrorActionPreference = $releaseLookupErrorActionPreference',
      finallyIndex + 1
    );
    const decisionIndex = lines.indexOf('if ($releaseLookupExitCode -eq 0) {');

    expect(preferenceIndex).toBeGreaterThan(-1);
    expect(tryIndex).toBeGreaterThan(preferenceIndex);
    expect(continueIndex).toBeGreaterThan(tryIndex);
    expect(lookupIndex).toBeGreaterThan(continueIndex);
    expect(lines[lookupIndex + 1]).toBe('$releaseLookupExitCode = $LASTEXITCODE');
    expect(finallyIndex).toBeGreaterThan(exitCodeIndex);
    expect(lines[finallyIndex + 1]).toBe(
      '$ErrorActionPreference = $releaseLookupErrorActionPreference'
    );
    expect(decisionIndex).toBeGreaterThan(restoreIndex);
    expect(releaseRun).toMatch(
      /if \(\$releaseLookupExitCode -eq 0\) \{[\s\S]*?\} elseif \(\(\$releaseLookup \| Out-String\) -match '\\\(HTTP 404\\\)'\) \{[\s\S]*?\} else \{\s*throw /
    );
    expect(releaseRun).not.toContain('gh release view $tag 2>$null');
  });

  it.skipIf(process.platform !== 'win32')(
    'handles a release lookup HTTP 404 under stop error preference',
    () => {
      const result = runReleaseLookupWithHttpError(404);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('exists=False');
    }
  );

  it.skipIf(process.platform !== 'win32')(
    'fails a release lookup HTTP 403 under stop error preference',
    () => {
      const result = runReleaseLookupWithHttpError(403);
      const output = `${result.stdout}\n${result.stderr}`;

      expect(result.status).not.toBe(0);
      expect(output).toContain('Unable to query release');
    }
  );

  it('checks every release mutation exit code immediately', () => {
    const releaseRun = extractReleaseRunBlock('Create or update GitHub Release');
    const lines = effectivePowerShellLines(releaseRun);
    const mutationIndexes = releaseMutationIndexes(lines);

    expect(mutationIndexes).toHaveLength(4);
    for (const index of mutationIndexes) {
      expect(lines[index + 1]).toMatch(/^if \(\$LASTEXITCODE -ne 0\) \{ throw /);
    }
  });

  it('publishes explicit non-draft release modes without forcing latest', () => {
    const releaseRun = extractReleaseRunBlock('Create or update GitHub Release');
    const lines = effectivePowerShellLines(releaseRun);
    const editCalls = lines.filter(line => line.startsWith('& gh release edit '));
    const prereleaseEdit = editCalls.find(
      line =>
        hasPowerShellToken(line, '--prerelease') &&
        !hasPowerShellToken(line, '--prerelease=false')
    );
    const gaEdit = editCalls.find(line => hasPowerShellToken(line, '--prerelease=false'));
    const createArgs = lines.find(line => line.startsWith('$createArgs = @('));
    const addPrerelease = lines.filter(
      line => line.startsWith('if ($isPre)') && hasPowerShellToken(line, '--prerelease')
    );

    expect(editCalls).toHaveLength(2);
    expect(prereleaseEdit).toBeDefined();
    expect(gaEdit).toBeDefined();
    expect(hasPowerShellToken(prereleaseEdit ?? '', '--draft=false')).toBe(true);
    expect(hasPowerShellToken(gaEdit ?? '', '--draft=false')).toBe(true);
    expect(createArgs).toBeDefined();
    expect(hasPowerShellToken(createArgs ?? '', '--draft=false')).toBe(true);
    expect(hasPowerShellToken(createArgs ?? '', '--prerelease')).toBe(false);
    expect(hasPowerShellToken(createArgs ?? '', '--prerelease=false')).toBe(false);
    expect(addPrerelease).toHaveLength(1);
    expect(lines.some(line => hasPowerShellToken(line, '--latest'))).toBe(false);
  });

  it('verifies the persisted draft and prerelease state after mutation', () => {
    const releaseRun = extractReleaseRunBlock('Create or update GitHub Release');
    const lines = effectivePowerShellLines(releaseRun);
    const mutationIndexes = releaseMutationIndexes(lines);
    const viewIndex = lines.indexOf(
      '$releaseStateJson = & gh release view $tag --json isDraft,isPrerelease'
    );

    expect(viewIndex).toBeGreaterThan(Math.max(...mutationIndexes));
    expect(lines[viewIndex + 1]).toMatch(/^if \(\$LASTEXITCODE -ne 0\) \{ throw /);
    expect(releaseRun).toContain('$releaseState = $releaseStateJson | ConvertFrom-Json');
    expect(releaseRun).toContain('if ([bool]$releaseState.isDraft)');
    expect(releaseRun).toContain('if ([bool]$releaseState.isPrerelease -ne $isPre)');
  });
});

describe('quality workflow safety contract', () => {
  it('pins every third-party action in the release trust chain', () => {
    const actionReferences = Array.from(
      qualityWorkflow.matchAll(/uses:\s+(actions\/[^@\s]+)@([^\s#]+)/g),
      match => ({ action: match[1], reference: match[2] })
    );

    expect(actionReferences.length).toBeGreaterThan(0);
    actionReferences.forEach(({ action, reference }) => {
      expect(reference, `${action} must use a full commit SHA`).toMatch(/^[a-f0-9]{40}$/);
    });
  });

  it('runs the production dependency audit even when performance fails', () => {
    const auditJob = qualityWorkflow.match(/\n  npm-audit:[\s\S]*?\n  required:/)?.[0];

    expect(auditJob).toBeDefined();
    expect(auditJob).toContain('needs: build');
    expect(auditJob).not.toContain('needs: performance');
  });
});
