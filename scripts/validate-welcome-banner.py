#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Welcome Banner 验证脚本

功能:
- 递归扫描指定目录下的所有 HTML 模板文件
- 检测徽章元素是否包含主题类(wb-badge-*)
- 检测徽章主题类是否为 8 种预定义主题之一
- 检测徽章元素是否包含 aria-label 属性
- 检测图标元素是否包含 aria-hidden="true" 属性
- 生成 JSON 格式的验证报告

使用方法:
    python3 scripts/validate-welcome-banner.py [options]

选项:
    --dir <path>           扫描目录(默认: src/modules)
    --output <file>        输出文件(默认: validation-report.json)
    --verbose              详细输出
    --fix                  自动修复简单问题
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Optional
from bs4 import BeautifulSoup


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


def scan_directory(dir_path: str, verbose: bool = False) -> List[str]:
    """
    递归扫描指定目录下的所有 HTML 文件
    
    参数:
        dir_path: 要扫描的目录路径
        verbose: 是否输出详细信息
    
    返回:
        HTML 文件路径列表
    """
    if not os.path.exists(dir_path):
        print(f"错误: 目录不存在: {dir_path}", file=sys.stderr)
        sys.exit(1)
    
    if not os.path.isdir(dir_path):
        print(f"错误: 路径不是目录: {dir_path}", file=sys.stderr)
        sys.exit(1)
    
    html_files = []
    
    # 使用 pathlib.Path.rglob 递归查找所有 .html 文件
    try:
        path = Path(dir_path)
        for html_file in path.rglob('*.html'):
            if html_file.is_file():
                html_files.append(str(html_file))
                if verbose:
                    print(f"找到 HTML 文件: {html_file}")
    except Exception as e:
        print(f"错误: 扫描目录时发生异常: {e}", file=sys.stderr)
        sys.exit(1)
    
    if verbose:
        print(f"\n共找到 {len(html_files)} 个 HTML 文件")
    
    return html_files


