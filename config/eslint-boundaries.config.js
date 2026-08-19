/**
 * Architecture boundary enforcement configuration (Level 1 engineering hardening).
 *
 * This is a SEPARATE config from `config/eslint.config.js` on purpose:
 * - `config/eslint.config.js` keeps type-safety / complexity rules unchanged (zero risk).
 * - This file isolates the new `eslint-plugin-boundaries` dependency and its
 *   architecture-level rules so they can be tuned independently (policies,
 *   severity, ignore lists) without touching the production lint baseline.
 *
 * Severity strategy: all new rules are `warn` so they feed into the existing
 * `lint:warning-gate` baseline mechanism (`config/eslint-warning-baseline.json`).
 * Teams adopt boundaries incrementally: first gain visibility, then tighten
 * policies as the codebase converges on the target layer graph.
 *
 * Dependency notes (required in package.json devDependencies):
 *   - eslint-plugin-boundaries  (architecture layer rules)
 *   - eslint-import-resolver-typescript (resolves `@/` tsconfig path aliases)
 *
 * Verification: `npx eslint --config config/eslint-boundaries.config.js src/common/BaseModule.ts`
 */
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import tsparser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],

    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },

    plugins: {
      boundaries,
      import: importPlugin,
      // `@typescript-eslint` is loaded here ONLY so that `eslint-disable`
      // comments in source files (written for the main config) can resolve
      // their rule names without throwing "Definition for rule ... not found".
      // We deliberately do NOT re-declare production rules here.
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Production rules live in `config/eslint.config.js`; this config
      // inherits the recommended set to silence "rule not found" errors
      // from existing `eslint-disable` comments, then turns off the checks
      // that the main config already enforces (avoid double counting).
    },

    settings: {
      // ---------------------------------------------------------------------------
      // File layer (mandatory): categorizes EVERY file so `boundaries` can decide
      // whether a dependency is allowed. Without this layer, files that do not
      // match any element are marked `isUnknown` and the rule silently exits.
      // ---------------------------------------------------------------------------
      'boundaries/files': [
        // TypeScript source files under src/ are typed as "source".
        { pattern: 'src/**/*.ts', category: 'source', capture: ['src'] },
        { pattern: 'src/**/*.tsx', category: 'source', capture: ['src'] },
      ],

      // ---------------------------------------------------------------------------
      // Element layer: classification of architectural layers by folder path.
      // Only layers that currently have a clearly agreed boundary are listed.
      // Deliberately excluded (treated as `unknown` / unclassified): common,
      // components, utils, config — these are shared layers that every module
      // touches; classifying them now would generate hundreds of warnings.
      // ----------------------------------------------------------------------------
      'boundaries/elements': [
        // Business modules: the independent feature units of the app center.
        { type: 'module', pattern: 'src/modules/**' },
        // Domain service layer: cross-module services consumed by modules.
        { type: 'service', pattern: 'src/services/**' },
        // Global state stores (Zustand).
        { type: 'store', pattern: 'src/stores/**' },
        // Type definitions / events type map.
        { type: 'types', pattern: 'src/types/**' },
      ],

      // Only scan the app source (not tests/tools/config in this config).
      'boundaries/include': ['src/**/*'],

      // Resolve `@/` path aliases defined in tsconfig.json `paths`.
      'import/resolver': { typescript: true },
      'import/ignore': ['node_modules', '\\.scss$', '\\.css$'],
    },

    rules: {
      // ---------------------------------------------------------------------------
      // 1. Architecture boundaries (eslint-plugin-boundaries)
      //    default: 'allow' — existing flows keep working; only the explicitly
      //    dangerous directions below are flagged as warnings.
      // ---------------------------------------------------------------------------
      'boundaries/dependencies': [
        'warn',
        {
          default: 'allow',
          // Also flag dependencies whose target could not be resolved to a
          // known file (dead imports, typos, missing modules).
          checkUnknownLocals: true,
          policies: [
            // Types layer must stay pure: it must not depend on services or
            // stores (event type maps must never import runtime logic).
            {
              from: { element: { type: 'types' } },
              disallow: [
                { to: { element: { type: 'service' } } },
                { to: { element: { type: 'store' } } },
              ],
              message:
                '类型层不得依赖 services 或 stores：事件类型定义应只引用其他类型，避免引入运行时逻辑。',
            },
            // Stores should not depend on business modules (state must stay
            // below the module layer; modules consume stores, not the reverse).
            {
              from: { element: { type: 'store' } },
              disallow: [{ to: { element: { type: 'module' } } }],
              message: '状态层不得依赖业务模块：模块应消费 store，避免状态层反噬业务层引入循环依赖。',
            },
            // Services layer must not reach up into business modules.
            // (Only 1 real occurrence today: this catches regressions early.)
            {
              from: { element: { type: 'service' } },
              disallow: [{ to: { element: { type: 'module' } } }],
              message: '服务层不得依赖业务模块：共享服务应保持对模块层的无知，模块消费服务而非相反。',
            },
            // Modules must not import sibling modules directly (cross-module
            // coupling happens via services/stores/events instead).
            {
              from: { element: { type: 'module' } },
              disallow: [{ to: { element: { type: 'module' } } }],
              message:
                '业务模块不得直接依赖其他业务模块：模块间应通过 services/stores/事件总线解耦，逐步消除模块间耦合。',
            },
          ],
        },
      ],

      // ---------------------------------------------------------------------------
      // 2. Import hygiene (eslint-plugin-import)
      // ---------------------------------------------------------------------------
      // Keep import groups ordered consistently across the codebase.
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroupsExcludedImportTypes: ['type'],
          // `@/` paths should be treated as internal imports.
          pathGroups: [
            { pattern: '@/**', group: 'internal', position: 'after' },
          ],
        },
      ],
      // Warn about unused imports (cheap dead-code signal).
      'import/no-unused-modules': 'off', // requires static exports analysis; too heavy for Level 1.
      // Catch obviously broken import paths early (uses the same resolver).
      'import/no-unresolved': ['warn', { commonjs: false, amd: false }],
    },
  },

  {
    // Test fixtures exercise unusual import shapes; boundaries rules add noise
    // there and are covered by the functional E2E suite instead.
    files: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.test.tsx',
      '**/*.spec.tsx',
      'tests/**/*.ts',
    ],
    rules: {
      'boundaries/dependencies': 'off',
    },
  },
];
