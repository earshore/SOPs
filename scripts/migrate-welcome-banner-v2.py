#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Welcome Banner 迁移工具 v2

功能:
- 批量添加徽章主题类
- 批量添加 aria-label 属性
- 批量添加 aria-hidden="true" 属性到图标元素
- 在修改文件前创建备份(.bak 后缀)
- 生成修改日志文件记录所有变更
- 支持 dry-run 模式预览变更

使用方法:
    python3 scripts/migrate-welcome-banner-v2.py [options]

选项:
    --dir <path>           扫描目录(默认: src/modules)
    --dry-run              预览模式(不实际修改文件)
    --backup               创建备份(默认: true)
    --no-backup            不创建备份
    --log <file>           日志文件(默认: migration-log.txt)
    --add-aria             添加 ARIA 属性
    --add-theme            添加徽章主题类
    --theme <name>         指定主题类(ai, growth, safety, service, supply, analytics, pro, hub)
"""

import os
import sys
import argparse
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from bs4 import BeautifulSoup, Tag


# 有效的徽章主题类
VALID_BADGE_THEMES = [
    'wb-badge-ai',
    'wb-badge-growth',
    'wb-badge-safety',
    'wb-badge-service',
    'wb-badge-supply',
    'wb-badge-analytics',
    'wb-badge-pro',
    'wb-badge-hub'
]

# 徽章主题对应的 ARIA 标签
BADGE_ARIA_LABELS = {
    'wb-badge-ai': '人工智能功能',
    'wb-badge-growth': '增长功能',
    'wb-badge-safety': '安全警告',
    'wb-badge-service': '服务功能',
    'wb-badge-supply': '供应链功能',
    'wb-badge-analytics': '分析功能',
    'wb-badge-pro': '专业功能',
    'wb-badge-hub': '中心功能'
}

# 页面类型到徽章主题的映射
PAGE_TYPE_TO_THEME = {
    'ai': 'wb-badge-ai',
    'analysis': 'wb-badge-analytics',
    'growth': 'wb-badge-growth',
    'safety': 'wb-badge-safety',
    'service': 'wb-badge-service',
    'supply': 'wb-badge-supply',
    'pro': 'wb-badge-pro',
    'hub': 'wb-badge-hub'
}


class MigrationLogger:
    """迁移日志记录器"""
    
    def __init__(self, log_file: str):
        """
        初始化日志记录器
        
        参数:
            log_file: 日志文件路径
        """
        self.log_file = log_file
        self.logs = []
    
    def log(self, message: str):
        """
        记录日志消息
        
        参数:
            message: 日志消息
        """
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] {message}"
        self.logs.append(log_entry)
        print(log_entry)
    
    def save(self):
        """保存日志到文件"""
        try:
            with open(self.log_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(self.logs))
            print(f"\n日志已保存到: {self.log_file}")
        except Exception as e:
            print(f"错误: 无法保存日志文件: {self.log_file}, 原因: {e}", file=sys.stderr)


def scan_directory(dir_path: str, logger: MigrationLogger) -> List[str]:
    """
    递归扫描指定目录下的所有 HTML 文件
    
    参数:
        dir_path: 要扫描的目录路径
        logger: 日志记录器
    
    返回:
        HTML 文件路径列表
    """
    if not os.path.exists(dir_path):
        logger.log(f"错误: 目录不存在: {dir_path}")
        sys.exit(1)
    
    if not os.path.isdir(dir_path):
        logger.log(f"错误: 路径不是目录: {dir_path}")
        sys.exit(1)
    
    html_files = []
    
    try:
        path = Path(dir_path)
        for html_file in path.rglob('*.html'):
            if html_file.is_file():
                html_files.append(str(html_file))
    except Exception as e:
        logger.log(f"错误: 扫描目录时发生异常: {e}")
        sys.exit(1)
    
    logger.log(f"找到 {len(html_files)} 个 HTML 文件")
    
    return html_files


def parse_html_file(file_path: str, logger: MigrationLogger) -> Optional[Tuple[BeautifulSoup, str]]:
    """
    解析 HTML 文件
    
    参数:
        file_path: HTML 文件路径
        logger: 日志记录器
    
    返回:
        (BeautifulSoup 对象, 原始内容) 元组,解析失败返回 None
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        soup = BeautifulSoup(content, 'lxml')
        return soup, content
    except UnicodeDecodeError:
        logger.log(f"警告: 文件编码错误: {file_path}, 尝试使用 latin-1 编码")
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'lxml')
            return soup, content
        except Exception as e:
            logger.log(f"错误: 无法解析文件: {file_path}, 原因: {e}")
            return None
    except Exception as e:
        logger.log(f"错误: 无法读取文件: {file_path}, 原因: {e}")
        return None


