#!/usr/bin/env python3
"""
Wide Research 覆盖率校验脚本

功能：
- 统计缺失条目
- 统计空字段
- 检查引用完整性
- 检查数据时间标注
- 生成校验报告

使用方法：
    python coverage_check.py --work-dir <工作目录>
    python coverage_check.py --work-dir <目录> --fix  # 尝试自动修复
"""

import argparse
import json
import re
from pathlib import Path
from datetime import datetime


class CoverageChecker:
    def __init__(self, work_dir: Path):
        self.work_dir = work_dir
        self.issues = []
        self.warnings = []
        self.stats = {
            'total_subtasks': 0,
            'completed_subtasks': 0,
            'failed_subtasks': 0,
            'empty_outputs': 0,
            'total_references': 0,
            'references_with_url': 0,
            'data_points': 0,
            'data_points_with_date': 0,
        }

    def check_subtasks_coverage(self):
        """检查子任务覆盖率"""
        subtasks_file = self.work_dir / "subtasks.json"
        outputs_dir = self.work_dir / "outputs"

        if not subtasks_file.exists():
            self.issues.append("❌ subtasks.json 不存在")
            return

        with open(subtasks_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        subtasks = data.get('subtasks', [])
        self.stats['total_subtasks'] = len(subtasks)

        for subtask in subtasks:
            subtask_id = subtask.get('id', 'unknown')
            output_file = outputs_dir / f"{subtask_id}.md"

            if not output_file.exists():
                self.issues.append(f"❌ 缺失输出: {subtask_id}")
                continue

            content = output_file.read_text(encoding='utf-8')

            # 检查空输出
            if len(content.strip()) < 100:
                self.stats['empty_outputs'] += 1
                self.issues.append(f"⚠️ 输出过短 (<100字符): {subtask_id}")
                continue

            # 检查失败标记
            if '失败报告' in content or '[TIMEOUT]' in content:
                self.stats['failed_subtasks'] += 1
                self.warnings.append(f"⚠️ 失败/超时任务: {subtask_id}")
            else:
                self.stats['completed_subtasks'] += 1

    def check_reference_format(self):
        """检查引用格式"""
        # 检查聚合文件和最终报告
        files_to_check = [
            self.work_dir / "aggregated_raw.md",
            self.work_dir / "final_report.md"
        ]

        for file_path in files_to_check:
            if not file_path.exists():
                continue

            content = file_path.read_text(encoding='utf-8')

            # 统计内联引用 [text](url)
            inline_refs = re.findall(r'\[([^\]]+)\]\((https?://[^\)]+)\)', content)
            self.stats['references_with_url'] += len(inline_refs)

            # 检查是否有集中式引用（不推荐）
            if re.search(r'\[\d+\]\s*https?://', content):
                self.warnings.append(f"⚠️ 发现集中式引用格式（不推荐）: {file_path.name}")

            # 检查孤立的 URL（没有用 markdown 格式）
            orphan_urls = re.findall(r'(?<!\()(https?://[^\s\)]+)(?!\))', content)
            if len(orphan_urls) > 3:
                self.warnings.append(f"⚠️ 发现 {len(orphan_urls)} 个未格式化的 URL: {file_path.name}")

    def check_data_timestamps(self):
        """检查数据时间标注"""
        final_report = self.work_dir / "final_report.md"

        if not final_report.exists():
            return

        content = final_report.read_text(encoding='utf-8')

        # 匹配数据点模式：数字 + 单位（如 $10B, 50%, 100万）
        data_points = re.findall(
            r'(\$?\d+(?:\.\d+)?(?:B|M|K|%|亿|万|千)?)',
            content
        )
        self.stats['data_points'] = len(data_points)

        # 匹配带时间标注的数据点
        timestamped_data = re.findall(
            r'\$?\d+(?:\.\d+)?(?:B|M|K|%|亿|万|千)?\s*\([^)]*(?:202\d|年|Q\d)[^)]*\)',
            content
        )
        self.stats['data_points_with_date'] = len(timestamped_data)

        # 计算标注率
        if self.stats['data_points'] > 0:
            rate = self.stats['data_points_with_date'] / self.stats['data_points']
            if rate < 0.5:
                self.warnings.append(
                    f"⚠️ 数据时间标注率偏低: {rate:.0%} ({self.stats['data_points_with_date']}/{self.stats['data_points']})"
                )

    def check_structure_compliance(self):
        """检查结构合规性"""
        final_report = self.work_dir / "final_report.md"

        if not final_report.exists():
            self.issues.append("❌ final_report.md 不存在")
            return

        content = final_report.read_text(encoding='utf-8')

        # 检查必要章节
        required_sections = ['执行摘要', '主要发现', '结论']
        for section in required_sections:
            if section not in content:
                self.warnings.append(f"⚠️ 缺少必要章节: {section}")

        # 检查是否像是一次性生成（启发式）
        # 如果没有明显的章节层次，可能是一次性生成
        h2_count = len(re.findall(r'^## ', content, re.MULTILINE))
        h3_count = len(re.findall(r'^### ', content, re.MULTILINE))

        if h2_count < 3:
            self.warnings.append("⚠️ 章节结构单薄，可能需要扩展")

        # 检查是否直接拼接（启发式）
        if '## 子任务' in content and '原始输出' in content:
            self.issues.append("❌ 疑似直接拼接子任务输出，需要重新整理")

    def check_metadata_completeness(self):
        """检查元数据完整性"""
        metadata_file = self.work_dir / "metadata.json"

        if not metadata_file.exists():
            self.issues.append("❌ metadata.json 不存在")
            return

        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)

        # 检查必要字段
        required_fields = [
            ('task.name', '任务名称'),
            ('execution.status', '执行状态'),
            ('execution.created_at', '创建时间'),
        ]

        for field_path, field_name in required_fields:
            keys = field_path.split('.')
            obj = metadata
            for key in keys:
                obj = obj.get(key, {}) if isinstance(obj, dict) else None
            if not obj:
                self.warnings.append(f"⚠️ 元数据缺失: {field_name} ({field_path})")

        # 检查阶段完成情况
        phases_completed = metadata.get('execution', {}).get('phases_completed', [])
        expected_phases = ['phase0', 'phase1', 'phase2', 'phase3', 'phase4', 'phase5']
        missing_phases = [p for p in expected_phases if p not in phases_completed]
        if missing_phases:
            self.warnings.append(f"⚠️ 未完成的阶段: {', '.join(missing_phases)}")

    def run_all_checks(self):
        """运行所有检查"""
        print("=" * 60)
        print("Wide Research 覆盖率校验报告")
        print(f"工作目录: {self.work_dir}")
        print(f"时间: {datetime.now().isoformat()}")
        print("=" * 60)
        print()

        self.check_subtasks_coverage()
        self.check_reference_format()
        self.check_data_timestamps()
        self.check_structure_compliance()
        self.check_metadata_completeness()

        # 输出统计
        print("## 统计信息")
        print(f"- 子任务总数: {self.stats['total_subtasks']}")
        print(f"- 完成: {self.stats['completed_subtasks']}")
        print(f"- 失败/超时: {self.stats['failed_subtasks']}")
        print(f"- 空输出: {self.stats['empty_outputs']}")
        print(f"- 引用数（带URL）: {self.stats['references_with_url']}")
        print(f"- 数据点: {self.stats['data_points']}")
        print(f"- 带时间标注的数据点: {self.stats['data_points_with_date']}")
        print()

        # 输出问题
        if self.issues:
            print("## ❌ 问题（需要修复）")
            for issue in self.issues:
                print(f"  {issue}")
            print()

        if self.warnings:
            print("## ⚠️ 警告（建议处理）")
            for warning in self.warnings:
                print(f"  {warning}")
            print()

        # 总结
        print("=" * 60)
        if not self.issues and not self.warnings:
            print("✅ 校验通过，无问题")
            return 0
        elif not self.issues:
            print(f"⚠️ 校验通过，但有 {len(self.warnings)} 个警告")
            return 0
        else:
            print(f"❌ 校验失败，{len(self.issues)} 个问题，{len(self.warnings)} 个警告")
            return 1


def main():
    parser = argparse.ArgumentParser(description='Wide Research 覆盖率校验')
    parser.add_argument('--work-dir', required=True, help='工作目录路径')
    parser.add_argument('--fix', action='store_true', help='尝试自动修复（暂未实现）')
    parser.add_argument('--json', action='store_true', help='输出 JSON 格式')

    args = parser.parse_args()
    work_dir = Path(args.work_dir)

    if not work_dir.exists():
        print(f"错误: 工作目录不存在: {work_dir}")
        return 1

    checker = CoverageChecker(work_dir)
    return checker.run_all_checks()


if __name__ == '__main__':
    exit(main())
