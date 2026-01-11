# Wide Research 最佳实践与经验总结

本文档汇总了从 Codex CLI 多进程编排和 Claude Code 多代理实践中总结的经验教训。

---

## 核心原则

### 1. 并行优先，串行是例外

**黄金法则：独立任务必须并行执行**

```javascript
// ✅ 正确: 单条消息启动所有独立任务
[Single Message]:
  Task("任务1", "...", "researcher")
  Task("任务2", "...", "researcher")
  Task("任务3", "...", "researcher")
  TodoWrite([...所有待办...])
  Write("file1.md", "...")
  Write("file2.md", "...")

// ❌ 错误: 多条消息串行
Message 1: Task("任务1", ...)
Message 2: Task("任务2", ...)  // 打破并行！
Message 3: TodoWrite([单个待办])  // 效率低下！
```

### 2. 缓存为王

**所有网络请求的原始数据必须本地缓存**

```bash
# 目录结构
runs/工作目录/
├── raw/                    # 原始抓取数据
│   ├── tavily_001.json     # Tavily 搜索结果
│   ├── page_001.html       # 网页快照
│   └── api_001.json        # API 响应
├── cache/                  # 处理后的缓存
│   ├── parsed_001.md       # 解析结果
│   └── summary_001.txt     # 摘要
```

**缓存检查逻辑：**
```python
def fetch_with_cache(url: str, cache_dir: str) -> str:
    cache_file = f"{cache_dir}/{hash(url)}.json"
    if os.path.exists(cache_file):
        return read_file(cache_file)

    result = tavily_search(url)
    write_file(cache_file, result)
    return result
```

### 3. 摸底必须有真实样本

**禁止凭经验推测，必须展示实际检索结果**

```markdown
## ❌ 错误的摸底报告
"根据我的了解，AI 代码助手市场主要有以下产品..."

## ✅ 正确的摸底报告
"通过 Tavily 检索 'AI coding assistant market 2024'，获取以下样本：
1. [GitHub Copilot](https://...) - 微软产品，月活用户超 1M
2. [Cursor](https://...) - AI-first IDE，2024 年融资 $60M
..."
```

---

## 工具使用优先级

### 搜索工具选择

| 优先级 | 工具 | 适用场景 | 速率限制 |
|-------|------|---------|---------|
| 1 | `mcp__tavily-mcp__tavily_search` | 通用网页搜索 | 中 |
| 2 | `mcp__firecrawl-mcp__firecrawl_search` | 深度搜索 | 中 |
| 3 | `WebSearch` | 实时信息 | 低 |
| 4 | `WebFetch` | 已知 URL | 低 |

### Tavily 最佳配置

```javascript
mcp__tavily-mcp__tavily_search({
  query: "精确的搜索词",
  max_results: 6,           // 默认 6，覆盖不足时提至 10
  search_depth: "advanced", // 总是使用 advanced
  include_images: true,     // 除非明确要求纯文本
  include_image_descriptions: true
  // 避免 include_raw_content: true - 返回过大
})
```

### 页面提取最佳配置

```javascript
mcp__tavily-mcp__tavily_extract({
  urls: ["https://..."],
  extract_depth: "advanced",  // LinkedIn 等复杂页面必须
  format: "markdown"
})
```

---

## 子代理管理

### 并行数量控制

| 任务规模 | 推荐并行数 | 说明 |
|---------|----------|------|
| < 4 个 | 全部并行 | 直接启动 |
| 4-8 个 | 全部并行 | 默认模式 |
| 8-16 个 | 分 2 批 | 控制资源 |
| > 16 个 | 分批 + 队列 | 避免过载 |

### 超时策略

```markdown
| 任务类型 | 初始超时 | 重试超时 | 最大超时 |
|---------|---------|---------|---------|
| 简单搜索 | 3 分钟 | 5 分钟 | 5 分钟 |
| 深度调研 | 5 分钟 | 10 分钟 | 15 分钟 |
| 复杂分析 | 10 分钟 | 15 分钟 | 15 分钟 |
```

### 失败处理

```javascript
// 子代理 prompt 中内置失败处理
`
## 失败降级策略

1. 主数据源不可用 → 尝试备选数据源
2. 搜索无结果 → 调整关键词重试 1 次
3. 页面无法解析 → 记录错误，输出已获取内容
4. 超时 → 输出当前进度，标记 [TIMEOUT]

## 失败输出格式

## ⚠️ 任务未完成

### 失败原因
[具体原因]

### 已完成部分
- [x] 步骤1
- [x] 步骤2
- [ ] 步骤3 (失败)

### 已获取数据
[列出可用数据]

### 后续建议
[建议的补救措施]
`
```

---

## 日志与调试

### 日志分层