def infer_theme_from_path(file_path: str) -> Optional[str]:
    """
    从文件路径推断徽章主题
    
    参数:
        file_path: 文件路径
    
    返回:
        推断的主题类,无法推断返回 None
    """
    file_path_lower = file_path.lower()
    
    # 检查路径中是否包含关键词
    for keyword, theme in PAGE_TYPE_TO_THEME.items():
        if keyword in file_path_lower:
            return theme
    
    return None


def add_theme_class(badge: Tag, theme_class: str, logger: MigrationLogger) -> bool:
    """
    为徽章元素添加主题类
    
    参数:
        badge: 徽章元素
        theme_class: 主题类名
        logger: 日志记录器
    
    返回:
        是否进行了修改
    """
    classes = badge.get('class', [])
    
    # 检查是否已有主题类
    existing_themes = [c for c in classes if c.startswith('wb-badge-') and c != 'wb-badge']
    
    if existing_themes:
        # 已有主题类,不修改
        return False
    
    # 添加主题类
    if isinstance(classes, list):
        classes.append(theme_class)
    else:
        classes = ['wb-badge', theme_class]
    
    badge['class'] = classes
    
    return True


def add_aria_label(badge: Tag, theme_class: str, logger: MigrationLogger) -> bool:
    """
    为徽章元素添加 aria-label 属性
    
    参数:
        badge: 徽章元素
        theme_class: 主题类名
        logger: 日志记录器
    
    返回:
        是否进行了修改
    """
    # 检查是否已有 aria-label
    if badge.get('aria-label'):
        return False
    
    # 获取对应的 ARIA 标签
    aria_label = BADGE_ARIA_LABELS.get(theme_class, '功能标签')
    
    # 添加 aria-label 属性
    badge['aria-label'] = aria_label
    
    return True


def add_aria_hidden_to_icons(badge: Tag, logger: MigrationLogger) -> int:
    """
    为徽章内的图标元素添加 aria-hidden="true" 属性
    
    参数:
        badge: 徽章元素
        logger: 日志记录器
    
    返回:
        修改的图标数量
    """
    modified_count = 0
    
    # 查找徽章内的所有 <i> 标签
    icons = badge.find_all('i')
    
    for icon in icons:
        # 检查是否已有 aria-hidden="true"
        if icon.get('aria-hidden') != 'true':
            icon['aria-hidden'] = 'true'
            modified_count += 1
    
    return modified_count


def create_backup(file_path: str, logger: MigrationLogger) -> bool:
    """
    创建文件备份
    
    参数:
        file_path: 文件路径
        logger: 日志记录器
    
    返回:
        是否成功创建备份
    """
    backup_path = f"{file_path}.bak"
    
    try:
        shutil.copy2(file_path, backup_path)
        logger.log(f"  - 创建备份: {os.path.basename(backup_path)}")
        return True
    except Exception as e:
        logger.log(f"  - 错误: 无法创建备份: {backup_path}, 原因: {e}")
        return False


def write_file(file_path: str, content: str, logger: MigrationLogger) -> bool:
    """
    写入文件
    
    参数:
        file_path: 文件路径
        content: 文件内容
        logger: 日志记录器
    
    返回:
        是否成功写入
    """
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except PermissionError:
        logger.log(f"  - 错误: 没有权限写入文件: {file_path}")
        return False
    except IOError as e:
        logger.log(f"  - 错误: 写入文件失败: {file_path}, 原因: {e}")
        return False


