import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderList,
  scanXSSRisks,
  setAttr,
  setInnerHTML,
  setTemplate,
  setText,
} from '@/common/utils/xssFixer';

describe('xssFixer safe DOM helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('sanitizes untrusted HTML while preserving safe markup', () => {
    const element = document.createElement('div');

    setInnerHTML(element, '<p>Safe</p><script>alert("xss")</script><button onclick="bad()">Click</button>');

    expect(element.querySelector('p')?.textContent).toBe('Safe');
    expect(element.querySelector('script')).toBeNull();
    expect(element.querySelector('button')?.hasAttribute('onclick')).toBe(false);
  });

  it('allows trusted static HTML templates without escaping them', () => {
    const element = document.createElement('div');

    setInnerHTML(element, '<section><strong>Trusted</strong></section>', true);

    expect(element.innerHTML).toBe('<section><strong>Trusted</strong></section>');
  });

  it('escapes template variables unless the key is explicitly trusted', () => {
    const element = document.createElement('div');

    setTemplate(
      element,
      '<article>${title}<div>${body}</div></article>',
      {
        title: '<img src=x onerror=alert(1)>',
        body: '<strong>Allowed body</strong>',
      },
      ['body']
    );

    expect(element.querySelector('article')?.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('strong')?.textContent).toBe('Allowed body');
  });

  it('renders untrusted list items through the sanitizer', () => {
    const element = document.createElement('ul');

    renderList(element, ['one', 'two'], (item) => `<li onclick="bad()">${item}</li>`);

    expect([...element.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['one', 'two']);
    expect(element.querySelector('li')?.hasAttribute('onclick')).toBe(false);
  });

  it('clears list containers when the item list is empty', () => {
    const element = document.createElement('ul');
    element.innerHTML = '<li>stale</li>';

    renderList(element, [], (item) => `<li>${item}</li>`);

    expect(element.children).toHaveLength(0);
  });

  it('sets text content without interpreting HTML', () => {
    const element = document.createElement('div');

    setText(element, '<strong>plain text</strong>');

    expect(element.textContent).toBe('<strong>plain text</strong>');
    expect(element.querySelector('strong')).toBeNull();
  });

  it('blocks event handler attributes and unsafe URLs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const anchor = document.createElement('a');

    setAttr(anchor, 'onclick', 'alert(1)');
    setAttr(anchor, 'href', ' javascript:alert(1)');
    setAttr(anchor, 'href', 'https://example.com/report');

    expect(anchor.hasAttribute('onclick')).toBe(false);
    expect(anchor.getAttribute('href')).toBe('https://example.com/report');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('reports dangerous attributes and javascript URLs in a subtree', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button onclick="bad()">Run</button>
      <a href="javascript:alert(1)">Bad link</a>
      <a href="https://example.com">Good link</a>
    `;

    const risks = scanXSSRisks(root);

    expect(risks).toHaveLength(2);
    expect(risks.map((risk) => risk.type)).toEqual(['dangerous-attribute', 'dangerous-url']);
    expect(risks.every((risk) => risk.severity === 'high')).toBe(true);
  });
});
