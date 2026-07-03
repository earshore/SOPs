import { expect, it } from 'vitest';
import {
  createSafeFragment,
  escapeHtml,
  escapeObject,
  isSafeUrl,
  safeLink,
  safeMarkdown,
  safeTemplate,
  setSafeHtml,
  setTextContent,
} from '@/common/utils/security';

  it('escapes HTML special characters and ignores non-string values', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
    );
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    expect(escapeHtml('"Hello" \'World\' `x` = y')).toBe(
      '&quot;Hello&quot; &#x27;World&#x27; &#x60;x&#x60; &#x3D; y'
    );
    expect(escapeHtml(null as unknown as string)).toBe('');
  });

  it('escapes nested object and array string values without changing other values', () => {
    const result = escapeObject({
      title: '<b>Title</b>',
      nested: {
        html: '<img>',
        count: 2,
        enabled: true,
        nil: null,
      },
      list: ['<script>', 'safe'],
    });

    expect(result).toEqual({
      title: '&lt;b&gt;Title&lt;&#x2F;b&gt;',
      nested: {
        html: '&lt;img&gt;',
        count: 2,
        enabled: true,
        nil: null,
      },
      list: ['&lt;script&gt;', 'safe'],
    });
    expect(escapeObject(null)).toBeNull();
  });

  it('sets text and renders templates without interpreting untrusted HTML', () => {
    const element = document.createElement('div');

    setTextContent(element, '<script>alert("XSS")</script>');
    expect(element.textContent).toBe('<script>alert("XSS")</script>');
    expect(element.querySelector('script')).toBeNull();

    expect(safeTemplate('<h1>${title}</h1><p>${missing}</p>', {
      title: '<b>Unsafe</b>',
    })).toBe('<h1>&lt;b&gt;Unsafe&lt;&#x2F;b&gt;</h1><p></p>');
    expect(() => setTextContent(null, 'ignored')).not.toThrow();
  });

  it('creates safe fragments by removing dangerous elements, attributes, and URLs', () => {
    const fragment = createSafeFragment(`
      <div onclick="bad()">Safe</div>
      <script>alert(1)</script>
      <iframe src="https://evil.example"></iframe>
      <a href="javascript:alert(1)">link</a>
      <img src="/ok.png" onerror="bad()">
    `);
    const container = document.createElement('div');
    container.appendChild(fragment);

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Safe');
    expect(container.querySelector('[onclick]')).toBeNull();
    expect(container.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('img')).toBeInstanceOf(HTMLImageElement);
  });

  it('creates safe fragments when SVG href properties are not strings', () => {
    const descriptor = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'href');
    Object.defineProperty(SVGElement.prototype, 'href', {
      configurable: true,
      get: () => ({ baseVal: '#decorGrad' }),
    });

    try {
      const fragment = createSafeFragment(`
        <svg viewBox="0 0 10 10">
          <defs>
            <linearGradient id="decorGrad"></linearGradient>
          </defs>
          <circle cx="5" cy="5" r="4" stroke="url(#decorGrad)" />
        </svg>
      `);
      const container = document.createElement('div');
      container.appendChild(fragment);

      expect(container.querySelector('svg')).not.toBeNull();
    } finally {
      if (descriptor) {
        Object.defineProperty(SVGElement.prototype, 'href', descriptor);
      } else {
        delete (SVGElement.prototype as { href?: unknown }).href;
      }
    }
  });

  it('replaces existing content with sanitized HTML', () => {
    const element = document.createElement('div');
    element.innerHTML = '<span>old</span>';

    setSafeHtml(element, '<p>new</p><script>bad()</script>');

    expect(element.innerHTML).toContain('<p>new</p>');
    expect(element.innerHTML).not.toContain('old');
    expect(element.querySelector('script')).toBeNull();
    expect(() => setSafeHtml(null, '<p>ignored</p>')).not.toThrow();
  });

  it('classifies safe and unsafe URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('/relative/path')).toBe(true);
    expect(isSafeUrl('  javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>bad()</script>')).toBe(false);
    expect(isSafeUrl('vbscript:msgbox("x")')).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
  });

  it('builds safe links or returns escaped text for unsafe links', () => {
    expect(safeLink('https://example.com?q=<x>', '<Open>')).toBe(
      '<a href="https:&#x2F;&#x2F;example.com?q&#x3D;&lt;x&gt;" target="_blank" rel="noopener noreferrer">&lt;Open&gt;</a>'
    );
    expect(safeLink('javascript:alert(1)', '<Click>')).toBe('&lt;Click&gt;');
  });

  it('renders markdown through a provided parser and sanitizes parser output', () => {
    const parser = () => '<h1 onclick="bad()">Title</h1><script>bad()</script>';

    const html = safeMarkdown('# title', parser);

    expect(html).toBe('<h1>Title</h1>');
  });

  it('escapes markdown when no parser is provided', () => {
    expect(safeMarkdown('<b>plain</b>')).toBe('&lt;b&gt;plain&lt;&#x2F;b&gt;');
  });