def migrate_file(
    file_path: str,
    logger: MigrationLogger,
    add_theme: bool = False,
    add_aria: bool = False,
    theme: Optional[str] = None,
    dry_run: bool = False,
    backup: bool = True
) -> Dict:
    """
    迁移单个 HTML 文件
    
    参数:
        file_path: HTML 文件路径
        logger: 日志记录器
        add_theme: 是否添加徽章主题类
        add_aria: 是否添加 ARIA 属性
        theme: 指定的主题类
        dry_run: 是否为预览模式
        backup: 是否创建备份
    
    返回:
        迁移结果字典
    """
    result = {
        'file': file_path,
        'modified': False,
        'changes': []
    }
    
    # 解析 HTML 文件
    parsed = parse_html_file(file_path, logger)
    if parsed is None:
        return result
    
    soup, original_content = parsed
    
    # 查找所有徽章元素
    badge_elements = soup.find_all(class_='wb-badge')
    
    if not badge_elements:
        return result
    
    logger.log(f"处理文件: {file_path}")
    logger.log(f"  - 找到 {len(badge_elements)} 个徽章元素")
    
    # 推断主题类(如果未指定)
    inferred_theme = None
    if add_theme and not theme:
        inferred_theme = infer_theme_from_path(file_path)
        if inferred_theme:
            logger.log(f"  - 从路径推断主题: {inferred_theme}")
    
    # 确定要使用的主题类
    theme_to_use = None
    if theme:
        theme_to_use = f"wb-badge-{theme}" if not theme.startswith('wb-badge-') else theme
    elif inferred_theme:
        theme_to_use = inferred_theme
    
    # 处理每个徽章
    for badge in badge_elements:
        badge_modified = False
        
        # 添加主题类
        if add_theme and theme_to_use:
            if add_theme_class(badge, theme_to_use, logger):
                result['changes'].append(f"添加主题类: {theme_to_use}")
                badge_modified = True
        
        # 添加 ARIA 标签
        if add_aria:
            # 获取徽章的主题类
            classes = badge.get('class', [])
            badge_theme = None
            for c in classes:
                if c in VALID_BADGE_THEMES:
                    badge_theme = c
                    break
            
            if badge_theme:
                if add_aria_label(badge, badge_theme, logger):
                    result['changes'].append(f"添加 aria-label: {BADGE_ARIA_LABELS.get(badge_theme)}")
                    badge_modified = True
                
                # 添加 aria-hidden 到图标
                icon_count = add_aria_hidden_to_icons(badge, logger)
                if icon_count > 0:
                    result['changes'].append(f"添加 aria-hidden 到 {icon_count} 个图标")
                    badge_modified = True
        
        if badge_modified:
            result['modified'] = True
    
    # 如果有修改
    if result['modified']:
        logger.log(f"  - 变更: {', '.join(result['changes'])}")
        
        if not dry_run:
            # 创建备份
            if backup:
                if not create_backup(file_path, logger):
                    logger.log(f"  - 跳过修改(备份失败)")
                    result['modified'] = False
                    return result
            
            # 写入修改后的内容
            # 使用 prettify() 会改变格式,所以我们需要更精确的替换
            # 这里使用原始内容替换的方式
            modified_content = str(soup)
            
            # 尝试保持原始格式
            # 由于 lxml 解析器会添加 <html><body> 标签,我们需要提取原始内容
            if '<html>' in modified_content and '<html>' not in original_content:
                # 提取 body 内容
                body_start = modified_content.find('<body>')
                body_end = modified_content.find('</body>')
                if body_start != -1 and body_end != -1:
                    modified_content = modified_content[body_start + 6:body_end]
            
            if write_file(file_path, modified_content, logger):
                logger.log(f"  - 文件已更新")
            else:
                logger.log(f"  - 文件更新失败")
                result['modified'] = False
        else:
            logger.log(f"  - [DRY-RUN] 将要进行的变更: {', '.join(result['changes'])}")
    
    return result


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='Welcome Banner 迁移工具 v2',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    # 预览模式(不实际修改文件)
    python3 scripts/migrate-welcome-banner-v2.py --dry-run --add-theme --add-aria
    
    # 添加徽章主题类(自动推断)
    python3 scripts/migrate-welcome-banner-v2.py --add-theme
    
    # 添加徽章主题类(指定主题)
    python3 scripts/migrate-welcome-banner-v2.py --add-theme --theme ai
    
    # 添加 ARIA 属性
    python3 scripts/migrate-welcome-banner-v2.py --add-aria
    
    # 同时添加主题类和 ARIA 属性
    python3 scripts/migrate-welcome-banner-v2.py --add-theme --add-aria
    
    # 不创建备份
    python3 scripts/migrate-welcome-banner-v2.py --add-theme --no-backup
    
    # 指定日志文件
    python3 scripts/migrate-welcome-banner-v2.py --add-theme --log my-migration.log
        """
    )
    
    parser.add_argument(
        '--dir',
        type=str,
        default='src/modules',
        help='扫描目录(默认: src/modules)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='预览模式(不实际修改文件)'
    )
    
    parser.add_argument(
        '--backup',
        dest='backup',
        action='store_true',
        default=True,
        help='创建备份(默认: true)'
    )
    
    parser.add_argument(
        '--no-backup',
        dest='backup',
        action='store_false',
        help='不创建备份'
    )
    
    parser.add_argument(
        '--log',
        type=str,
        default='migration-log.txt',
        help='日志文件(默认: migration-log.txt)'
    )
    
    parser.add_argument(
        '--add-aria',
        action='store_true',
        help='添加 ARIA 属性'
    )
    
    parser.add_argument(
        '--add-theme',
        action='store_true',
        help='添加徽章主题类'
    )
    
    parser.add_argument(
        '--theme',
        type=str,
        choices=['ai', 'growth', 'safety', 'service', 'supply', 'analytics', 'pro', 'hub'],
        help='指定主题类(ai, growth, safety, service, supply, analytics, pro, hub)'
    )
    
    args = parser.parse_args()
    
    # 检查是否至少指定了一个操作
    if not args.add_theme and not args.add_aria:
        print("错误: 请至少指定一个操作(--add-theme 或 --add-aria)", file=sys.stderr)
        parser.print_help()
        sys.exit(1)
    
    # 创建日志记录器
    logger = MigrationLogger(args.log)
    
    # 开始迁移
    logger.log("开始迁移")
    logger.log(f"扫描目录: {args.dir}")
    
    if args.dry_run:
        logger.log("模式: DRY-RUN(预览模式,不实际修改文件)")
    
    if args.add_theme:
        logger.log("操作: 添加徽章主题类")
        if args.theme:
            logger.log(f"指定主题: {args.theme}")
    
    if args.add_aria:
        logger.log("操作: 添加 ARIA 属性")
    
    if args.backup and not args.dry_run:
        logger.log("备份: 启用")
    
    # 扫描目录
    html_files = scan_directory(args.dir, logger)
    
    if not html_files:
        logger.log(f"警告: 在目录 {args.dir} 中未找到任何 HTML 文件")
        logger.save()
        sys.exit(0)
    
    # 迁移所有 HTML 文件
    modified_files = 0
    total_changes = 0
    
    for html_file in html_files:
        result = migrate_file(
            html_file,
            logger,
            add_theme=args.add_theme,
            add_aria=args.add_aria,
            theme=args.theme,
            dry_run=args.dry_run,
            backup=args.backup
        )
        
        if result['modified']:
            modified_files += 1
            total_changes += len(result['changes'])
    
    # 完成迁移
    logger.log(f"\n迁移完成!")
    logger.log(f"  总文件数: {len(html_files)}")
    logger.log(f"  修改的文件数: {modified_files}")
    logger.log(f"  总变更数: {total_changes}")
    
    if args.dry_run:
        logger.log("\n注意: 这是预览模式,未实际修改任何文件")
        logger.log("要应用这些变更,请移除 --dry-run 参数")
    
    # 保存日志
    logger.save()


if __name__ == '__main__':
    main()
