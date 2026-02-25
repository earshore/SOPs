// tools/eslint-rules/no-deprecated-state-manager.js
/**
 * ESLint 规则: 禁止使用已废弃的 StateManager
 * 
 * 用法:
 * 在 eslint.config.js 中添加:
 * {
 *   rules: {
 *     'no-deprecated-state-manager': 'error'
 *   }
 * }
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止使用已废弃的 StateManager，请使用 Zustand store',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      noStateManager: 'StateManager 已废弃，请使用 appStore.getState() 代替',
      noStateImport: '不要从 @/common/state 导入 state，请使用 appStore',
      noStateAccess: '不要使用 state.{{module}}，请使用 appStore.getState().{{module}}'
    },
    schema: []
  },

  create(context) {
    return {
      // 检查 import StateManager
      ImportDeclaration(node) {
        const source = node.source.value;
        
        // 禁止导入 StateManager
        if (source.includes('StateManager') && !source.includes('WorkingStateManager')) {
          context.report({
            node,
            messageId: 'noStateManager'
          });
        }
        
        // 禁止导入旧的 state
        if (source.includes('@/common/state') || source.includes('../common/state')) {
          // 允许在测试文件中使用
          const filename = context.getFilename();
          if (!filename.includes('test') && !filename.includes('spec')) {
            context.report({
              node,
              messageId: 'noStateImport'
            });
          }
        }
      },

      // 检查 state.xxx 访问
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'state' &&
          node.property.type === 'Identifier'
        ) {
          const module = node.property.name;
          const validModules = ['ui', 'scraper', 'analysis', 'promptlab', 'keywordTracker', 'qalab'];
          
          if (validModules.includes(module)) {
            // 允许在测试文件中使用
            const filename = context.getFilename();
            if (!filename.includes('test') && !filename.includes('spec')) {
              context.report({
                node,
                messageId: 'noStateAccess',
                data: { module }
              });
            }
          }
        }
      }
    };
  }
};
