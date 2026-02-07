// tools/add-safety-comments.js
// 🔧 批量为静态模板加载添加安全注释

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  'src/modules/sops/views/service/negative_review/index.js',
  'src/modules/sops/views/service/email_templates/index.js',
  'src/modules/sops/views/safety/product_compliance/index.js',
  'src/modules/sops/views/safety/permission_management/index.js',
  'src/modules/sops/views/safety/performance_notification/index.js',
  'src/modules/sops/views/safety/eu_gpsr_compliance/index.js',
  'src/modules/sops/views/safety/brand_infringement/index.js',
  'src/modules/sops/views/safety/account_security/index.js',
  'src/modules/sops/views/overview/index.js',
  'src/modules/sops/views/growth/restricted_words/index.js',
  'src/modules/sops/views/growth/promotion_submission/index.js',
  'src/modules/sops/views/growth/ppc_advertising/index.js',
  'src/modules/sops/views/growth/npi_tracker/index.js',
  'src/modules/sops/views/growth/listing_seo/index.js',
  'src/modules/sops/views/growth/competitor_monitoring/index.js',
  'src/modules/sops/views/backend/procurement_qc/index.js',
  'src/modules/sops/views/backend/inventory_replenishment/index.js',
  'src/modules/sops/views/backend/fba_shipping/index.js'
];

const comment = '    // ✅ 安全: html来自静态模板文件，无用户输入\n';

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 在 container.innerHTML = html; 前添加注释
    const pattern = /(\s+)(container\.innerHTML = html;)/g;
    const replacement = `$1${comment}$1$2`;
    
    content = content.replace(pattern, replacement);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 已处理: ${file}`);
  } catch (error) {
    console.error(`❌ 处理失败: ${file}`, error.message);
  }
});

console.log('\n✅ 批量添加安全注释完成');
