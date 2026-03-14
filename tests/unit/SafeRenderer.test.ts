/**
 * SafeRenderer 单元测试
 * 
 * 测试 SafeRenderer 的所有功能，重点关注 XSS 防护
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SafeRenderer } from '../../src/common/infrastructure/SafeRenderer';

describe('SafeRenderer', () => {
  let renderer: SafeRenderer;
  let container: HTMLElement;

  beforeEach(() => {
    renderer = SafeRenderer.getInstance();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = SafeRenderer.getInstance();
      const instance2 = SafeRenderer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('escapeHtml', () => {
    it('应该转义 HTML 特殊字符', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
      expect(renderer.escapeHtml(input)).toBe(expected);
    });

    it('应该转义所有危险字符', () => {
      const input = '& < > " \' /';
      const expected = '&amp; &lt; &gt; &quot; &#x27; &#x2F;';
      expect(renderer.escapeHtml(input)).toBe(expected);
    });

    it('应该处理空字符串', () => {
      expect(renderer.escapeHtml('')).toBe('');
    });

    it('应该处理非字符串输入', () => {
      expect(renderer.escapeHtml(123 as any)).toBe('123');
      expect(renderer.escapeHtml(null as any)).toBe('null');
      expect(renderer.escapeHtml(undefined as any)).toBe('undefined');
    });

    it('应该保留普通文本', () => {
      const input = 'Hello World 123';
      expect(renderer.escapeHtml(input)).toBe(input);
    });
  });

  describe('sanitizeHtml', () => {
    describe('基本功能', () => {
      it('应该移除不在白名单中的标签', () => {
        const input = '<script>alert("xss")</script><p>Safe content</p>';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).not.toContain('<script>');
        expect(result).toContain('<p>Safe content</p>');
      });

      it('应该保留白名单中的标签', () => {
        const input = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).toContain('<p>Paragraph</p>');
        expect(result).toContain('<strong>Bold</strong>');
        expect(result).toContain('<em>Italic</em>');
      });

      it('应该移除不在白名单中的属性', () => {
        const input = '<div onclick="alert()" class="safe" data-evil="bad">Content</div>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div'],
          allowedAttrs: ['class']
        });
        
        expect(result).not.toContain('onclick');
        expect(result).not.toContain('data-evil');
        expect(result).toContain('class="safe"');
      });

      it('应该处理空字符串', () => {
        expect(renderer.sanitizeHtml('')).toBe('');
      });

      it('应该处理非字符串输入', () => {
        expect(renderer.sanitizeHtml(null as any)).toBe('');
        expect(renderer.sanitizeHtml(undefined as any)).toBe('');
        expect(renderer.sanitizeHtml(123 as any)).toBe('');
      });
    });

    describe('XSS 防护', () => {
      it('应该阻止 javascript: 协议的 href', () => {
        const input = '<a href="javascript:alert(\'xss\')">Click me</a>';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).not.toContain('javascript:');
        expect(result).toContain('<a>Click me</a>');
      });

      it('应该阻止 javascript: 协议的 src', () => {
        const input = '<img src="javascript:alert(\'xss\')" alt="image">';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).not.toContain('javascript:');
        expect(result).toContain('alt="image"');
      });

      it('应该阻止 data: 协议的 href', () => {
        const input = '<a href="data:text/html,<script>alert(\'xss\')</script>">Click</a>';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).not.toContain('data:');
      });

      it('应该阻止 data: 协议的 src', () => {
        const input = '<img src="data:text/html,<script>alert(\'xss\')</script>">';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).not.toContain('data:');
      });

      it('应该允许安全的 href', () => {
        const input = '<a href="https://example.com">Link</a>';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).toContain('href="https://example.com"');
      });

      it('应该允许安全的 src', () => {
        const input = '<img src="https://example.com/image.jpg" alt="image">';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).toContain('src="https://example.com/image.jpg"');
      });

      it('应该移除事件处理器属性', () => {
        const input = '<div onclick="alert()" onmouseover="alert()">Content</div>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div'],
          allowedAttrs: []
        });
        
        expect(result).not.toContain('onclick');
        expect(result).not.toContain('onmouseover');
      });

      it('应该移除 style 属性中的危险内容', () => {
        const input = '<div style="background: url(javascript:alert())">Content</div>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div'],
          allowedAttrs: []
        });
        
        expect(result).not.toContain('style');
      });
    });

    describe('嵌套结构', () => {
      it('应该递归处理嵌套标签', () => {
        const input = '<div><p><strong>Bold</strong> text</p></div>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div', 'p', 'strong'],
          allowedAttrs: []
        });
        
        expect(result).toContain('<div><p><strong>Bold</strong> text</p></div>');
      });

      it('应该移除嵌套中的危险标签', () => {
        const input = '<div><script>alert("xss")</script><p>Safe</p></div>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div', 'p'],
          allowedAttrs: []
        });
        
        expect(result).not.toContain('<script>');
        expect(result).toContain('<p>Safe</p>');
      });

      it('应该保留文本节点', () => {
        const input = '<div>Text before <p>paragraph</p> text after</div>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div', 'p'],
          allowedAttrs: []
        });
        
        expect(result).toContain('Text before');
        expect(result).toContain('text after');
      });
    });

    describe('自定义白名单', () => {
      it('应该使用自定义标签白名单', () => {
        const input = '<div><span>Span</span><p>Paragraph</p></div>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div', 'span'],
          allowedAttrs: []
        });
        
        expect(result).toContain('<span>Span</span>');
        expect(result).not.toContain('<p>');
      });

      it('应该使用自定义属性白名单', () => {
        const input = '<div class="test" id="myid" data-value="123">Content</div>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div'],
          allowedAttrs: ['class', 'id']
        });
        
        expect(result).toContain('class="test"');
        expect(result).toContain('id="myid"');
        expect(result).not.toContain('data-value');
      });

      it('应该使用默认白名单（未指定时）', () => {
        const input = '<p>Paragraph</p><strong>Bold</strong><script>alert()</script>';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).toContain('<p>Paragraph</p>');
        expect(result).toContain('<strong>Bold</strong>');
        expect(result).not.toContain('<script>');
      });
    });

    describe('边界情况', () => {
      it('应该处理自闭合标签', () => {
        const input = '<br/><img src="test.jpg" alt="test"/>';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).toContain('<br>');
        expect(result).toContain('<img');
      });

      it('应该处理大小写混合的标签', () => {
        const input = '<DIV><P>Content</P></DIV>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div', 'p'],
          allowedAttrs: []
        });
        
        expect(result.toLowerCase()).toContain('<div><p>content</p></div>');
      });

      it('应该处理空标签', () => {
        const input = '<div></div><p></p>';
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div', 'p'],
          allowedAttrs: []
        });
        
        expect(result).toContain('<div></div>');
        expect(result).toContain('<p></p>');
      });

      it('应该处理只有文本的输入', () => {
        const input = 'Just plain text';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).toBe('Just plain text');
      });

      it('应该处理特殊字符', () => {
        const input = '<p>&lt;script&gt;alert()&lt;/script&gt;</p>';
        const result = renderer.sanitizeHtml(input);
        
        expect(result).toContain('&lt;script&gt;');
      });
    });

    describe('复杂场景', () => {
      it('应该处理富文本内容', () => {
        const input = `
          <div>
            <p>This is a <strong>bold</strong> and <em>italic</em> text.</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
            <a href="https://example.com">Link</a>
          </div>
        `;
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div', 'p', 'strong', 'em', 'ul', 'li', 'a'],
          allowedAttrs: ['href']
        });
        
        expect(result).toContain('<strong>bold</strong>');
        expect(result).toContain('<em>italic</em>');
        expect(result).toContain('<ul>');
        expect(result).toContain('<li>Item 1</li>');
        expect(result).toContain('href="https://example.com"');
      });

      it('应该处理混合的安全和危险内容', () => {
        const input = `
          <div>
            <p>Safe paragraph</p>
            <script>alert("xss")</script>
            <img src="safe.jpg" onerror="alert()">
            <a href="javascript:void(0)">Bad link</a>
            <a href="https://safe.com">Good link</a>
          </div>
        `;
        const result = renderer.sanitizeHtml(input, {
          allowedTags: ['div', 'p', 'img', 'a'],
          allowedAttrs: ['src', 'href', 'alt']
        });
        
        expect(result).toContain('<p>Safe paragraph</p>');
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('javascript:');
        expect(result).toContain('href="https://safe.com"');
      });
    });
  });

  describe('renderTemplate', () => {
    it('应该渲染静态模板', () => {
      const template = '<div class="card">Static Content</div>';
      renderer.renderTemplate(container, template);
      
      expect(container.innerHTML).toBe(template);
    });

    it('应该抛出错误（容器为空）', () => {
      expect(() => {
        renderer.renderTemplate(null as any, '<div>Test</div>');
      }).toThrow('SafeRenderer: container is required');
    });

    it('应该抛出错误（模板不是字符串）', () => {
      expect(() => {
        renderer.renderTemplate(container, 123 as any);
      }).toThrow('SafeRenderer: template must be a string');
    });
  });

  describe('renderDynamic', () => {
    it('应该渲染动态内容并转义', () => {
      const template = '<div>Hello {{name}}</div>';
      const data = { name: '<script>alert("xss")</script>' };
      
      renderer.renderDynamic(container, template, data);
      
      expect(container.innerHTML).toContain('Hello');
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).toContain('&lt;script&gt;');
    });

    it('应该支持多个插值', () => {
      const template = '<div>{{greeting}} {{name}}, you are {{age}} years old</div>';
      const data = { greeting: 'Hello', name: 'John', age: 30 };
      
      renderer.renderDynamic(container, template, data);
      
      expect(container.innerHTML).toContain('Hello John, you are 30 years old');
    });

    it('应该处理缺失的数据', () => {
      const template = '<div>Hello {{name}}</div>';
      const data = {};
      
      renderer.renderDynamic(container, template, data);
      
      expect(container.innerHTML).toBe('<div>Hello </div>');
    });

    it('应该支持禁用转义', () => {
      const template = '<div>{{content}}</div>';
      const data = { content: '<strong>Bold</strong>' };
      
      renderer.renderDynamic(container, template, data, { sanitize: false });
      
      expect(container.innerHTML).toContain('<strong>Bold</strong>');
    });

    it('应该使用白名单清理（指定 allowedTags）', () => {
      const template = '<div>{{content}}</div>';
      const data = { content: '<strong>Bold</strong><script>alert()</script>' };
      
      renderer.renderDynamic(container, template, data, {
        sanitize: true,
        allowedTags: ['div', 'strong'],
        allowedAttrs: []
      });
      
      expect(container.innerHTML).toContain('<strong>');
      expect(container.innerHTML).not.toContain('<script>');
    });
  });

  describe('renderList', () => {
    it('应该渲染列表', () => {
      const items = [
        { name: 'Item 1' },
        { name: 'Item 2' },
        { name: 'Item 3' }
      ];
      
      renderer.renderList(
        container,
        items,
        (item) => `<span>${item.name}</span>`
      );
      
      expect(container.children.length).toBe(3);
      expect(container.textContent).toContain('Item 1');
      expect(container.textContent).toContain('Item 2');
      expect(container.textContent).toContain('Item 3');
    });

    it('应该显示空列表消息', () => {
      renderer.renderList(
        container,
        [],
        (item: any) => `<span>${item.name}</span>`,
        { emptyMessage: 'No items found' }
      );
      
      expect(container.textContent).toBe('No items found');
      expect(container.querySelector('.empty-message')).toBeTruthy();
    });

    it('应该使用自定义容器标签', () => {
      const items = [{ name: 'Item 1' }];
      
      renderer.renderList(
        container,
        items,
        (item) => `${item.name}`,
        { containerTag: 'li' }
      );
      
      expect(container.querySelector('li')).toBeTruthy();
    });

    it('应该转义列表项内容（默认）', () => {
      const items = [{ name: '<script>alert()</script>' }];
      
      renderer.renderList(
        container,
        items,
        (item) => item.name
      );
      
      expect(container.innerHTML).not.toContain('<script>');
    });

    it('应该抛出错误（容器为空）', () => {
      expect(() => {
        renderer.renderList(null as any, [], () => '');
      }).toThrow('SafeRenderer: container is required');
    });

    it('应该抛出错误（items 不是数组）', () => {
      expect(() => {
        renderer.renderList(container, 'not an array' as any, () => '');
      }).toThrow('SafeRenderer: items must be an array');
    });

    it('应该抛出错误（renderer 不是函数）', () => {
      expect(() => {
        renderer.renderList(container, [], 'not a function' as any);
      }).toThrow('SafeRenderer: renderer must be a function');
    });
  });

  describe('renderComponent', () => {
    it('应该渲染组件', () => {
      renderer.renderComponent(container, 'user-card', {
        name: 'John',
        age: 30
      });
      
      const component = container.querySelector('[data-component="user-card"]');
      expect(component).toBeTruthy();
      expect(component?.getAttribute('data-name')).toBe('John');
      expect(component?.getAttribute('data-age')).toBe('30');
    });

    it('应该渲染无属性的组件', () => {
      renderer.renderComponent(container, 'simple-component');
      
      const component = container.querySelector('[data-component="simple-component"]');
      expect(component).toBeTruthy();
    });

    it('应该抛出错误（容器为空）', () => {
      expect(() => {
        renderer.renderComponent(null as any, 'test');
      }).toThrow('SafeRenderer: container is required');
    });

    it('应该抛出错误（组件名为空）', () => {
      expect(() => {
        renderer.renderComponent(container, '');
      }).toThrow('SafeRenderer: componentName is required');
    });

    it('应该处理非字符串和非数字的属性值', () => {
      renderer.renderComponent(container, 'test-component', {
        name: 'John',
        age: 30,
        active: true,
        data: { nested: 'object' },
        callback: () => {}
      });
      
      const component = container.querySelector('[data-component="test-component"]');
      expect(component).toBeTruthy();
      expect(component?.getAttribute('data-name')).toBe('John');
      expect(component?.getAttribute('data-age')).toBe('30');
      // 非字符串和非数字的属性不应该被设置
      expect(component?.hasAttribute('data-active')).toBe(false);
      expect(component?.hasAttribute('data-data')).toBe(false);
      expect(component?.hasAttribute('data-callback')).toBe(false);
    });
  });

  describe('renderList 高级场景', () => {
    it('应该使用白名单清理列表项（sanitize=false + allowedTags）', () => {
      const items = [
        { content: '<strong>Bold</strong><script>alert()</script>' },
        { content: '<em>Italic</em><img onerror="alert()" src="test.jpg">' }
      ];
      
      renderer.renderList(
        container,
        items,
        (item) => item.content,
        {
          sanitize: false,
          allowedTags: ['strong', 'em', 'img'],
          allowedAttrs: ['src']
        }
      );
      
      expect(container.innerHTML).toContain('<strong>Bold</strong>');
      expect(container.innerHTML).toContain('<em>Italic</em>');
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).not.toContain('onerror');
    });

    it('应该直接设置 HTML（sanitize=false 且无 allowedTags）', () => {
      const items = [{ html: '<div class="custom">Custom HTML</div>' }];
      
      renderer.renderList(
        container,
        items,
        (item) => item.html,
        { sanitize: false }
      );
      
      expect(container.innerHTML).toContain('<div class="custom">Custom HTML</div>');
    });
  });

  describe('renderDynamic 边界情况', () => {
    it('应该抛出错误（容器为空）', () => {
      expect(() => {
        renderer.renderDynamic(null as any, '<div>{{test}}</div>', {});
      }).toThrow('SafeRenderer: container is required');
    });

    it('应该抛出错误（模板不是字符串）', () => {
      expect(() => {
        renderer.renderDynamic(container, 123 as any, {});
      }).toThrow('SafeRenderer: template must be a string');
    });
  });

  describe('导出的单例实例', () => {
    it('应该导出 safeRenderer 单例实例', async () => {
      const { safeRenderer } = await import('../../src/common/infrastructure/SafeRenderer');
      expect(safeRenderer).toBe(SafeRenderer.getInstance());
    });
  });
});
