import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DEEP_CHAT_ROOT = join(process.cwd(), 'src/modules/app_center/views/playground/deep-chat');

const ROOT_FILE_WHITELIST = new Set([
  'index.ts',
  'controller.ts',
  'types.ts',
  'constants.ts',
  'template.html',
  'index.test.ts',
  'package.structure.test.ts',
]);

const REQUIRED_DOMAIN_FILES = [
  'session/sessionState.ts',
  'session/uiHooks.ts',
  'session/domHelpers.ts',
  'session/mountContext.ts',
  'session/threadStore.ts',
  'session/pendingRuntime.ts',
  'session/sessionLifecycle.ts',
  'session/conversationContext.ts',
  'request/handleRequest.ts',
  'request/llmCall.ts',
  'request/lifecycle.ts',
  'request/budget.ts',
  'request/businessTools.ts',
  'composer/composerUi.ts',
  'composer/draftPersistence.ts',
  'composer/messageToolbar.ts',
  'composer/skillContextChip.ts',
  'composer/promptDrafts.ts',
  'chrome/generationChrome.ts',
  'shell/shellUi.ts',
  'shell/renderers.ts',
  'shell/skillLibrary.ts',
  'shell/promptPreview.ts',
  'integrations/handoffs.ts',
  'infra/deepChatConfig.ts',
  'infra/deepChatElementLoader.ts',
  'infra/deepChatStyles.ts',
  'infra/utils.ts',
  'infra/confirmModal.ts',
];

const FORBIDDEN_ROOT_BASENAMES = [
  'requestLifecycle.ts',
  'requestBudget.ts',
  'deepChatBusinessTools.ts',
  'conversationContext.ts',
  'draftPersistence.ts',
  'messageToolbar.ts',
  'skillContextChip.ts',
  'promptDrafts.ts',
  'promptPreview.ts',
  'skillLibrary.ts',
  'renderers.ts',
  'deepChatConfig.ts',
  'deepChatElementLoader.ts',
  'deepChatStyles.ts',
  'utils.ts',
  'controller.split.test.ts',
];

describe('deep-chat package structure', () => {
  it('keeps thin controller and stable public exports', () => {
    const controller = readFileSync(join(DEEP_CHAT_ROOT, 'controller.ts'), 'utf8');
    const lineCount = controller.split(/\r?\n/).length;
    expect(lineCount).toBeLessThan(600);

    const indexSrc = readFileSync(join(DEEP_CHAT_ROOT, 'index.ts'), 'utf8');
    expect(indexSrc).toContain('mount');
    expect(indexSrc).toContain('unmount');
    expect(indexSrc).toContain('clearDeepChatThreadStore');
    expect(indexSrc).toContain('consumePendingSkillHandoff');
    expect(indexSrc.split(/\r?\n/).length).toBeLessThan(30);
  });

  it('places required domain modules', () => {
    for (const rel of REQUIRED_DOMAIN_FILES) {
      expect(existsSync(join(DEEP_CHAT_ROOT, rel)), rel).toBe(true);
    }
  });

  it('keeps root business files on whitelist only', () => {
    const rootEntries = readdirSync(DEEP_CHAT_ROOT).filter(name => {
      const p = join(DEEP_CHAT_ROOT, name);
      return statSync(p).isFile();
    });
    for (const name of rootEntries) {
      expect(ROOT_FILE_WHITELIST.has(name), `unexpected root file: ${name}`).toBe(true);
    }
    for (const banned of FORBIDDEN_ROOT_BASENAMES) {
      expect(existsSync(join(DEEP_CHAT_ROOT, banned)), banned).toBe(false);
    }
  });

  it('forbids file-level eslint-disable and ts-nocheck in package sources', () => {
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          out.push(...walk(p));
        } else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) {
          out.push(p);
        }
      }
      return out;
    }
    for (const file of walk(DEEP_CHAT_ROOT)) {
      const src = readFileSync(file, 'utf8');
      expect(src.includes('@ts-nocheck'), file).toBe(false);
      // Allow eslint-disable-next-line; ban file-level / block-level broad disables only.
      const fileLevel =
        /^\/\*\s*eslint-disable(?!-next-line)\b/m.test(src) ||
        /^\/\/\s*eslint-disable(?!-next-line)\b/m.test(src);
      expect(fileLevel, file).toBe(false);
    }
  });

  it('wires controller to domain entrypoints without re-hydrating god-file', () => {
    const controller = readFileSync(join(DEEP_CHAT_ROOT, 'controller.ts'), 'utf8');
    expect(controller).toContain('./session/threadStore');
    expect(controller).toContain('./shell/shellUi');
    expect(controller).toContain('./composer/composerUi');
    expect(controller).toContain('./chrome/generationChrome');
    expect(controller).toContain('./integrations/handoffs');
    const shell = readFileSync(join(DEEP_CHAT_ROOT, 'shell/shellUi.ts'), 'utf8');
    expect(shell).toMatch(/handleDeepChatRequest|from ['"].*handleRequest/);
  });

  it('keeps session free of static shell imports', () => {
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          out.push(...walk(p));
        } else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) {
          out.push(p);
        }
      }
      return out;
    }
    for (const file of walk(join(DEEP_CHAT_ROOT, 'session'))) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/from ['"]\.\.\/shell\//);
    }
  });
});
