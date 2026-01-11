#!/usr/bin/env python3
"""
Wide Research 元数据更新脚本

功能：
- 更新 metadata.json 的各个字段
- 记录阶段完成状态
- 更新统计信息

使用方法：
    # 更新阶段状态
    python update_metadata.py --work-dir <目录> --phase phase0

    # 更新子任务统计
    python update_metadata.py --work-dir <目录> --update-subtasks

    # 标记完成
    python update_metadata.py --work-dir <目录> --complete

    # 更新特定字段
    python update_metadata.py --work-dir <目录> --set "task.description=AI市场分析"
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path


def load_metadata(work_dir: Path) -> dict:
    """加载 metadata.json"""
    metadata_file = work_dir / "metadata.json"
    if not metadata_file.exists():
        raise FileNotFoundError(f"metadata.json 不存在: {metadata_file}")
    with open(metadata_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_metadata(work_dir: Path, metadata: dict):
    """保存 metadata.json"""
    metadata_file = work_dir / "metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)


def update_phase(metadata: dict, phase: str) -> dict:
    """更新阶段完成状态"""
    valid_phases = ['phase0', 'phase1', 'phase2', 'phase3', 'phase4', 'phase5']
    if phase not in valid_phases:
        raise ValueError(f"无效的阶段: {phase}，有效值: {valid_phases}")

    if phase not in metadata['execution']['phases_completed']:
        metadata['execution']['phases_completed'].append(phase)

    # 更新状态
    if phase == 'phase0':
        metadata['execution']['status'] = 'planning'
    elif phase in ['phase1', 'phase2']:
        metadata['execution']['status'] = 'preparing'
    elif phase == 'phase3':
        metadata['execution']['status'] = 'executing'
        if metadata['execution']['started_at'] is None:
            metadata['execution']['started_at'] = datetime.now().isoformat()
    elif phase in ['phase4', 'phase5']:
        metadata['execution']['status'] = 'finalizing'

    return metadata


def update_subtask_stats(work_dir: Path, metadata: dict) -> dict:
    """从 subtasks.json 和 outputs/ 更新子任务统计"""
    subtasks_file = work_dir / "subtasks.json"
    outputs_dir = work_dir / "outputs"

    if subtasks_file.exists():
        with open(subtasks_file, 'r', encoding='utf-8') as f:
            subtasks_data = json.load(f)
            metadata['subtasks']['total'] = len(subtasks_data.get('subtasks', []))

    # 统计输出状态
    if outputs_dir.exists():
        success = 0
        failed = 0
        timeout = 0
        partial = 0
        total_refs = 0
        total_words = 0

        for output_file in outputs_dir.glob('*.md'):
            content = output_file.read_text(encoding='utf-8')
            word_count = len(content)
            total_words += word_count

            # 计算引用数
            import re
            refs = re.findall(r'\[([^\]]+)\]\(https?://[^\)]+\)', content)
            total_refs += len(refs)

            # 判断状态
            if '[TIMEOUT]' in content or '超时' in content:
                timeout += 1
            elif '失败报告' in content or '## ⚠️' in content:
                if '已完成部分' in content:
                    partial += 1
                else:
                    failed += 1
            else:
                success += 1

        metadata['subtasks']['success'] = success
        metadata['subtasks']['failed'] = failed
        metadata['subtasks']['timeout'] = timeout
        metadata['subtasks']['partial'] = partial
        metadata['statistics']['total_references'] = total_refs

    return metadata


def mark_complete(metadata: dict) -> dict:
    """标记任务完成"""
    metadata['execution']['status'] = 'completed'
    metadata['execution']['completed_at'] = datetime.now().isoformat()
    return metadata


def set_field(metadata: dict, field_path: str, value: str) -> dict:
    """设置特定字段的值"""
    keys = field_path.split('.')
    obj = metadata
    for key in keys[:-1]:
        if key not in obj:
            obj[key] = {}
        obj = obj[key]

    # 尝试转换类型
    try:
        if value.lower() == 'true':
            value = True
        elif value.lower() == 'false':
            value = False
        elif value.isdigit():
            value = int(value)
        elif '.' in value and all(p.isdigit() for p in value.split('.')):
            value = float(value)
    except:
        pass

    obj[keys[-1]] = value
    return metadata


def main():
    parser = argparse.ArgumentParser(description='Wide Research 元数据更新脚本')
    parser.add_argument('--work-dir', required=True, help='工作目录路径')
    parser.add_argument('--phase', help='标记阶段完成 (phase0-phase5)')
    parser.add_argument('--update-subtasks', action='store_true', help='更新子任务统计')
    parser.add_argument('--complete', action='store_true', help='标记任务完成')
    parser.add_argument('--set', dest='set_field', help='设置字段值 (格式: path.to.field=value)')
    parser.add_argument('--show', action='store_true', help='显示当前 metadata')

    args = parser.parse_args()
    work_dir = Path(args.work_dir)

    if not work_dir.exists():
        print(f"错误: 工作目录不存在: {work_dir}")
        return 1

    try:
        metadata = load_metadata(work_dir)

        if args.show:
            print(json.dumps(metadata, ensure_ascii=False, indent=2))
            return 0

        modified = False

        if args.phase:
            metadata = update_phase(metadata, args.phase)
            print(f"✓ 阶段 {args.phase} 已标记完成")
            modified = True

        if args.update_subtasks:
            metadata = update_subtask_stats(work_dir, metadata)
            print(f"✓ 子任务统计已更新")
            print(f"  - 总数: {metadata['subtasks']['total']}")
            print(f"  - 成功: {metadata['subtasks']['success']}")
            print(f"  - 失败: {metadata['subtasks']['failed']}")
            modified = True

        if args.complete:
            metadata = mark_complete(metadata)
            print(f"✓ 任务已标记完成")
            modified = True

        if args.set_field:
            if '=' not in args.set_field:
                print(f"错误: --set 格式应为 path.to.field=value")
                return 1
            field_path, value = args.set_field.split('=', 1)
            metadata = set_field(metadata, field_path, value)
            print(f"✓ 已设置 {field_path} = {value}")
            modified = True

        if modified:
            save_metadata(work_dir, metadata)
            print(f"\n已保存到: {work_dir}/metadata.json")

        return 0

    except Exception as e:
        print(f"错误: {e}")
        return 1


if __name__ == '__main__':
    exit(main())