def parse_html_file(file_path: str, verbose: bool = False) -> Optional[BeautifulSoup]:
    """
    解析 HTML 文件
    
    参数:
        file_path: HTML 文件路径
        verbose: 是否输出详细信息
    
    返回:
        BeautifulSoup 对象,解析失败返回 None
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        soup = BeautifulSoup(content, 'lxml')
        return soup
    except UnicodeDecodeError:
        if verbose:
            print(f"警告: 文件编码错误: {file_path}, 尝试使用 latin-1 编码", file=sys.stderr)
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'lxml')
            return soup
        except Exception as e:
            print(f"错误: 无法解析文件: {file_path}, 原因: {e}", file=sys.stderr)
            return None
    except Exception as e:
        print(f"错误: 无法读取文件: {file_path}, 原因: {e}", file=sys.stderr)
        return None


def get_line_number(element, content: str) -> int:
    """
    获取元素在文件中的行号
    
    参数:
        element: BeautifulSoup 元素
        content: 文件内容
    
    返回:
        行号(从 1 开始)
    """
    # 尝试多种方式查找元素位置
    
    # 方法1: 使用元素的开始标签
    try:
        # 获取元素名称和类名
        tag_name = element.name
        classes = element.get('class', [])
        
        if classes:
            # 构建类选择器模式
            class_str = ' '.join(classes)
            # 查找包含这些类的标签
            pattern = f'<{tag_name} class="{class_str}"'
            pos = content.find(pattern)
            
            if pos == -1:
                # 尝试单引号
                pattern = f"<{tag_name} class='{class_str}'"
                pos = content.find(pattern)
            
            if pos != -1:
                line_num = content[:pos].count('\n') + 1
                return line_num
        
        # 方法2: 查找元素的文本内容
        text = element.get_text(strip=True)
        if text:
            # 在内容中查找文本
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                if text in line and f'class="{" ".join(classes)}"' in line:
                    return i
        
        return 0
    except:
        return 0


def validate_badge_theme(badge_element, file_path: str, content: str, verbose: bool = False) -> Optional[Dict]:
    """
    验证徽章主题类
    
    参数:
        badge_element: 徽章元素
        file_path: 文件路径
        content: 文件内容
        verbose: 是否输出详细信息
    
    返回:
        问题字典,如果没有问题返回 None
    """
    classes = badge_element.get('class', [])
    
    # 检查是否有 wb-badge 基类
    if 'wb-badge' not in classes:
        return None  # 不是徽章元素
    
    # 获取行号
    line_num = get_line_number(badge_element, content)
    
    # 检查是否有主题类
    theme_classes = [c for c in classes if c.startswith('wb-badge-') and c != 'wb-badge']
    
    if not theme_classes:
        issue = {
            'file': file_path,
            'line': line_num,
            'type': 'missing_theme_class',
            'element': str(badge_element)[:100] + ('...' if len(str(badge_element)) > 100 else ''),
            'message': '徽章缺少主题类(wb-badge-*)'
        }
        if verbose:
            print(f"  发现问题: {file_path}:{line_num} - 徽章缺少主题类")
        return issue
    
    # 检查主题类是否有效
    invalid_themes = [c for c in theme_classes if c not in VALID_BADGE_THEMES]
    if invalid_themes:
        issue = {
            'file': file_path,
            'line': line_num,
            'type': 'invalid_theme_class',
            'element': str(badge_element)[:100] + ('...' if len(str(badge_element)) > 100 else ''),
            'message': f'徽章使用了无效的主题类: {", ".join(invalid_themes)}',
            'invalid_themes': invalid_themes,
            'valid_themes': VALID_BADGE_THEMES
        }
        if verbose:
            print(f"  发现问题: {file_path}:{line_num} - 徽章使用了无效的主题类: {', '.join(invalid_themes)}")
        return issue
    
    return None


def validate_badge_aria_label(badge_element, file_path: str, content: str, verbose: bool = False) -> Optional[Dict]:
    """
    验证徽章元素的 aria-label 属性
    
    参数:
        badge_element: 徽章元素
        file_path: 文件路径
        content: 文件内容
        verbose: 是否输出详细信息
    
    返回:
        问题字典,如果没有问题返回 None
    """
    classes = badge_element.get('class', [])
    
    # 检查是否有 wb-badge 基类
    if 'wb-badge' not in classes:
        return None  # 不是徽章元素
    
    # 检查是否有 aria-label 属性
    aria_label = badge_element.get('aria-label')
    
    if not aria_label:
        line_num = get_line_number(badge_element, content)
        issue = {
            'file': file_path,
            'line': line_num,
            'type': 'missing_aria_label',
            'element': str(badge_element)[:100] + ('...' if len(str(badge_element)) > 100 else ''),
            'message': '徽章元素缺少 aria-label 属性',
            'suggestion': '添加 aria-label 属性描述徽章含义,例如: aria-label="人工智能功能"'
        }
        if verbose:
            print(f"  发现问题: {file_path}:{line_num} - 徽章元素缺少 aria-label 属性")
        return issue
    
    return None


def validate_icon_aria_hidden(icon_element, file_path: str, content: str, verbose: bool = False) -> Optional[Dict]:
    """
    验证图标元素的 aria-hidden 属性
    
    参数:
        icon_element: 图标元素(<i> 标签)
        file_path: 文件路径
        content: 文件内容
        verbose: 是否输出详细信息
    
    返回:
        问题字典,如果没有问题返回 None
    """
    # 检查是否是图标元素
    if icon_element.name != 'i':
        return None
    
    # 检查是否在徽章元素内部
    parent = icon_element.parent
    if not parent or 'wb-badge' not in parent.get('class', []):
        return None
    
    # 检查是否有 aria-hidden="true" 属性
    aria_hidden = icon_element.get('aria-hidden')
    
    if aria_hidden != 'true':
        line_num = get_line_number(icon_element, content)
        issue = {
            'file': file_path,
            'line': line_num,
            'type': 'missing_aria_hidden',
            'element': str(icon_element)[:100] + ('...' if len(str(icon_element)) > 100 else ''),
            'message': '装饰性图标元素缺少 aria-hidden="true" 属性',
            'suggestion': '为装饰性图标添加 aria-hidden="true" 属性,避免屏幕阅读器读取'
        }
        if verbose:
            print(f"  发现问题: {file_path}:{line_num} - 装饰性图标元素缺少 aria-hidden=\"true\" 属性")
        return issue
    
    return None


def validate_html_file(file_path: str, verbose: bool = False) -> List[Dict]:
    """
    验证单个 HTML 文件
    
    参数:
        file_path: HTML 文件路径
        verbose: 是否输出详细信息
    
    返回:
        问题列表
    """
    issues = []
    
    # 读取文件内容
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
        except Exception as e:
            print(f"错误: 无法读取文件: {file_path}, 原因: {e}", file=sys.stderr)
            return issues
    
    # 解析 HTML
    soup = parse_html_file(file_path, verbose)
    if soup is None:
        return issues
    
    if verbose:
        print(f"\n检查文件: {file_path}")
    
    # 查找所有徽章元素
    badge_elements = soup.find_all(class_='wb-badge')
    
    if verbose and badge_elements:
        print(f"  找到 {len(badge_elements)} 个徽章元素")
    
    # 验证每个徽章的主题类
    for badge in badge_elements:
        issue = validate_badge_theme(badge, file_path, content, verbose)
        if issue:
            issues.append(issue)
    
    # 验证每个徽章的 aria-label 属性
    for badge in badge_elements:
        issue = validate_badge_aria_label(badge, file_path, content, verbose)
        if issue:
            issues.append(issue)
    
    # 查找所有图标元素(<i> 标签)
    icon_elements = soup.find_all('i')
    
    if verbose and icon_elements:
        print(f"  找到 {len(icon_elements)} 个图标元素")
    
    # 验证每个图标的 aria-hidden 属性
    for icon in icon_elements:
        issue = validate_icon_aria_hidden(icon, file_path, content, verbose)
        if issue:
            issues.append(issue)
    
    return issues


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='Welcome Banner 验证脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    # 扫描默认目录
    python3 scripts/validate-welcome-banner.py
    
    # 扫描指定目录
    python3 scripts/validate-welcome-banner.py --dir src/modules
    
    # 详细输出
    python3 scripts/validate-welcome-banner.py --verbose
    
    # 指定输出文件
    python3 scripts/validate-welcome-banner.py --output report.json
        """
    )
    
    parser.add_argument(
        '--dir',
        type=str,
        default='src/modules',
        help='扫描目录(默认: src/modules)'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        default='validation-report.json',
        help='输出文件(默认: validation-report.json)'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='详细输出'
    )
    
    parser.add_argument(
        '--fix',
        action='store_true',
        help='自动修复简单问题'
    )
    
    args = parser.parse_args()
    
    # 扫描目录
    if args.verbose:
        print(f"开始扫描目录: {args.dir}\n")
    
    html_files = scan_directory(args.dir, args.verbose)
    
    if not html_files:
        print(f"警告: 在目录 {args.dir} 中未找到任何 HTML 文件", file=sys.stderr)
        sys.exit(0)
    
    # 验证所有 HTML 文件
    all_issues = []
    files_with_issues = 0
    
    if args.verbose:
        print(f"\n开始验证 {len(html_files)} 个 HTML 文件...\n")
    
    for html_file in html_files:
        issues = validate_html_file(html_file, args.verbose)
        if issues:
            all_issues.extend(issues)
            files_with_issues += 1
    
    # 生成报告
    report = {
        'summary': {
            'total_files': len(html_files),
            'files_with_issues': files_with_issues,
            'total_issues': len(all_issues)
        },
        'issues': all_issues
    }
    
    # 输出报告
    try:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n验证完成!")
        print(f"  总文件数: {len(html_files)}")
        print(f"  有问题的文件数: {files_with_issues}")
        print(f"  总问题数: {len(all_issues)}")
        print(f"  报告已保存到: {args.output}")
    except Exception as e:
        print(f"错误: 无法写入报告文件: {args.output}, 原因: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
