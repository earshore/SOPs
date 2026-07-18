import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('release web assets', () => {
  it('provides a non-empty search description', () => {
    const indexHtml = read('index.html');
    const description = indexHtml.match(
      /<meta\s+name="description"\s+content="([^"]+)"\s*\/?>/i
    )?.[1];

    expect(description?.trim().length).toBeGreaterThan(20);
  });

  it('serves an explicit valid robots.txt instead of the SPA document', () => {
    const robotsPath = resolve(process.cwd(), 'public/robots.txt');

    expect(existsSync(robotsPath)).toBe(true);
    if (!existsSync(robotsPath)) return;

    const robots = read('public/robots.txt');
    expect(robots).toMatch(/^User-agent:\s*\*/im);
    expect(robots).toMatch(/^Allow:\s*\/$/im);
    expect(robots).not.toMatch(/<html/i);
  });

  it('keeps robots.txt out of the Vercel SPA fallback', () => {
    const vercel = JSON.parse(read('vercel.json')) as {
      rewrites: Array<{ destination: string; source: string }>;
    };
    const robotsRewrite = vercel.rewrites.find(rewrite => rewrite.source === '/robots.txt');
    const spaFallback = vercel.rewrites.find(rewrite => rewrite.destination === '/index.html');

    expect(robotsRewrite?.destination).toBe('/robots.txt');
    expect(spaFallback?.source).toContain('robots\\.txt');
  });

  it('prevents Cloudflare from serving the SPA document for missing assets', () => {
    const notFoundPath = resolve(process.cwd(), 'public/404.html');

    expect(existsSync(notFoundPath)).toBe(true);
    if (!existsSync(notFoundPath)) return;

    const notFound = read('public/404.html');
    const headers = read('public/_headers');
    expect(notFound).toMatch(/<!doctype html>/i);
    expect(notFound).toMatch(/<meta\s+name="robots"\s+content="noindex"/i);
    expect(headers).not.toMatch(/\/assets\/\*\s*\r?\n\s*Cache-Control:\s*[^\r\n]*immutable/i);
  });

  it('hides initial main content until route layout is stable', () => {
    const indexHtml = read('index.html');
    const criticalCss = read('src/css/critical.css');

    expect(indexHtml).toMatch(/id="main-content"[\s\S]*?class="[^"]*app-shell-pending/);
    expect(criticalCss).toMatch(/\.app-shell-pending\s*{[^}]*visibility:\s*hidden/s);
  });

  it('waits for the home view and main styles before the initial reveal', () => {
    const mainSource = read('src/main.ts');
    const sourceFile = ts.createSourceFile(
      'src/main.ts',
      mainSource,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const startupListeners: Array<ts.ArrowFunction | ts.FunctionExpression> = [];
    const findStartupListener = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const [eventName, listener] = node.arguments;
        if (
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === 'document' &&
          node.expression.name.text === 'addEventListener' &&
          eventName &&
          ts.isStringLiteral(eventName) &&
          eventName.text === 'DOMContentLoaded' &&
          listener &&
          (ts.isArrowFunction(listener) || ts.isFunctionExpression(listener))
        ) {
          startupListeners.push(listener);
        }
      }
      ts.forEachChild(node, findStartupListener);
    };
    findStartupListener(sourceFile);

    if (startupListeners.length !== 1) {
      throw new Error(`Expected one DOMContentLoaded listener, found ${startupListeners.length}`);
    }
    const [startupListener] = startupListeners;
    if (!startupListener || !ts.isBlock(startupListener.body)) {
      throw new Error('DOMContentLoaded listener must have a block body');
    }

    const homeWaitBranches: ts.IfStatement[] = [];
    const findHomeWaitBranch = (node: ts.Node): void => {
      if (
        ts.isIfStatement(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'shouldWaitForHomeView'
      ) {
        homeWaitBranches.push(node);
      }
      ts.forEachChild(node, findHomeWaitBranch);
    };
    findHomeWaitBranch(startupListener.body);

    if (homeWaitBranches.length !== 1) {
      throw new Error(`Expected one home wait branch, found ${homeWaitBranches.length}`);
    }
    const [homeWaitBranch] = homeWaitBranches;
    if (!homeWaitBranch || !ts.isBlock(homeWaitBranch.thenStatement)) {
      throw new Error('Home wait branch must have a block body');
    }

    const [firstStatement] = homeWaitBranch.thenStatement.statements;
    if (
      !firstStatement ||
      !ts.isExpressionStatement(firstStatement) ||
      !ts.isAwaitExpression(firstStatement.expression) ||
      !ts.isCallExpression(firstStatement.expression.expression)
    ) {
      throw new Error('Home wait branch must begin with an awaited call');
    }

    const promiseAllCall = firstStatement.expression.expression;
    if (
      !ts.isPropertyAccessExpression(promiseAllCall.expression) ||
      !ts.isIdentifier(promiseAllCall.expression.expression) ||
      promiseAllCall.expression.expression.text !== 'Promise' ||
      promiseAllCall.expression.name.text !== 'all'
    ) {
      throw new Error('Home wait branch must begin with await Promise.all');
    }

    const [readyPromises] = promiseAllCall.arguments;
    if (promiseAllCall.arguments.length !== 1 || !readyPromises || !ts.isArrayLiteralExpression(readyPromises)) {
      throw new Error('Promise.all must receive one readiness array');
    }
    const [homeViewReady, mainStylesReady] = readyPromises.elements;
    if (
      readyPromises.elements.length !== 2 ||
      !homeViewReady ||
      !ts.isIdentifier(homeViewReady) ||
      homeViewReady.text !== 'homeViewReady' ||
      !mainStylesReady ||
      !ts.isIdentifier(mainStylesReady) ||
      mainStylesReady.text !== 'mainStylesReady'
    ) {
      throw new Error('Promise.all must await homeViewReady then mainStylesReady');
    }

    const revealBranches = homeWaitBranch.thenStatement.statements.filter(
      (statement): statement is ts.IfStatement =>
        ts.isIfStatement(statement) &&
        ts.isCallExpression(statement.expression) &&
        ts.isIdentifier(statement.expression.expression) &&
        statement.expression.expression.text === 'revealInitialHomeView'
    );
    const [revealBranch] = revealBranches;
    if (
      revealBranches.length !== 1 ||
      !revealBranch ||
      !ts.isBlock(revealBranch.thenStatement)
    ) {
      throw new Error('Home wait branch must contain one revealInitialHomeView block');
    }

    const directCallNames = revealBranch.thenStatement.statements.flatMap(statement => {
      if (
        !ts.isExpressionStatement(statement) ||
        !ts.isCallExpression(statement.expression) ||
        !ts.isIdentifier(statement.expression.expression)
      ) {
        return [];
      }
      return [statement.expression.expression.text];
    });
    expect(directCallNames).toEqual(['initializeHomeSplashOnce', 'revealMainContent']);
  });

  it('reveals main content on terminal bootstrap failures', () => {
    const mainSource = read('src/main.ts');
    const startup = mainSource.slice(mainSource.indexOf("document.addEventListener('DOMContentLoaded'"));

    expect(startup).toMatch(
      /if \(!result\.success\)\s*{[\s\S]*?revealMainContent\(\);[\s\S]*?return;/
    );
    expect(startup).toMatch(
      /catch \(error\)\s*{[\s\S]*?revealMainContent\(\);[\s\S]*?showToast/
    );
  });
});