```
logs/
├── orchestrator.log    # 主控日志
├── subtask_001.log     # 子任务1日志
├── subtask_002.log     # 子任务2日志
└── aggregate.log       # 聚合日志
```

### 日志格式

```
[2024-01-15T10:30:00Z] [INFO] [orchestrator] 开始执行 Wide Research
[2024-01-15T10:30:01Z] [INFO] [orchestrator] 创建工作目录: runs/20240115-ai-market-abc123
[2024-01-15T10:30:05Z] [INFO] [orchestrator] 启动 4 个并行子任务
[2024-01-15T10:30:05Z] [INFO] [subtask_001] 开始执行: 调研 GitHub Copilot
[2024-01-15T10:35:00Z] [SUCCESS] [subtask_001] 完成，输出 2.3KB
[2024-01-15T10:35:30Z] [WARNING] [subtask_002] 重试: Tavily 429 错误
[2024-01-15T10:40:00Z] [ERROR] [subtask_003] 失败: 超时
```

---

## 输出质量控制

### 引用格式标准

```markdown
## ✅ 正确: 内联引用
GitHub Copilot 的定价从 $10/月起 [来源](https://github.com/features/copilot/pricing)。

## ❌ 错误: 集中引用
GitHub Copilot 的定价从 $10/月起。
...（其他内容）
参考资料: [1] https://...
```

### 数据时效性标注

```markdown
## ✅ 正确: 标注时间
市场规模: $50B (2024年预测, Gartner, 2024-01)

## ❌ 错误: 无时间标注
市场规模: $50B
```

### 完整理解再总结

```python
# ❌ 错误: 机械截断
summary = content[:500] + "..."

# ✅ 正确: 全文处理后提取要点
def extract_key_points(content: str) -> list[str]:
    # 解析全文
    parsed = parse_document(content)
    # 识别关键句
    key_sentences = identify_important_sentences(parsed)
    # 生成摘要
    return generate_summary(key_sentences)
```

---

## 常见问题与解决

### Q1: 子任务输出质量参差不齐

**原因**: prompt 约束不够明确
**解决**:
- 使用标准化模板
- 明确输出格式和示例
- 设置质量检查点

### Q2: 搜索结果相关性低

**原因**: 查询词过于宽泛
**解决**:
- 使用精确关键词 + 过滤条件
- 分阶段搜索: 先广后精
- 利用 `search_depth: "advanced"`

### Q3: 聚合后信息重复

**原因**: 子任务边界重叠
**解决**:
- 明确每个子任务的范围和边界
- 聚合时去重合并
- 使用维度划分而非主题划分

### Q4: 最终报告缺乏深度

**原因**: 子任务素材不足或统稿压缩过度
**解决**:
- 质检阶段检查素材覆盖率
- 逐章撰写，不一次性生成
- 保留量化数据和关键证据

### Q5: 执行时间过长

**原因**: 串行执行或单任务过大
**解决**:
- 确保并行执行
- 拆分大任务为多个小任务
- 设置合理超时

---

## 性能优化检查清单

执行前：
- [ ] 所有独立任务准备并行启动
- [ ] 工具选择优先级正确
- [ ] 缓存目录已创建
- [ ] 超时策略已配置

执行中：
- [ ] 监控子任务进度
- [ ] 及时处理失败任务
- [ ] 缓存命中率检查

执行后：
- [ ] 验证输出完整性
- [ ] 清理临时文件
- [ ] 记录执行统计

---

## 从 Codex CLI 迁移注意事项

| Codex 概念 | Claude Code 等效 | 注意事项 |
|-----------|-----------------|---------|
| `codex exec` | `Task` tool | Task 返回结果而非写入文件 |
| `--sandbox` | `allowed-tools` | skill 级别控制 |
| `--output-last-message` | Task 返回值 | 需手动写入文件 |
| `timeout` 命令 | Bash timeout | 仅对 Bash 有效 |
| `--json` 输出 | 无直接等效 | 在 prompt 中要求 JSON 格式 |
| `resume` 会话 | Task resume 参数 | 使用 agent ID 恢复 |

---

## 调试技巧

### 1. 验证 prompt 变量替换

```bash
# 生成 prompt 后立即检查
cat prompts/subtask_001.md | head -20
```

### 2. 测试单个子任务

```javascript
// 先串行测试 1 个子任务
Task("测试任务", "...", "researcher")
// 确认成功后再并行全部
```

### 3. 检查缓存命中

```bash
# 统计缓存命中率
ls raw/ | wc -l  # 原始文件数
# 对比搜索请求数
```

### 4. 追踪执行流程

```javascript
// 使用 TodoWrite 追踪每个步骤
TodoWrite([
  { content: "Phase 0: 摸底", status: "completed" },
  { content: "Phase 1: 初始化", status: "in_progress" },
  { content: "Phase 2: 准备 prompts", status: "pending" },
  // ...
])
```
