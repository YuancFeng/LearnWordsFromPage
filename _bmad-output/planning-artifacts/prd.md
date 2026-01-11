---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-LearnWordsFromPage-2026-01-06.md
  - runs/wide-research-20260106-223453/research-report.md
  - docs/index.md
  - docs/architecture.md
  - docs/component-inventory.md
  - docs/development-guide.md
  - docs/project-overview.md
  - docs/source-tree-analysis.md
workflowType: 'prd'
lastStep: 11
date: 2026-01-06
author: 冯少
projectName: LingoRecall AI
projectType: brownfield
wideResearchCompleted: true
---

# Product Requirements Document - LingoRecall AI

**Author:** 冯少
**Date:** 2026-01-06
**Version:** 1.0
**Status:** Ready for Development

---

## 1. Executive Summary

LingoRecall AI 是一款面向非英语母语者的智能词汇学习 Chrome 浏览器扩展。核心价值在于让用户在日常网页浏览中无摩擦地积累词汇，通过 **AI 语境分析** 和 **艾宾浩斯记忆曲线** 实现高效学习。

### 核心差异化

**"一键跳回原文位置并高亮显示"** —— 这是现有所有竞品（沙拉查词、沉浸式翻译、Relingo、划词翻译）都未实现的功能。

### 市场机会

- **沙拉查词停更**：12.9k GitHub Stars 的用户群被迫迁移（Chrome 138+ 禁用 MV2）
- **竞品功能缺口**：没有一款产品同时具备"语境保存 + 跳回原文 + 间隔复习"
- **用户痛点明确**：749+ GitHub Issues 反映的未满足需求

---

## 2. Project Discovery (Wide Research Summary)

### 2.1 沙拉查词停更原因

