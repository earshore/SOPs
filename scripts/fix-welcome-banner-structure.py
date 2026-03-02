#!/usr/bin/env python3
"""
修复 Welcome Banner 后面的多余闭合标签
问题：Python 迁移脚本在 Welcome Banner 后面添加了 3 个多余的 </div> 标签
"""

import glob
import re

def fix_welcome_banner_structure(file_path):
    """修复单个文件的 Welcome Banner 结构"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否包含 wb-container
    if 'wb-container' not in content:
        return False
    
    lines = content.split('\n')
    modified = False
    
    # 找到 wb-container 的位置
    for i, line in enumerate(lines):
        if 'wb-container' in line and '<div' in line:
            # 找到 wb-container 闭合标签的位置
            depth = 0
            wb_end_index = None
            
            for j in range(i, min(i + 30, len(lines))):
                if '<div' in lines[j]:
                    depth += lines[j].count('<div')
                if '</div>' in lines[j]:
                    depth -= lines[j].count('</div>')
                    if depth == 0:
                        wb_end_index = j
                        break
            
            if wb_end_index:
                # 检查后面是否有多余的 </div> 标签
                extra_divs = []
                for j in range(wb_end_index + 1, min(wb_end_index + 5, len(lines))):
                    if lines[j].strip() == '</div>':
                        extra_divs.append(j)
                    elif lines[j].strip() and not lines[j].strip().startswith('<!--'):
                        # 遇到非空非注释行，停止检查
                        break
                
                # 删除多余的 </div> 标签
                if extra_divs:
                    print(f"  发现 {len(extra_divs)} 个多余的闭合标签在行 {[x+1 for x in extra_divs]}")
                    for index in reversed(extra_divs):
                        del lines[index]
                    modified = True
            break
    
    if modified:
        # 写回文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        return True
    
    return False

def main():
    # 获取所有需要检查的文件
    patterns = [
        'src/modules/amz_hub/views/**/template.html',
        'src/modules/sops/views/**/template.html',
        'src/modules/more/views/**/template.html'
    ]
    
    all_files = []
    for pattern in patterns:
        all_files.extend(glob.glob(pattern, recursive=True))
    
    print(f"检查 {len(all_files)} 个文件...")
    
    fixed_count = 0
    for file_path in sorted(all_files):
        if fix_welcome_banner_structure(file_path):
            print(f"✓ 修复: {file_path}")
            fixed_count += 1
    
    print(f"\n完成！修复了 {fixed_count} 个文件")

if __name__ == '__main__':
    main()
