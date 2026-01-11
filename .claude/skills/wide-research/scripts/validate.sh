#!/bin/bash
# Wide Research 验证脚本
#
# 功能：
# - 验证工作目录结构
# - 检查子任务完成度
# - 统计缺失文件
# - 生成质检报告
#
# 使用方法：
#   ./validate.sh <工作目录>

set -e

WORK_DIR="${1:-.}"

echo "========================================"
echo "Wide Research 验证报告"
echo "工作目录: $WORK_DIR"
echo "时间: $(date -Iseconds)"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 计数器
ERRORS=0
WARNINGS=0

# 检查函数
check_dir() {
    local dir="$1"
    local name="$2"
    if [ -d "$WORK_DIR/$dir" ]; then
        echo -e "${GREEN}✓${NC} $name 目录存在: $dir/"
        return 0
    else
        echo -e "${RED}✗${NC} $name 目录缺失: $dir/"
        ((ERRORS++))
        return 1
    fi
}

check_file() {
    local file="$1"
    local name="$2"
    local required="${3:-true}"

    if [ -f "$WORK_DIR/$file" ]; then
        local size=$(wc -c < "$WORK_DIR/$file" | tr -d ' ')
        if [ "$size" -eq 0 ]; then
            echo -e "${YELLOW}⚠${NC} $name 文件为空: $file"
            ((WARNINGS++))
        else
            echo -e "${GREEN}✓${NC} $name: $file (${size} bytes)"
        fi
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗${NC} $name 缺失: $file"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠${NC} $name 可选文件缺失: $file"
            ((WARNINGS++))
        fi
        return 1
    fi
}

count_files() {
    local dir="$1"
    local pattern="$2"
    if [ -d "$WORK_DIR/$dir" ]; then
        find "$WORK_DIR/$dir" -name "$pattern" -type f | wc -l | tr -d ' '
    else
        echo "0"
    fi
}

# 1. 目录结构检查
echo "## 1. 目录结构检查"
echo ""
check_dir "raw" "原始数据"
check_dir "prompts" "Prompt 文件"
check_dir "outputs" "输出文件"
check_dir "logs" "日志文件"
check_dir "tmp" "临时文件" || true  # 可选
check_dir "cache" "缓存文件" || true  # 可选
echo ""

# 2. 核心文件检查
echo "## 2. 核心文件检查"
echo ""
check_file "metadata.json" "任务元数据" "false"
check_file "aggregated_raw.md" "聚合文件" "false"
check_file "polish_outline.md" "润色大纲" "false"
check_file "final_report.md" "最终报告" "false"
echo ""

# 3. 子任务统计
echo "## 3. 子任务统计"
echo ""

PROMPT_COUNT=$(count_files "prompts" "*.md")
OUTPUT_COUNT=$(count_files "outputs" "*.md")
LOG_COUNT=$(count_files "logs" "*.log")

echo "Prompt 文件数: $PROMPT_COUNT"
echo "Output 文件数: $OUTPUT_COUNT"
echo "Log 文件数: $LOG_COUNT"

if [ "$PROMPT_COUNT" -gt 0 ] && [ "$OUTPUT_COUNT" -lt "$PROMPT_COUNT" ]; then
    MISSING=$((PROMPT_COUNT - OUTPUT_COUNT))
    echo -e "${YELLOW}⚠${NC} 缺少 $MISSING 个子任务输出"
    ((WARNINGS++))
fi
echo ""

# 4. 输出质量检查
echo "## 4. 输出质量检查"
echo ""

if [ -d "$WORK_DIR/outputs" ]; then
    EMPTY_OUTPUTS=0
    FAILED_OUTPUTS=0
    TIMEOUT_OUTPUTS=0

    for f in "$WORK_DIR/outputs"/*.md; do
        [ -f "$f" ] || continue

        SIZE=$(wc -c < "$f" | tr -d ' ')
        if [ "$SIZE" -lt 100 ]; then
            ((EMPTY_OUTPUTS++))
        fi

        if grep -q "失败报告\|## ⚠️" "$f" 2>/dev/null; then
            ((FAILED_OUTPUTS++))
        fi

        if grep -q "\[TIMEOUT\]\|超时" "$f" 2>/dev/null; then
            ((TIMEOUT_OUTPUTS++))
        fi
    done

    echo "空输出文件: $EMPTY_OUTPUTS"
    echo "失败任务: $FAILED_OUTPUTS"
    echo "超时任务: $TIMEOUT_OUTPUTS"

    if [ "$EMPTY_OUTPUTS" -gt 0 ]; then
        echo -e "${YELLOW}⚠${NC} 存在 $EMPTY_OUTPUTS 个空或过小的输出文件"
        ((WARNINGS++))
    fi

    if [ "$FAILED_OUTPUTS" -gt 0 ]; then
        echo -e "${YELLOW}⚠${NC} 存在 $FAILED_OUTPUTS 个失败的子任务"
        ((WARNINGS++))
    fi
fi
echo ""

# 5. 引用检查
echo "## 5. 引用检查"
echo ""

if [ -f "$WORK_DIR/aggregated_raw.md" ]; then
    URL_COUNT=$(grep -oE '\[([^\]]+)\]\(https?://[^\)]+\)' "$WORK_DIR/aggregated_raw.md" | wc -l | tr -d ' ')
    echo "聚合文件中的引用数: $URL_COUNT"

    if [ "$URL_COUNT" -lt 5 ]; then
        echo -e "${YELLOW}⚠${NC} 引用数量较少，可能需要补充调研"
        ((WARNINGS++))
    fi
fi

if [ -f "$WORK_DIR/final_report.md" ]; then
    FINAL_URL_COUNT=$(grep -oE '\[([^\]]+)\]\(https?://[^\)]+\)' "$WORK_DIR/final_report.md" | wc -l | tr -d ' ')
    echo "最终报告中的引用数: $FINAL_URL_COUNT"
fi
echo ""

# 6. 汇总
echo "========================================"
echo "## 验证汇总"
echo ""
echo -e "错误: ${RED}$ERRORS${NC}"
echo -e "警告: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✓ 验证通过，工作目录结构完整${NC}"
    exit 0
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "${YELLOW}⚠ 验证通过但有警告，请检查上述问题${NC}"
    exit 0
else
    echo -e "${RED}✗ 验证失败，请修复上述错误${NC}"
    exit 1
fi
