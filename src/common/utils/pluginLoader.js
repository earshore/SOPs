/**
 * 插件加载器
 * 自动扫描并加载模块目录下的 plugin.js 入口文件，实现模块的自注册
 */

export function loadPlugins() {
    console.log("🔌 [PluginLoader] Scanning for plugins...");
    
    // 使用 Vite 的 Glob Import 功能
    // eager: true 表示同步直接加载模块，适合初始化注册
    const plugins = import.meta.glob('/src/modules/**/plugin.js', { eager: true });
    
    let count = 0;
    for (const path in plugins) {
        // 模块已被加载并执行
        count++;
        console.log(`   - Loaded: ${path}`);
    }
    
    console.log(`✅ [PluginLoader] Total plugins loaded: ${count}`);
}
