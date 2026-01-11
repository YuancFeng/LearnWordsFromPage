#!/bin/bash
# Wide Research 工作目录初始化脚本
#
# 功能：
# - 创建符合规范的工作目录结构
# - 初始化 metadata.json 和 subtasks.json
# - 设置目录权限
#
# 使用方法：
#   ./init_workspace.sh "<任务摘要>" ["<任务描述>"]
#
# 示例：
#   ./init_workspace.sh "ai-code-assistant-market" "调研 AI 代码助手市场"
#   ./init_workspace.sh "llm-security-2024"

set -e

# 参数验证
TASK_SLUG="${1:-}"
TASK_DESC="${2:-}"

if [ -z "$TASK_SLUG" ]; then
    echo "错误: 必须提供任务摘要"
    echo "用法: $0 <任务摘要> [<任务描述>]"
    echo "示例: $0 \"ai-code-assistant-market\" \"调研 AI 代码助手市场\""
    exit 1
fi

# 验证任务摘要格式
if ! echo "$TASK_SLUG" | grep -qE '^[a-z0-9][a-z0-9-]*[a-z0-9]$'; then
    echo "错误: 任务摘要格式不正确"
    echo "要求: 小写字母、数字和连字符，不能以连字符开头或结尾"
    echo "示例: ai-code-assistant-market"
    exit 1
fi

# 检查长度
if [ ${#TASK_SLUG} -gt 30 ]; then
    echo "警告: 任务摘要超过 30 字符，建议缩短"
fi

# 生成工作目录名
DATE=$(date +%Y%m%d)
RANDOM_HEX=$(openssl rand -hex 3 2>/dev/null || head -c 6 /dev/urandom | xxd -p)
WORK_DIR="runs/${DATE}-${TASK_SLUG}-${RANDOM_HEX}"

# 检查 runs 目录
if [ ! -d "runs" ]; then
    mkdir -p runs
    echo "创建 runs/ 目录"
fi

# 创建工作目录
if [ -d "$WORK_DIR" ]; then
    echo "错误: 目录已存在: $WORK_DIR"
    exit 1
fi

echo "========================================"
echo "Wide Research 工作目录初始化"
echo "========================================"
echo ""
echo "工作目录: $WORK_DIR"
echo ""

# 创建目录结构
mkdir -p "$WORK_DIR"/{raw,prompts,outputs,logs,tmp,cache}

echo "✓ 创建目录结构:"
echo "  - raw/       (原始抓取数据)"
echo "  - prompts/   (子代理 Prompt)"
echo "  - outputs/   (子代理输出)"
echo "  - logs/      (执行日志)"
echo "  - tmp/       (临时文件)"
echo "  - cache/     (处理缓存)"
echo ""

# 生成 metadata.json
CREATED_AT=$(date -Iseconds)
cat > "$WORK_DIR/metadata.json" << EOF
{
  "version": "1.0",
  "task": {
    "name": "${TASK_DESC:-$TASK_SLUG}",
    "description": "",
    "user_query": "",
    "dimensions": []
  },
  "execution": {
    "created_at": "$CREATED_AT",
    "started_at": null,
    "completed_at": null,
    "status": "initialized",
    "phases_completed": []
  },
  "subtasks": {
    "total": 0,
    "success": 0,
    "failed": 0,
    "timeout": 0,
    "partial": 0
  },
  "statistics": {
    "total_searches": 0,
    "total_extracts": 0,
    "cache_hit_rate": 0,
    "total_references": 0,
    "final_word_count": 0
  },
  "quality": {
    "depth_score": null,
    "coverage_score": null,
    "review_passed": false,
    "review_notes": ""
  }
}
EOF
echo "✓ 创建 metadata.json"

# 生成 subtasks.json
cat > "$WORK_DIR/subtasks.json" << EOF
{
  "version": "1.0",
  "generated_at": "$CREATED_AT",
  "subtasks": []
}
EOF
echo "✓ 创建 subtasks.json"

# 创建空的核心文件占位
touch "$WORK_DIR/aggregated_raw.md"
touch "$WORK_DIR/polish_outline.md"
touch "$WORK_DIR/final_report.md"
echo "✓ 创建核心文件占位"

# 初始化主控日志
cat > "$WORK_DIR/logs/orchestrator.log" << EOF
[$CREATED_AT] [INFO] [orchestrator] 工作目录初始化完成
[$CREATED_AT] [INFO] [orchestrator] 目录: $WORK_DIR
EOF
echo "✓ 初始化主控日志"

# 创建 .gitkeep 文件保留空目录
touch "$WORK_DIR/raw/.gitkeep"
touch "$WORK_DIR/prompts/.gitkeep"
touch "$WORK_DIR/outputs/.gitkeep"
touch "$WORK_DIR/tmp/.gitkeep"
touch "$WORK_DIR/cache/.gitkeep"

echo ""
echo "========================================"
echo "初始化完成"
echo "========================================"
echo ""
echo "工作目录: $WORK_DIR"
echo ""
echo "目录结构:"
find "$WORK_DIR" -type f | sed "s|$WORK_DIR/|  |g" | sort
echo ""
echo "下一步:"
echo "  1. 更新 metadata.json 中的 task.description 和 user_query"
echo "  2. 执行 Phase 0: 预执行摸底"
echo "  3. 生成子任务定义到 subtasks.json"
echo ""

# 输出工作目录路径（供脚本捕获）
echo "$WORK_DIR"
