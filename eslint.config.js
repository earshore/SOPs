import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
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
        },
        ignores: ["dist/", "node_modules/", "coverage/"]
    }
];
