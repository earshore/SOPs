# Bugfix Requirements Document

## Introduction

执行 `npm run build` 时产生多个构建警告和错误，影响构建质量、bundle优化和未来维护。主要问题包括：CSS语法错误、动态/静态导入冲突导致代码分割失效、主bundle过大(332.51 kB)、Node.js弃用警告以及Gzip压缩路径错误。这些问题需要系统性修复以确保构建过程清洁、bundle大小合理、代码分割正常工作。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 执行 `npm run build` 进行CSS压缩时 THEN 系统在第24行报告 `Unexpected "=" [css-syntax-error]` 语法错误

1.2 WHEN 构建过程处理核心模块(useAppStore.ts, menuConfig.ts, ConfigCenter.ts, storageService.ts等20个模块)时 THEN 系统同时检测到静态导入和动态导入，产生20个"Module is dynamically imported by X but also statically imported by Y"警告

1.3 WHEN 构建完成生成main bundle时 THEN 系统生成332.51 kB的main-BtSUXkD9.js文件，超过300KB警告阈值

1.4 WHEN 构建过程调用Node.js shell命令时 THEN 系统产生DEP0190弃用警告，提示shell模式下传递参数存在安全风险

1.5 WHEN vite-plugin-compression生成Gzip压缩文件时 THEN 系统在压缩文件路径中包含完整的绝对路径(如 `dist/D:/Users/...`)而非相对路径

### Expected Behavior (Correct)

2.1 WHEN 执行 `npm run build` 进行CSS压缩时 THEN 系统SHALL成功压缩CSS文件，不产生任何语法错误

2.2 WHEN 构建过程处理核心模块时 THEN 系统SHALL采用统一的导入策略(纯动态或纯静态)，代码分割正常工作，不产生动态/静态导入冲突警告

2.3 WHEN 构建完成生成main bundle时 THEN 系统SHALL通过合理的代码分割策略将main bundle大小控制在300KB以内

2.4 WHEN 构建过程调用Node.js命令时 THEN 系统SHALL使用安全的命令调用方式，不产生DEP0190弃用警告

2.5 WHEN vite-plugin-compression生成Gzip压缩文件时 THEN 系统SHALL使用相对于dist目录的相对路径，不包含绝对路径前缀

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 构建过程处理非冲突模块时 THEN 系统SHALL CONTINUE TO正常构建这些模块，保持现有的导入和打包行为

3.2 WHEN 构建完成后 THEN 系统SHALL CONTINUE TO生成所有必要的资源文件(JS、CSS、images、fonts)，保持现有的文件结构和命名规则

3.3 WHEN 开发模式运行 `npm run dev` 时 THEN 系统SHALL CONTINUE TO正常启动开发服务器，不受构建配置修改的影响

3.4 WHEN 构建过程进行代码压缩时 THEN 系统SHALL CONTINUE TO使用terser进行JS压缩，保持现有的压缩配置(drop_console、minify等)

3.5 WHEN 构建过程处理已正确配置的vendor chunks(vendor-core、vendor-charts、vendor-markdown、vendor-utils)时 THEN 系统SHALL CONTINUE TO正确分割这些vendor包，保持现有的分包策略
