// tools/dev/update-viewloader-imports.js
// 批量更新 viewLoader.js 导入为 viewLoader (移除.js扩展名)
// 保持UTF-8编码

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function updateImports(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
            updateImports(fullPath);
        } else if (file.name.endsWith('.js')) {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                const originalContent = content;
                
                // 替换 viewLoader.js 导入
                content = content.replace(
                    /from (['"])(.*)\/common\/utils\/viewLoader\.js\1/g,
                    "from $1$2/common/utils/viewLoader$1"
                );
                
                // 只在内容改变时写入
                if (content !== originalContent) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log(`✅ Updated: ${fullPath}`);
                }
            } catch (e) {
                console.error(`❌ Error processing ${fullPath}:`, e.message);
            }
        }
    }
}

console.log('🚀 开始更新 viewLoader 导入...\n');
updateImports(path.join(__dirname, '../../src'));
console.log('\n✅ 更新完成！');
