/**
 * Promptlab路由诊断脚本
 * 检查路由配置和模块加载问题
 */

console.log('=== Promptlab路由诊断 ===\n');

// 1. 检查路由常量
import { APP_CENTER_ROUTES } from '../src/common/constants/routes.js';
console.log('1. 路由常量检查:');
console.log('   APP_CENTER_ROUTES.PROMPTLAB =', APP_CENTER_ROUTES.PROMPTLAB);

// 2. 检查MENU_CONFIG
import { MENU_CONFIG } from '../src/common/config/menuConfig.js';
console.log('\n2. MENU_CONFIG检查:');
console.log('   routes中是否有promptlab:', APP_CENTER_ROUTES.PROMPTLAB in MENU_CONFIG.routes);
console.log('   promptlab配置:', MENU_CONFIG.routes[APP_CENTER_ROUTES.PROMPTLAB]);

// 3. 检查所有app_center相关路由
console.log('\n3. App Center所有路由:');
Object.entries(MENU_CONFIG.routes)
  .filter(([_, config]) => config.panelId === 'panel-app_center')
  .forEach(([id, config]) => {
    console.log(`   - ${id}: ${config.label} (moduleId: ${config.moduleId})`);
  });

console.log('\n=== 诊断完成 ===');