| 时间 | 事件 |
|------|------|
| 2025年3月 | Chrome 开始禁用 Manifest V2 扩展 |
| 2025年7月 | Chrome 138 完全无法使用 (Issue #2296) |
| 2025年8月 | 大量用户反馈"扩展不再受支持" |
| 2025年12月 | 彩云小译等词典源也相继失效 |

**核心原因**：MV2 → MV3 迁移未完成，开发者 crimx 未公开说明停更原因

### 2.2 用户迁移去向

| 竞品 | 用户规模 | 核心优势 | 核心缺陷 |
|------|----------|----------|----------|
| 沉浸式翻译 | 300万+ | Chrome 官方推荐、双语对照 | ❌ 无生词本、无跳回原文 |
| 划词翻译 | 30万+ | 轻量级、开源 | ❌ 无生词本、无复习功能 |
| Relingo | 4万+ | 自动提取生词 | ❌ 语境保存不完整、无跳回 |
| Trancy | 20万+ | 视频学习 | ❌ 偏视频场景 |

### 2.3 用户核心痛点

| 痛点 | 描述 | 频率 | LingoRecall 解决方案 |
|------|------|------|----------------------|
| 语境丢失 | "记住了单词但不记得在哪里看到的" | ⭐⭐⭐⭐⭐ | XPath 原文定位 + 跳回高亮 |
| 复习困难 | "生词本导出后还要手动管理复习" | ⭐⭐⭐⭐⭐ | 内置艾宾浩斯复习系统 |
| 跳转麻烦 | "想回看原文上下文很困难" | ⭐⭐⭐⭐ | 一键跳回原文功能 |
| 翻译不准 | "专业术语翻译不准确" | ⭐⭐⭐ | AI 语境分析 |

---

## 3. User Stories & Acceptance Criteria

### 3.1 Epic 1: 网页划词翻译

#### US-1.1: 划词触发
**As a** 英语学习者
**I want to** 在任意网页选中单词后看到翻译选项
**So that** 我可以无摩擦地查询生词

**Acceptance Criteria:**
- [ ] 选中文本后 300ms 内显示悬浮操作按钮
- [ ] 悬浮按钮包含"AI 分析"和"保存"两个选项
- [ ] 限制选中文本长度 ≤50 字符
- [ ] 支持单词、短语、句子选择
- [ ] 黑名单网站不触发（如银行、支付页面）

#### US-1.2: AI 语境分析
**As a** 用户
**I want to** 获取结合当前上下文的词汇解释
**So that** 我能理解这个词在当前语境中的准确含义

**Acceptance Criteria:**
- [ ] 显示词汇含义、音标、词性
- [ ] 提供结合当前上下文的语境化解释
- [ ] 针对网络俚语、专业术语给出适当解释
- [ ] 响应时间 <3 秒
- [ ] Token 消耗显示（可选）

### 3.2 Epic 2: 跳回原文（核心差异化）

#### US-2.1: 原文定位存储
**As a** 用户
**I want to** 保存单词时自动记录原文位置
**So that** 将来可以回到原文查看上下文

**Acceptance Criteria:**
- [ ] 保存时记录：URL + XPath + 选区偏移量
- [ ] 保存周围上下文（前后各 100 字符）
- [ ] 保存页面标题作为来源标识
- [ ] 支持动态页面的文本匹配备选方案

#### US-2.2: 一键跳回高亮
**As a** 用户
**I want to** 点击生词卡的"跳回原文"按钮回到原网页
**So that** 我可以在原始语境中复习这个词

**Acceptance Criteria:**
- [ ] 点击后新标签页打开原 URL
- [ ] 自动滚动到目标位置
- [ ] 高亮显示原始选中的词汇（黄色背景）
- [ ] 高亮持续 5 秒后渐隐
- [ ] 定位失败时显示友好提示

### 3.3 Epic 3: 艾宾浩斯复习

#### US-3.1: 复习提醒
**As a** 用户
**I want to** 在最佳记忆时间收到复习提醒
**So that** 我可以将短期记忆转化为长期记忆

**Acceptance Criteria:**
- [ ] 扩展图标 Badge 显示待复习数量
- [ ] 复习间隔：1天、3天、7天、15天、30天
- [ ] 点击 Badge 打开复习界面
- [ ] 支持"记住了"和"忘记了"两个按钮

#### US-3.2: 复习卡片
**As a** 用户
**I want to** 在简洁的卡片界面复习词汇
**So that** 我可以高效完成复习任务

**Acceptance Criteria:**
- [ ] 显示：词汇 → 点击显示含义
- [ ] 显示来源标题和上下文预览
- [ ] 提供"跳回原文"快捷入口
- [ ] 复习完成后自动计算下次复习时间

### 3.4 Epic 4: 生词本管理

#### US-4.1: 词库浏览
**As a** 用户
**I want to** 浏览和搜索我保存的所有词汇
**So that** 我可以管理我的学习进度

**Acceptance Criteria:**
- [ ] 列表展示所有保存的词汇
- [ ] 支持按时间、字母排序
- [ ] 支持关键词搜索
- [ ] 支持标签筛选
- [ ] 显示总词汇数和本周新增数

---

## 4. Functional Requirements

### 4.1 Content Script 功能

| ID | 功能 | 描述 | 优先级 |
|----|------|------|:------:|
| FR-1.1 | 文本选择监听 | 监听 mouseup 事件，检测选中文本 | P0 |
| FR-1.2 | 悬浮按钮渲染 | 在选区附近显示操作按钮 | P0 |
| FR-1.3 | 选区位置计算 | 获取 XPath、偏移量、上下文 | P0 |
| FR-1.4 | 消息通信 | 与 Service Worker 双向通信 | P0 |
| FR-1.5 | 高亮渲染 | 跳回原文时高亮目标文本 | P0 |

### 4.2 Service Worker 功能

| ID | 功能 | 描述 | 优先级 |
|----|------|------|:------:|
| FR-2.1 | AI API 调用 | 调用 Gemini API 进行语境分析 | P0 |
| FR-2.2 | 数据持久化 | IndexedDB 存储词汇数据 | P0 |
| FR-2.3 | 复习调度 | 计算艾宾浩斯复习时间 | P0 |
| FR-2.4 | Badge 更新 | 显示待复习词汇数量 | P0 |
| FR-2.5 | 消息路由 | 处理 Content Script 和 Popup 消息 | P0 |

### 4.3 Popup/Sidebar 功能

| ID | 功能 | 描述 | 优先级 |
|----|------|------|:------:|
| FR-3.1 | 词库列表 | 展示所有保存的词汇 | P0 |
| FR-3.2 | 复习界面 | 艾宾浩斯复习卡片 | P0 |
| FR-3.3 | 搜索筛选 | 按关键词、标签筛选 | P1 |
| FR-3.4 | 设置页面 | API Key 配置、偏好设置 | P1 |

---

## 5. Non-Functional Requirements

### 5.1 性能要求

| 指标 | 要求 | 测量方式 |
|------|------|----------|
| Content Script 加载 | <100ms | Performance API |
| AI 响应时间 | <3s | 从请求到显示 |
| 本地数据查询 | <50ms | IndexedDB 查询 |
| 跳回原文定位 | <2s | 页面加载完成到高亮显示 |

### 5.2 存储要求

| 数据类型 | 存储位置 | 容量预估 |
|----------|----------|----------|
| 词汇记录 | IndexedDB | ~1KB/词 |
| 设置配置 | chrome.storage.local | <10KB |
| 缓存数据 | chrome.storage.session | <1MB |

### 5.3 安全要求

- API Key 仅存储在本地，不上传服务器
- 不收集用户浏览历史
- 敏感页面（银行、支付）自动禁用
- 遵循 Manifest V3 安全规范

### 5.4 兼容性要求

- Chrome 88+ (Manifest V3 支持)
- 未来：Firefox、Edge、Safari

---

## 6. Data Model

### 6.1 WordRecord 词汇记录

```typescript
interface WordRecord {
  id: string;                    // UUID
  text: string;                  // 单词/短语文本
  meaning: string;               // AI 生成的解释
  pronunciation: string;         // IPA 音标
  partOfSpeech: string;          // 词性
  exampleSentence: string;       // 原文上下文

  // 来源定位
  sourceUrl: string;             // 来源 URL
  sourceTitle: string;           // 页面标题
  xpath: string;                 // 元素 XPath
  textOffset: number;            // 文本偏移量
  contextBefore: string;         // 前文（100字符）
  contextAfter: string;          // 后文（100字符）

  // 学习状态
  tagIds: string[];              // 标签 ID 数组
  createdAt: number;             // 创建时间戳
  nextReviewAt: number;          // 下次复习时间
  reviewCount: number;           // 复习次数
  easeFactor: number;            // SM-2 难度因子
  interval: number;              // 当前复习间隔（天）
}
```

### 6.2 Tag 标签

```typescript
interface Tag {
  id: string;
  name: string;
  color: string;                 // HEX 颜色
  createdAt: number;
}
```

### 6.3 Settings 设置

```typescript
interface Settings {
  apiKey: string;                // Gemini API Key
  aiModel: string;               // 使用的 AI 模型
  enableDoubleClick: boolean;    // 双击查词
  enableHoverIcon: boolean;      // 悬浮图标
  blacklistUrls: string[];       // 黑名单 URL 模式
  reviewReminder: boolean;       // 复习提醒
  theme: 'light' | 'dark' | 'system';
}
```

---

## 7. API Specifications

### 7.1 AI 分析 API

**Endpoint:** Gemini 2.5 Flash-Lite

**System Prompt:**
```
你是一个专业的英语词汇教师。用户会给你一个英语单词或短语，以及它出现的上下文。
请提供：
1. 在当前语境中的准确含义（中文）
2. IPA 音标
3. 词性
4. 一个简短的用法说明

回复格式（JSON）：
{
  "meaning": "含义",
  "pronunciation": "/发音/",
  "partOfSpeech": "词性",
  "usage": "用法说明"
}
```

**Token 限制:**
- 输入：<500 tokens
- 输出：<300 tokens
- 每用户每日：100 次

### 7.2 消息协议

**Content Script → Service Worker:**
```typescript
interface AnalyzeRequest {
  type: 'ANALYZE_WORD';
  payload: {
    text: string;
    context: string;
    url: string;
    xpath: string;
  };
}

interface SaveWordRequest {
  type: 'SAVE_WORD';
  payload: WordRecord;
}
```

**Service Worker → Content Script:**
```typescript
interface HighlightRequest {
  type: 'HIGHLIGHT_TEXT';
  payload: {
    xpath: string;
    textOffset: number;
    text: string;
  };
}
```

---

## 8. UI/UX Specifications

### 8.1 悬浮按钮

- 尺寸：32x32px 圆形按钮
- 位置：选区右上角偏移 8px
- 动画：fadeIn 200ms
- 颜色：主色调 #3B82F6 (蓝色)

### 8.2 分析结果弹窗

- 宽度：320px
- 最大高度：400px
- 圆角：8px
- 阴影：0 4px 12px rgba(0,0,0,0.15)
- 内容：词汇、音标（可点击发音）、含义、保存按钮

### 8.3 跳回高亮样式

```css
.lingorecall-highlight {
  background-color: #FEF08A;  /* 淡黄色 */
  border-radius: 2px;
  padding: 0 2px;
  animation: highlight-fade 5s ease-out forwards;
}

@keyframes highlight-fade {
  0%, 80% { background-color: #FEF08A; }
  100% { background-color: transparent; }
}
```

---

## 9. Test Requirements

### 9.1 单元测试

| 模块 | 测试覆盖 |
|------|----------|
| XPath 生成 | 各种 DOM 结构的正确定位 |
| 艾宾浩斯计算 | 复习间隔计算准确性 |
| 消息通信 | 请求响应正确性 |
| 数据持久化 | CRUD 操作完整性 |

### 9.2 集成测试

| 场景 | 测试内容 |
|------|----------|
| 完整流程 | 选词 → AI 分析 → 保存 → 跳回 |
| 复习流程 | 提醒 → 复习 → 更新间隔 |
| 边界情况 | 动态页面、SPA、iframe |

### 9.3 E2E 测试

| 场景 | 测试页面 |
|------|----------|
| 静态页面 | Wikipedia 文章 |
| 动态页面 | Twitter/X 帖子 |
| 技术文档 | MDN Web Docs |

---

## 10. Release Plan

### 10.1 MVP (v0.1.0) - 2周

| 功能 | 状态 |
|------|:----:|
| Content Script 划词 | 🔜 |
| AI 语境分析 | ✅ 已有基础 |
| 原文定位存储 | 🔜 |
| 跳回原文高亮 | 🔜 |
| 本地存储 | 🔜 |
| 艾宾浩斯复习 | 🔜 |

### 10.2 Beta (v0.2.0) - 4周

| 功能 | 状态 |
|------|:----:|
| 双击查词 | 📋 |
| 悬浮图标 | 📋 |
| 搜索筛选 | 📋 |
| 标签管理 | 📋 |
| 设置页面 | 📋 |

### 10.3 GA (v1.0.0) - 8周

| 功能 | 状态 |
|------|:----:|
| Anki 导出 | 📋 |
| 多 AI 源支持 | 📋 |
| 数据统计 | 📋 |
| Chrome 商店发布 | 📋 |

---

## 11. Success Metrics

### 11.1 MVP 成功标准 (4周内)

| 指标 | 目标 |
|------|------|
| 安装用户数 | 100+ |
| 7日留存率 | >25% |
| 跳回原文使用率 | >20% |
| 致命 Bug | 0 |

### 11.2 北极星指标

**"每周完成艾宾浩斯复习的用户数"**

选择理由：
1. 反映用户真正在使用核心学习功能
2. 与长期留存高度相关
3. 体现产品差异化价值

---

## Appendix A: Wide Research Reference

详细竞品分析和用户调研报告见：
`runs/wide-research-20260106-223453/research-report.md`

## Appendix B: Technical Architecture

详细技术架构见：
`docs/architecture.md`

---

**PRD 状态**: ✅ 完成
**下一步**: 开始 P0 功能开发
**文档版本**: 1.0
**最后更新**: 2026-01-06

