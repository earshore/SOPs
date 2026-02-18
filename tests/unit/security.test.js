// tests/unit/security.test.js
// ================================================================
// 安全工具函数测试
// ================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  escapeHtml,
  escapeObject,
  setTextContent,
  safeTemplate,
  createSafeFragment,
  setSafeHtml,
  isSafeUrl,
  safeLink
} from '@/common/utils/security';

describe('Security Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';
      
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"Hello" \'World\'')).toBe('&quot;Hello&quot; &#x27;World&#x27;');
    });

    it('should escape backticks and equals', () => {
      expect(escapeHtml('`test` = value')).toBe('&#x60;test&#x60; &#x3D; value');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(123)).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('escapeObject', () => {
    it('should escape string values in object', () => {
      const input = {
        name: '<script>alert("XSS")</script>',
        age: 25
      };
      
      const result = escapeObject(input);
      
      expect(result.name).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(result.age).toBe(25);
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          email: 'test@example.com'
        }
      };
      
      const result = escapeObject(input);
      
      expect(result.user.name).toBe('&lt;b&gt;John&lt;&#x2F;b&gt;');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle arrays', () => {
      const input = ['<script>', 'safe', '<img>'];
      
      const result = escapeObject(input);
      
      expect(result[0]).toBe('&lt;script&gt;');
      expect(result[1]).toBe('safe');
      expect(result[2]).toBe('&lt;img&gt;');
    });

    it('should handle null and undefined', () => {
      expect(escapeObject(null)).toBeNull();
      expect(escapeObject(undefined)).toBeUndefined();
    });

    it('should preserve non-string values', () => {
      const input = {
        str: '<b>test</b>',
        num: 42,
        bool: true,
        nil: null
      };
      
      const result = escapeObject(input);
      
      expect(result.str).toBe('&lt;b&gt;test&lt;&#x2F;b&gt;');
      expect(result.num).toBe(42);
      expect(result.bool).toBe(true);
      expect(result.nil).toBeNull();
    });
  });

  describe('setTextContent', () => {
    it('should set text content safely', () => {
      const element = document.createElement('div');
      
      setTextContent(element, '<script>alert("XSS")</script>');
      
      expect(element.textContent).toBe('<script>alert("XSS")</script>');
      expect(element.innerHTML).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    it('should handle null element gracefully', () => {
      expect(() => {
        setTextContent(null, 'test');
      }).not.toThrow();
    });

    it('should handle empty text', () => {
      const element = document.createElement('div');
      element.textContent = 'initial';
      
      setTextContent(element, '');
      
      expect(element.textContent).toBe('');
    });
  });

  describe('safeTemplate', () => {
    it('should render template with escaped variables', () => {
      const template = '<div class="item">${title}</div>';
      const data = { title: '<script>bad</script>' };
      
      const result = safeTemplate(template, data);
      
      expect(result).toBe('<div class="item">&lt;script&gt;bad&lt;&#x2F;script&gt;</div>');
    });

    it('should handle multiple variables', () => {
      const template = '<h1>${title}</h1><p>${content}</p>';
      const data = {
        title: '<b>Title</b>',
        content: 'Safe content'
      };
      
      const result = safeTemplate(template, data);
      
      expect(result).toContain('&lt;b&gt;Title&lt;&#x2F;b&gt;');
      expect(result).toContain('Safe content');
    });

    it('should handle missing variables', () => {
      const template = '<div>${missing}</div>';
      const data = {};
      
      const result = safeTemplate(template, data);
      
      expect(result).toBe('<div></div>');
    });

    it('should handle null and undefined values', () => {
      const template = '<div>${a} ${b}</div>';
      const data = { a: null, b: undefined };
      
      const result = safeTemplate(template, data);
      
      expect(result).toBe('<div> </div>');
    });
  });

  describe('createSafeFragment', () => {
    it('should remove script tags', () => {
      const html = '<div>Safe</div><script>alert("XSS")</script>';
      
      const fragment = createSafeFragment(html);
      const container = document.createElement('div');
      container.appendChild(fragment);
      
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).toContain('<div>Safe</div>');
    });

    it('should remove dangerous tags', () => {
      const html = '<div>Safe</div><iframe src="evil.com"></iframe><object></object>';
      
      const fragment = createSafeFragment(html);
      const container = document.createElement('div');
      container.appendChild(fragment);
      
      expect(container.innerHTML).not.toContain('<iframe');
      expect(container.innerHTML).not.toContain('<object');
      expect(container.innerHTML).toContain('<div>Safe</div>');
    });

    it('should remove event handler attributes', () => {
      const html = '<button onclick="alert(\'XSS\')">Click</button>';
      
      const fragment = createSafeFragment(html);
      const container = document.createElement('div');
      container.appendChild(fragment);
      
      const button = container.querySelector('button');
      expect(button.hasAttribute('onclick')).toBe(false);
      expect(button.textContent).toBe('Click');
    });

    it('should remove javascript: protocol', () => {
      const html = '<a href="javascript:alert(\'XSS\')">Link</a>';
      
      const fragment = createSafeFragment(html);
      const container = document.createElement('div');
      container.appendChild(fragment);
      
      const link = container.querySelector('a');
      expect(link.hasAttribute('href')).toBe(false);
    });

    it('should preserve safe HTML', () => {
      const html = '<div class="container"><p>Safe <b>content</b></p></div>';
      
      const fragment = createSafeFragment(html);
      const container = document.createElement('div');
      container.appendChild(fragment);
      
      expect(container.querySelector('.container')).toBeTruthy();
      expect(container.querySelector('p')).toBeTruthy();
      expect(container.querySelector('b')).toBeTruthy();
    });
  });

  describe('setSafeHtml', () => {
    it('should set safe HTML content', () => {
      const element = document.createElement('div');
      const html = '<p>Safe</p><script>alert("XSS")</script>';
      
      setSafeHtml(element, html);
      
      expect(element.innerHTML).toContain('<p>Safe</p>');
      expect(element.innerHTML).not.toContain('<script>');
    });

    it('should clear existing content', () => {
      const element = document.createElement('div');
      element.innerHTML = '<span>Old</span>';
      
      setSafeHtml(element, '<p>New</p>');
      
      expect(element.innerHTML).not.toContain('Old');
      expect(element.innerHTML).toContain('New');
    });

    it('should handle null element gracefully', () => {
      expect(() => {
        setSafeHtml(null, '<div>test</div>');
      }).not.toThrow();
    });
  });

  describe('isSafeUrl', () => {
    it('should allow http URLs', () => {
      expect(isSafeUrl('http://example.com')).toBe(true);
    });

    it('should allow https URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
    });

    it('should allow relative URLs', () => {
      expect(isSafeUrl('/path/to/page')).toBe(true);
      expect(isSafeUrl('./relative')).toBe(true);
    });

    it('should block javascript: protocol', () => {
      expect(isSafeUrl('javascript:alert("XSS")')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert("XSS")')).toBe(false);
    });

    it('should block data: protocol', () => {
      expect(isSafeUrl('data:text/html,<script>alert("XSS")</script>')).toBe(false);
    });

    it('should block vbscript: protocol', () => {
      expect(isSafeUrl('vbscript:msgbox("XSS")')).toBe(false);
    });

    it('should handle empty and invalid input', () => {
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
      expect(isSafeUrl(123)).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(isSafeUrl('  javascript:alert("XSS")  ')).toBe(false);
      expect(isSafeUrl('  https://example.com  ')).toBe(true);
    });
  });

  describe('safeLink', () => {
    it('should create safe link', () => {
      const result = safeLink('https://example.com', 'Example');
      
      expect(result).toContain('href="https:&#x2F;&#x2F;example.com"');
      expect(result).toContain('Example');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should escape link text', () => {
      const result = safeLink('https://example.com', '<script>XSS</script>');
      
      expect(result).toContain('&lt;script&gt;XSS&lt;&#x2F;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should block dangerous URLs', () => {
      const result = safeLink('javascript:alert("XSS")', 'Click me');
      
      expect(result).not.toContain('<a');
      expect(result).toBe('Click me');
    });

    it('should escape URL in href', () => {
      const result = safeLink('https://example.com?q=<script>', 'Link');
      
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('Integration', () => {
    it('should prevent XSS through multiple layers', () => {
      const userInput = '<img src=x onerror="alert(\'XSS\')">';
      
      // Layer 1: Escape
      const escaped = escapeHtml(userInput);
      expect(escaped).not.toContain('<img');
      
      // Layer 2: Template
      const template = '<div>${content}</div>';
      const rendered = safeTemplate(template, { content: userInput });
      expect(rendered).not.toContain('onerror');
      
      // Layer 3: Fragment
      const fragment = createSafeFragment(userInput);
      const container = document.createElement('div');
      container.appendChild(fragment);
      expect(container.querySelector('img')).toBeNull();
    });

    it('should handle complex nested attack vectors', () => {
      const malicious = '<div onclick="alert(1)"><a href="javascript:void(0)">Click</a></div>';
      
      const fragment = createSafeFragment(malicious);
      const container = document.createElement('div');
      container.appendChild(fragment);
      
      const div = container.querySelector('div');
      const link = container.querySelector('a');
      
      expect(div.hasAttribute('onclick')).toBe(false);
      expect(link.hasAttribute('href')).toBe(false);
    });
  });
});
