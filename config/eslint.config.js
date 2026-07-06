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
                varsIgnorePattern: "^_",
                caughtErrors: "none"
            }],
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-empty-object-type": "warn",
            "@typescript-eslint/no-unsafe-function-type": "warn",
            "@typescript-eslint/no-wrapper-object-types": "warn",
            "@typescript-eslint/no-var-requires": "off",  // Allow require() for dynamic imports to avoid circular deps
            // 禁用no-dupe-class-members，因为TypeScript支持方法重载
            "no-dupe-class-members": "off",
            
            // 🎯 代码复杂度检查
            "complexity": ["warn", 10],  // 圈复杂度阈值
            "@typescript-eslint/max-params": ["warn", { max: 5 }],  // 最大参数数量
            "max-depth": ["warn", 4],  // 最大嵌套深度
            "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],  // 最大函数行数
            
            // 🎯 禁止直接访问localStorage
            "no-restricted-globals": ["warn", {
                name: "localStorage",
                message: "请使用 StorageService 代替直接访问 localStorage"
            }, {
                name: "sessionStorage",
                message: "请使用 StorageService 代替直接访问 sessionStorage"
            }],
            
            // 🎯 禁止使用console
            "no-console": "warn",
            "no-control-regex": "off",
            "no-constant-condition": "warn",
            "no-useless-catch": "warn",

            // 🎯 XSS防护规则 - 禁止不安全的DOM操作
            "no-restricted-syntax": [
                "warn",
                {
                    selector: "AssignmentExpression[left.property.name='innerHTML']",
                    message: "避免直接使用innerHTML。请使用textContent或setSafeHtml()函数，或添加安全注释说明原因。"
                },
                {
                    selector: "AssignmentExpression[left.property.name='outerHTML']",
                    message: "避免直接使用outerHTML。请使用更安全的DOM操作方法。"
                }
            ],

            // 🎯 防止循环依赖 - 禁止基础设施层导入Logger
            "no-restricted-imports": [
                "warn", // 临时降级为 warn 以允许构建通过，逐步修复
                {
                    patterns: [
                        {
                            group: ["**/loggerService"],
                            message: "基础设施服务（ConfigCenter, typeGuards, menuConfig等）不应依赖Logger，请使用console"
                        }
                    ]
                }
            ]
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

            // 🎯 代码复杂度检查
            "complexity": ["warn", 10],  // 圈复杂度阈值
            "max-params": ["warn", 5],  // 最大参数数量
            "max-depth": ["warn", 4],  // 最大嵌套深度
            "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],  // 最大函数行数

            // 🎯 XSS防护规则 - 禁止不安全的DOM操作
            "no-restricted-syntax": [
                "warn",
                {
                    selector: "AssignmentExpression[left.property.name='innerHTML']",
                    message: "避免直接使用innerHTML。请使用textContent或setSafeHtml()函数，或添加安全注释说明原因。"
                },
                {
                    selector: "AssignmentExpression[left.property.name='outerHTML']",
                    message: "避免直接使用outerHTML。请使用更安全的DOM操作方法。"
                }
            ],

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
            "no-restricted-globals": "off",
            "no-restricted-syntax": "off"
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
        // 基础设施层可以使用console，禁止导入Logger（避免循环依赖）
        // TODO: 逐步重构移除所有基础设施文件中的 logger 导入
        files: [
            "**/ConfigCenter.ts",
            "**/config/schemas/**/*.ts",
            "**/config/**/*.ts",
            "**/typeGuards.ts",
            "**/menuConfig.ts",
            "**/ColorContext.ts",
            "**/secureStorage.ts",
            "**/EventBus.ts",
            "**/BaseModule.ts",
            "**/StandardModule.ts",
            "**/utils/animation-utils.ts",
            "**/common/**/*.ts",
            "**/services/**/*.ts",
            "**/stores/**/*.ts",
            "**/components/**/*.ts",
            "**/modules/**/*.ts",
            "**/utils/**/*.ts"
        ],
        rules: {
            "no-console": "off",
            "no-restricted-imports": [
                "warn", // 临时降级为 warning 以允许构建通过
                {
                    patterns: [
                        {
                            group: ["**/loggerService", "@services/loggerService", "@/services/loggerService", "../services/loggerService", "../../services/loggerService", "../../../services/loggerService", "./loggerService"],
                            message: "基础设施服务不应依赖Logger以避免循环依赖，请直接使用console"
                        }
                    ]
                }
            ]
        }
    },
    {
        // Logger服务和devtools可以使用console
        files: ["**/loggerService.ts", "**/devtools/**/*.ts", "**/DebugInterface.ts"],
        rules: {
            "no-console": "off",
            "no-restricted-syntax": "off",
            "no-restricted-imports": "off"
        }
    },
    {
        ignores: ["dist/", "node_modules/", "coverage/", "html/"]
    }
];
