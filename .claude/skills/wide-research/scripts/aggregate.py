#!/usr/bin/env python3
"""
Wide Research 聚合脚本

功能：
- 读取所有子任务输出文件
- 按顺序合并为单一 Markdown 文档
- 生成聚合统计信息
- 检测缺失和失败的子任务

使用方法：
    python aggregate.py --input-dir outputs/ --output aggregated_raw.md

参数：
    --input-dir: 子任务输出目录
    --output: 输出文件路径
    --format: 输出格式 (markdown/json)
    --sort: 排序方式 (name/time/status)
"""

import argparse
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Optional


def parse_subtask_output(file_path: Path) -> dict:
    """解析单个子任务输出文件"""
    content = file_path.read_text(encoding='utf-8')

    # 检测状态
    status = "success"
    if "[TIMEOUT]" in content or "超时" in content:
        status = "timeout"
    elif "失败报告" in content or "## ⚠️" in content:
        status = "failed"
    elif "部分完成" in content:
        status = "partial"

    # 提取标题
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else file_path.stem

    # 统计引用数量
    url_pattern = r'\[([^\]]+)\]\(https?://[^\)]+\)'
    references = re.findall(url_pattern, content)

    return {
        "file": file_path.name,
        "title": title,
        "status": status,
        "content": content,
        "reference_count": len(references),
        "word_count": len(content),
        "modified_time": datetime.fromtimestamp(file_path.stat().st_mtime)
    }


def generate_markdown_output(subtasks: list[dict], metadata: dict) -> str:
    """生成 Markdown 格式的聚合输出"""
    lines = [
        f"# 聚合报告 - {metadata.get('task_name', 'Wide Research')}",
        "",
        f"生成时间: {datetime.now().isoformat()}",
        f"子任务数量: {len(subtasks)}",
        f"成功: {sum(1 for s in subtasks if s['status'] == 'success')} | "
        f"失败: {sum(1 for s in subtasks if s['status'] == 'failed')} | "
        f"超时: {sum(1 for s in subtasks if s['status'] == 'timeout')} | "
        f"部分完成: {sum(1 for s in subtasks if s['status'] == 'partial')}",
        "",
        "---",
        ""
    ]

    status_emoji = {
        "success": "✅",
        "failed": "❌",
        "timeout": "⏱️",
        "partial": "⚠️"
    }

    for i, subtask in enumerate(subtasks, 1):
        emoji = status_emoji.get(subtask['status'], "❓")
        lines.extend([
            f"## 子任务 {i}: {subtask['title']}",
            f"状态: {emoji} {subtask['status']} | 引用数: {subtask['reference_count']} | 字数: {subtask['word_count']}",
            "",
            subtask['content'],
            "",
            "---",
            ""
        ])

    # 聚合统计
    total_refs = sum(s['reference_count'] for s in subtasks)
    total_words = sum(s['word_count'] for s in subtasks)

    lines.extend([
        "## 聚合统计",
        "",
        f"- 总引用数: {total_refs}",
        f"- 总字数: {total_words}",
        f"- 平均引用/任务: {total_refs / len(subtasks):.1f}" if subtasks else "- 平均引用/任务: 0",
        "",
        "### 状态分布",
        ""
    ])

    for status in ["success", "failed", "timeout", "partial"]:
        count = sum(1 for s in subtasks if s['status'] == status)
        if count > 0:
            lines.append(f"- {status_emoji[status]} {status}: {count}")

    return "\n".join(lines)


def generate_json_output(subtasks: list[dict], metadata: dict) -> str:
    """生成 JSON 格式的聚合输出"""
    output = {
        "metadata": {
            "task_name": metadata.get('task_name', 'Wide Research'),
            "generated_at": datetime.now().isoformat(),
            "subtask_count": len(subtasks),
            "success_count": sum(1 for s in subtasks if s['status'] == 'success'),
            "failed_count": sum(1 for s in subtasks if s['status'] == 'failed'),
        },
        "subtasks": [
            {
                "file": s['file'],
                "title": s['title'],
                "status": s['status'],
                "reference_count": s['reference_count'],
                "word_count": s['word_count'],
                "content": s['content']
            }
            for s in subtasks
        ],
        "statistics": {
            "total_references": sum(s['reference_count'] for s in subtasks),
            "total_words": sum(s['word_count'] for s in subtasks),
        }
    }
    return json.dumps(output, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(description='Wide Research 聚合脚本')
    parser.add_argument('--input-dir', required=True, help='子任务输出目录')
    parser.add_argument('--output', required=True, help='输出文件路径')
    parser.add_argument('--format', choices=['markdown', 'json'], default='markdown', help='输出格式')
    parser.add_argument('--sort', choices=['name', 'time', 'status'], default='name', help='排序方式')
    parser.add_argument('--task-name', default='Wide Research', help='任务名称')

    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        print(f"错误: 输入目录不存在: {input_dir}")
        return 1

    # 收集所有 markdown 文件
    md_files = list(input_dir.glob('*.md'))
    if not md_files:
        print(f"警告: 输入目录中没有 .md 文件: {input_dir}")
        return 1

    print(f"找到 {len(md_files)} 个子任务输出文件")

    # 解析所有子任务
    subtasks = []
    for f in md_files:
        try:
            subtasks.append(parse_subtask_output(f))
            print(f"  ✓ {f.name}")
        except Exception as e:
            print(f"  ✗ {f.name}: {e}")

    # 排序
    if args.sort == 'name':
        subtasks.sort(key=lambda x: x['file'])
    elif args.sort == 'time':
        subtasks.sort(key=lambda x: x['modified_time'])
    elif args.sort == 'status':
        status_order = {'success': 0, 'partial': 1, 'timeout': 2, 'failed': 3}
        subtasks.sort(key=lambda x: status_order.get(x['status'], 4))

    # 生成输出
    metadata = {'task_name': args.task_name}

    if args.format == 'markdown':
        output_content = generate_markdown_output(subtasks, metadata)
    else:
        output_content = generate_json_output(subtasks, metadata)

    # 写入文件
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(output_content, encoding='utf-8')

    print(f"\n聚合完成: {output_path}")
    print(f"  - 子任务数: {len(subtasks)}")
    print(f"  - 成功: {sum(1 for s in subtasks if s['status'] == 'success')}")
    print(f"  - 失败: {sum(1 for s in subtasks if s['status'] == 'failed')}")

    return 0


if __name__ == '__main__':
    exit(main())
