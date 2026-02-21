import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
    js.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
                project: "./tsconfig.json"
            },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        plugins: {
            "@typescript-eslint": tseslint
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-unused-vars": ["error", { 
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_"
            }],
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/ban-types": "warn",
            // 禁用no-dupe-class-members，因为TypeScript支持方法重载
            "no-dupe-class-members": "off",
            
            // 🎯 禁止直接访问localStorage
            "no-restricted-globals": ["error", {
                name: "localStorage",
                message: "请使用 StorageService 代替直接访问 localStorage"
            }, {
                name: "sessionStorage",
                message: "请使用 StorageService 代替直接访问 sessionStorage"
            }],
            
            // 🎯 禁止使用console
            "no-console": ["error", { allow: [] }]
        }
    },
    {
        files: ["**/*.js", "**/*.jsx"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                // 允许的第三方库全局变量
                Chart: "readonly",
                GridStack: "readonly",
                Alpine: "readonly",
                marked: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "warn",
            "no-case-declarations": "warn",
            
            // ================================================================
            // 🎯 防止全局变量污染
            // ================================================================
            
            // 禁止直接使用已迁移的全局函数
            "no-restricted-globals": ["error",
                {
                    name: "switchTab",
                    message: "使用 data-action=\"switch-tab\" 或从 @/common/utils/ui.js 导入"
                },
                {
                    name: "showToast",
                    message: "从 @/common/utils/ui.js 导入使用"
                },
                {
                    name: "showProgress",
                    message: "从 @/common/utils/ui.js 导入使用"
                },
                {
                    name: "renderMegaMenu",
                    message: "此函数应自动调用，不应手动调用"
                },
                {
                    name: "renderSopsMegaMenu",
                    message: "此函数应自动调用，不应手动调用"
                }
            ],
            
            // 禁止给window对象赋值（除了特定的向后兼容层）
            "no-global-assign": "error",
            
            // 推荐使用import/export而不是全局变量
            "no-implicit-globals": "error"
        }
    },
    {
        // 测试文件例外
        files: ["**/*.test.ts", "**/*.spec.ts", "tests/**/*.ts", "test/**/*.ts"],
        rules: {
            "no-console": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "no-restricted-globals": "off"
        }
    },
    {
        // 服务文件可以访问localStorage（因为它们封装了访问）
        files: ["**/storageService.ts", "**/secureStorage.ts", "**/persist.ts"],
        rules: {
            "no-restricted-globals": "off"
        }
    },
    {
        // Logger服务和devtools可以使用console
        files: ["**/loggerService.ts", "**/devtools/**/*.ts", "**/DebugInterface.ts"],
        rules: {
            "no-console": "off"
        }
    },
    {
        ignores: ["dist/", "node_modules/", "coverage/", "html/"]
    }
];
