---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-01-08'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-LearnWordsFromPage-2026-01-06.md
  - _bmad-output/planning-artifacts/prd.md
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture.md
  - docs/source-tree-analysis.md
  - docs/component-inventory.md
  - docs/development-guide.md
workflowType: 'architecture'
project_name: 'LingoRecall AI'
user_name: '冯少'
date: '2026-01-07'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

LingoRecall AI 包含 14 个核心功能需求，分布于 4 个模块：

| 模块 | 职责 | 关键 FR |
|------|------|---------|
| **Content Script** | 网页内嵌交互 | 文本选择监听、悬浮按钮渲染、XPath 定位、消息通信、高亮渲染 |
| **Service Worker** | 后台逻辑处理 | AI API 调用、IndexedDB 持久化、艾宾浩斯调度、Badge 更新 |
| **Popup/Sidebar** | 用户界面 | 词库管理、复习卡片、搜索筛选、设置配置 |
| **存储层** | 数据持久化 | IndexedDB 主存储、chrome.storage 配置 |

**Non-Functional Requirements:**

| 类别 | 要求 | 架构决策影响 |
|------|------|-------------|
| 性能 | Content Script 加载 <100ms | 最小化注入代码量 |
| 性能 | AI 响应 <3s | 异步处理 + 流式响应 |
| 性能 | 本地查询 <50ms | IndexedDB 索引设计 |
| 安全 | API Key 本地存储 | 禁止网络传输敏感数据 |
| 兼容 | Chrome 88+ | Manifest V3 API 约束 |

**Scale & Complexity:**

- Primary domain: Chrome 浏览器扩展 (Full-stack Extension)
- Complexity level: Medium
- Estimated architectural components: 6-8

### Technical Constraints & Dependencies

| 约束 | 影响 |
|------|------|
| Manifest V3 | Service Worker 替代 Background Page，生命周期受限 |
| Content Script 隔离 | 需通过消息传递与扩展通信 |
| 外部 AI API | 网络延迟、速率限制、API 兼容性 |
| 现有代码库 | 需与 React Popup 架构无缝集成 |

### Cross-Cutting Concerns Identified

1. **消息通信架构** - Content Script ↔ Service Worker ↔ Popup 三方通信协议
2. **错误处理策略** - AI API 失败、网络断开、存储满等异常场景
3. **存储抽象层** - IndexedDB + chrome.storage 的统一访问接口
4. **AI 服务统一** - 多提供者（Gemini/Ollama/Custom）的适配器模式
5. **原文定位恢复** - XPath + 文本匹配的双重定位策略

## Starter Template Evaluation

### Primary Technology Domain

Chrome 浏览器扩展 (Manifest V3) - Brownfield 项目

### Project Status Assessment

**Existing Codebase Analysis:**

| 维度 | 现状 |
|------|------|
| 代码量 | ~1,300 行 TypeScript |
| 组件数 | 4 个 React 组件 |
| 服务数 | 1 个 AI 服务层 |
| 构建工具 | Vite 6.2.0 (已配置) |

### Starter Template Decision: 不使用外部 Starter

**决策理由:**

1. **Brownfield 项目** - 已有完整的 React + Vite + TypeScript 技术栈
2. **Popup 应用完成度高** - UI 组件、AI 服务层已实现
3. **技术栈先进** - React 19、TypeScript 5.8、Vite 6 均为最新版本
4. **避免迁移成本** - 引入 Starter 需要重构现有代码

### Architectural Extension Strategy

**需要新增的模块（在现有架构上扩展）：**

| 模块 | 文件 | 职责 |
|------|------|------|
| Content Script | `src/content/index.ts` | 网页划词交互 |
| Service Worker | `src/background/index.ts` | 后台逻辑处理 |
| Storage Layer | `src/storage/` | IndexedDB + chrome.storage 抽象 |
| Messaging | `src/messaging/` | 统一消息通信协议 |
| Utils | `src/utils/` | XPath、艾宾浩斯算法等工具 |

### Initialization Command

无需初始化新项目，在现有代码库中扩展：

```bash
# 现有项目结构，无需 starter 命令
cd LearnWordsFromPage
npm install  # 已有 package.json
```

### Architectural Decisions Inherited from Existing Codebase

**Language & Runtime:**
- TypeScript 5.8.2 (strict mode)
- ES2022 target

**Styling Solution:**
- Tailwind CSS via CDN
- 无 PostCSS 构建步骤（保持简单）

**Build Tooling:**
- Vite 6.2.0 + @vitejs/plugin-react
- 路径别名: `@/*` → 根目录

**Testing Framework:**
- 待选择（建议 Vitest 与 Vite 生态一致）

**Code Organization:**
- 组件: `components/`
- 服务: `services/`
- 类型: `types.ts`
- 常量: `constants.ts`

**Development Experience:**
- Vite HMR 热更新
- TypeScript 类型检查
- ESLint 待配置

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. 数据存储方案 - IndexedDB + chrome.storage 混合
2. 消息通信协议 - 统一 Message 类型定义
3. Content Script UI 注入 - Shadow DOM 隔离
4. 构建配置 - Vite 多入口

**Important Decisions (Shape Architecture):**
1. IndexedDB Schema 设计
2. 状态管理方案
3. XPath 定位策略
4. 艾宾浩斯调度实现

**Deferred Decisions (Post-MVP):**
1. 云同步方案
2. 多浏览器支持
3. Anki 导出格式

---

### Data Architecture

#### Decision 1.1: 存储方案分层

| 存储层 | 技术 | 数据类型 |
|--------|------|----------|
| **主存储** | IndexedDB | WordRecord, Tag |
| **配置存储** | chrome.storage.local | AIConfig, Settings |
| **会话缓存** | chrome.storage.session | 临时状态 |

**决策理由:**
- IndexedDB 支持复杂查询和索引，适合词汇数据
- chrome.storage.local 同步简单，适合配置
- 分层设计便于未来云同步扩展

#### Decision 1.2: IndexedDB Schema

```typescript
// Database: LingoRecallDB v1
interface DBSchema {
  // Object Store: words
  words: {
    keyPath: 'id';
    indexes: {
      byCreatedAt: 'createdAt';
      byNextReviewAt: 'nextReviewAt';
      byTagId: 'tagIds';        // multiEntry: true
      bySourceUrl: 'sourceUrl';
    };
  };

  // Object Store: tags
  tags: {
    keyPath: 'id';
  };
}
```

**索引设计理由:**
- `byCreatedAt` - 时间排序显示词库列表
- `byNextReviewAt` - 高效查询待复习词汇
- `byTagId` - 支持多标签筛选（multiEntry）
- `bySourceUrl` - 跳回原文时的快速匹配

---

### API & Communication Patterns

#### Decision 2.1: 统一消息协议

```typescript
// 消息类型定义
type MessageType =
  | 'ANALYZE_WORD'       // 请求 AI 分析
  | 'SAVE_WORD'          // 保存词汇
  | 'GET_WORDS'          // 获取词汇列表
  | 'GET_DUE_WORDS'      // 获取待复习词汇
  | 'UPDATE_WORD'        // 更新词汇（复习结果）
  | 'DELETE_WORD'        // 删除词汇
  | 'HIGHLIGHT_TEXT'     // 跳回原文高亮
  | 'UPDATE_BADGE'       // 更新 Badge

// 统一消息结构
interface Message<T extends MessageType = MessageType> {
  type: T;
  payload: PayloadMap[T];
  requestId?: string;     // Request/Response 模式
  timestamp?: number;
}

// 统一响应结构
interface Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  requestId?: string;
}
```

#### Decision 2.2: 通信模式选择

| 场景 | 模式 | API |
|------|------|-----|
| AI 分析请求 | Request/Response | `chrome.runtime.sendMessage` |
| 保存/查询词汇 | Request/Response | `chrome.runtime.sendMessage` |
| Badge 更新 | Fire-and-Forget | `chrome.action.setBadgeText` |
| 跳回原文 | Tab Message | `chrome.tabs.sendMessage` |

---

### Frontend Architecture

#### Decision 3.1: 状态管理

**方案**: React Hooks + 自定义 Hooks 封装

```typescript
// 自定义 Hooks 架构
src/hooks/
├── useVocabulary.ts    // 词汇 CRUD 操作
├── useReview.ts        // 复习调度逻辑
├── useAIConfig.ts      // AI 配置管理
├── useStorage.ts       // 存储抽象层
└── useMessaging.ts     // 消息通信封装
```

**决策理由:**
- 保持零额外依赖
- 复用现有 React 19 Hooks 模式
- 自定义 Hooks 提供清晰的关注点分离

#### Decision 3.2: Content Script UI 注入

**方案**: Shadow DOM + 内联样式

```typescript
// UI 注入策略
function injectUI() {
  const host = document.createElement('lingorecall-root');
  const shadow = host.attachShadow({ mode: 'closed' });

  // 内联 Tailwind 样式（构建时提取）
  const style = document.createElement('style');
  style.textContent = INJECTED_STYLES;
  shadow.appendChild(style);

  // React 渲染到 Shadow DOM
  const root = createRoot(shadow);
  root.render(<SelectionPopup />);

  document.body.appendChild(host);
}
```

**决策理由:**
- `mode: 'closed'` 防止网页访问内部 DOM
- 样式完全隔离，不受网页 CSS 影响
- 使用自定义元素名避免冲突

---

### Infrastructure & Deployment

#### Decision 4.1: Vite 多入口构建

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'popup') return 'assets/[name]-[hash].js';
          return '[name].js';  // content.js, background.js
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
```

#### Decision 4.2: manifest.json 更新

```json
{
  "manifest_version": 3,
  "name": "LingoRecall AI",
  "version": "0.1.0",
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "alarms",
    "contextMenus"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "index.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

---

### Core Feature Implementation

#### Decision 5.1: XPath 双重定位策略

```typescript
interface SourceLocation {
  // 主定位：XPath + 偏移量
  xpath: string;
  textOffset: number;
  textLength: number;

  // 备选定位：上下文文本匹配
  contextBefore: string;   // 前 100 字符
  contextAfter: string;    // 后 100 字符
  originalText: string;    // 原始选中文本
}

// 定位恢复算法
async function locateAndHighlight(location: SourceLocation): Promise<boolean> {
  // Step 1: 尝试 XPath 精确定位
  const element = document.evaluate(
    location.xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE
  ).singleNodeValue;

  if (element?.textContent?.includes(location.originalText)) {
    return highlightInElement(element, location);
  }

  // Step 2: 降级到全文搜索
  const textNodes = getTextNodesIn(document.body);
  for (const node of textNodes) {
    if (matchesContext(node, location)) {
      return highlightTextNode(node, location.originalText);
    }
  }

  // Step 3: 定位失败
  return false;
}
```

#### Decision 5.2: 艾宾浩斯复习调度

```typescript
// 复习间隔配置（天数）
const REVIEW_INTERVALS = [1, 3, 7, 15, 30, 60, 120];

// SM-2 简化算法
function calculateNextReview(
  reviewCount: number,
  quality: 'remembered' | 'forgotten'
): { nextReviewAt: number; newInterval: number } {
  const now = Date.now();

  if (quality === 'forgotten') {
    // 忘记则重置到第一个间隔
    return {
      nextReviewAt: now + REVIEW_INTERVALS[0] * 24 * 60 * 60 * 1000,
      newInterval: REVIEW_INTERVALS[0],
    };
  }

  // 记住则进入下一个间隔
  const nextIndex = Math.min(reviewCount, REVIEW_INTERVALS.length - 1);
  const interval = REVIEW_INTERVALS[nextIndex];

  return {
    nextReviewAt: now + interval * 24 * 60 * 60 * 1000,
    newInterval: interval,
  };
}

// Service Worker Alarm 调度
chrome.alarms.create('reviewCheck', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'reviewCheck') {
    const dueCount = await countDueWords();
    chrome.action.setBadgeText({
      text: dueCount > 0 ? String(dueCount) : ''
    });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  }
});
```

---

### Decision Impact Analysis

**Implementation Sequence:**

1. **Phase 1: 基础设施**
   - IndexedDB 存储层
   - 消息通信协议
   - Vite 多入口配置

2. **Phase 2: Content Script**
   - Shadow DOM UI 注入
   - 文本选择监听
   - XPath 提取

3. **Phase 3: Service Worker**
   - 消息路由
   - AI 调用代理
   - 复习调度

4. **Phase 4: 功能集成**
   - 跳回原文高亮
   - 艾宾浩斯复习
   - Badge 更新

**Cross-Component Dependencies:**

```
Content Script ──────┐
                     │
                     ▼
              ┌─────────────┐
              │   Service   │ ←── Alarms
              │   Worker    │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    IndexedDB   chrome.storage   AI API
         │           │
         └─────┬─────┘
               ▼
         ┌─────────┐
         │  Popup  │
         └─────────┘
```

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 15+ areas where AI agents could make different choices

---

### Naming Patterns

#### Message Type Naming
- **规则**: SCREAMING_SNAKE_CASE
- **示例**: `ANALYZE_WORD`, `SAVE_WORD`, `GET_WORDS`

#### File Naming

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| React 组件 | PascalCase.tsx | `WordCard.tsx` |
| Hooks | camelCase.ts | `useVocabulary.ts` |
| 服务/工具 | camelCase.ts | `geminiService.ts` |
| 类型定义 | types.ts 或 *.types.ts | `messaging/types.ts` |

#### IndexedDB Naming
- **Database**: PascalCase (`LingoRecallDB`)
- **Object Store**: lowercase plural (`words`, `tags`)
- **Index**: by + FieldName (`byCreatedAt`, `byNextReviewAt`)

---

### Structure Patterns

#### Directory Organization

```
src/
├── background/       # Service Worker 入口和处理器
├── content/          # Content Script 入口和 UI
├── popup/            # Popup React 应用
├── shared/           # 跨上下文共享代码
│   ├── messaging/    # 消息类型和工具
│   ├── storage/      # IndexedDB 抽象层
│   ├── types/        # 共享类型定义
│   └── utils/        # 通用工具函数
└── hooks/            # React Hooks
```

#### Test File Placement
- **规则**: 测试文件与源文件同目录
- **命名**: `*.test.ts` 或 `*.spec.ts`
- **示例**: `src/utils/xpath.ts` → `src/utils/xpath.test.ts`

---

### Format Patterns

#### Unified Response Structure

```typescript
interface Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
  };
}
```

#### Error Codes

```typescript
enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AI_API_ERROR = 'AI_API_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  LOCATION_FAILED = 'LOCATION_FAILED',
}
```

#### DateTime Handling
- **存储**: Unix 时间戳 (`Date.now()`)
- **显示**: `Intl.DateTimeFormat` 格式化
- **计算**: 毫秒级时间戳运算

---

### Communication Patterns

#### Message Sending

```typescript
// 统一消息发送函数
async function sendMessage<T extends MessageType>(
  type: T,
  payload: PayloadMap[T]
): Promise<Response<ResponseMap[T]>>
```

#### Async Operation Pattern
- **规则**: 始终使用 async/await
- **错误处理**: try/catch 包装，返回 Response 对象
- **禁止**: Promise.then/catch 链式调用

---

### Process Patterns

#### Error Handling Layers

| 层级 | 职责 | 返回值 |
|------|------|--------|
| 服务层 | 捕获错误，返回 Response | `Response<T>` |
| Hook 层 | 管理状态，暴露 error | `{ data, error, isLoading }` |
| UI 层 | 显示错误信息 | JSX |

#### Loading State Management
- **规则**: 每个操作独立 loading 状态
- **命名**: `is{Action}ing` (如 `isSaving`, `isAnalyzing`)
- **禁止**: 全局共享 loading 状态

---

### Enforcement Guidelines

**All AI Agents MUST:**
1. 使用 TypeScript strict mode 并定义所有类型
2. 遵循统一的消息类型命名 (SCREAMING_SNAKE_CASE)
3. 使用统一的 Response 结构返回异步结果
4. 将测试文件放在源文件同目录
5. 使用 async/await 处理异步操作

**Pattern Verification:**
- TypeScript 编译器强制类型检查
- ESLint 规则检查命名约定
- Code Review 时验证模式遵循

---

### Pattern Examples

**Good Example - Message Handler:**

```typescript
// ✅ 遵循所有模式
async function handleSaveWord(
  payload: SaveWordPayload
): Promise<Response<void>> {
  try {
    await db.words.add(payload.word);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
```

**Anti-Patterns:**

```typescript
// ❌ 混用 Promise.then
saveWord(word).then(res => { ... });

// ❌ 错误的消息类型命名
type MessageType = 'analyzeWord';  // 应该是 'ANALYZE_WORD'

// ❌ 不一致的响应结构
return { ok: true, result: data };  // 应该是 { success: true, data }

// ❌ 全局 loading 状态
const [isLoading, setIsLoading] = useState(false);  // 应该分开
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
LearnWordsFromPage/
├── src/
│   ├── background/                 # Service Worker (后台逻辑)
│   │   ├── index.ts                # 入口点，消息路由
│   │   ├── handlers/
│   │   │   ├── wordHandlers.ts     # 词汇 CRUD 处理
│   │   │   └── aiHandlers.ts       # AI 分析代理
│   │   ├── alarms.ts               # 复习调度 (chrome.alarms)
│   │   └── badge.ts                # Badge 更新
│   │
│   ├── content/                    # Content Script (网页交互)
│   │   ├── index.ts                # 入口点，初始化
│   │   ├── selection.ts            # 文本选择监听
│   │   ├── highlight.ts            # 高亮渲染
│   │   ├── xpath.ts                # XPath 提取与定位
│   │   ├── components/
│   │   │   ├── FloatingButton.tsx  # 悬浮按钮
│   │   │   └── AnalysisPopup.tsx   # 分析结果弹窗
│   │   └── shadow.ts               # Shadow DOM 注入
│   │
│   ├── popup/                      # Popup React 应用
│   │   ├── index.tsx               # React 入口
│   │   ├── App.tsx                 # 主组件
│   │   └── components/
│   │       ├── WordCard.tsx        # 词汇卡片
│   │       ├── ReviewCard.tsx      # 复习卡片
│   │       ├── TagFilter.tsx       # 标签筛选
│   │       └── SettingsPanel.tsx   # 设置面板
│   │
│   ├── shared/                     # 跨上下文共享
│   │   ├── messaging/
│   │   │   ├── types.ts            # 消息类型定义
│   │   │   ├── sender.ts           # 发送工具
│   │   │   └── handlers.ts         # 处理器注册
│   │   ├── storage/
│   │   │   ├── db.ts               # IndexedDB 封装
│   │   │   ├── config.ts           # chrome.storage 封装
│   │   │   └── migrations.ts       # 数据库迁移
│   │   ├── types/
│   │   │   ├── word.ts             # WordRecord 类型
│   │   │   ├── tag.ts              # Tag 类型
│   │   │   └── ai.ts               # AI 相关类型
│   │   └── utils/
│   │       ├── ebbinghaus.ts       # 艾宾浩斯算法
│   │       └── datetime.ts         # 时间工具
│   │
│   ├── hooks/                      # React Hooks
│   │   ├── useVocabulary.ts        # 词汇 CRUD
│   │   ├── useReview.ts            # 复习逻辑
│   │   ├── useAIConfig.ts          # AI 配置
│   │   ├── useStorage.ts           # 存储抽象
│   │   └── useMessaging.ts         # 消息通信
│   │
│   └── services/
│       └── aiService.ts            # AI 服务层 (已有)
│
├── public/
│   ├── manifest.json               # 扩展清单
│   └── icons/                      # 扩展图标
│
├── dist/                           # 构建输出
│   ├── popup.html
│   ├── content.js
│   ├── background.js
│   └── assets/
│
├── tests/                          # 测试文件
│   ├── unit/
│   │   ├── storage/
│   │   ├── messaging/
│   │   └── utils/
│   └── integration/
│
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.local                      # API Keys (git ignored)
```

### Architectural Context Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Page Context                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Content Script                          │  │
│  │   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐   │  │
│  │   │  selection  │   │   xpath     │   │  highlight   │   │  │
│  │   │    .ts      │   │    .ts      │   │     .ts      │   │  │
│  │   └──────┬──────┘   └──────┬──────┘   └──────────────┘   │  │
│  │          │                 │                              │  │
│  │   ┌──────▼─────────────────▼──────┐                      │  │
│  │   │    Shadow DOM Components      │                      │  │
│  │   │ (FloatingButton, AnalysisPopup)│                      │  │
│  │   └───────────────┬───────────────┘                      │  │
│  └───────────────────│───────────────────────────────────────┘  │
└──────────────────────│──────────────────────────────────────────┘
                       │ chrome.runtime.sendMessage
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Extension Context                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Service Worker                           │  │
│  │   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐   │  │
│  │   │  handlers   │   │   alarms    │   │    badge     │   │  │
│  │   │   (AI/Word) │   │    .ts      │   │     .ts      │   │  │
│  │   └──────┬──────┘   └──────┬──────┘   └──────────────┘   │  │
│  │          │                 │                              │  │
│  │   ┌──────▼─────────────────▼──────┐                      │  │
│  │   │         Storage Layer          │                      │  │
│  │   │   (IndexedDB + chrome.storage) │                      │  │
│  │   └───────────────────────────────┘                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Popup (React)                           │  │
│  │   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐   │  │
│  │   │  WordCard   │   │ ReviewCard  │   │  Settings    │   │  │
│  │   └──────┬──────┘   └──────┬──────┘   └──────────────┘   │  │
│  │          │                 │                              │  │
│  │   ┌──────▼─────────────────▼──────┐                      │  │
│  │   │          Hooks Layer           │                      │  │
│  │   │ (useVocabulary, useReview...)  │                      │  │
│  │   └───────────────────────────────┘                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼ External API
┌─────────────────────────────────────────────────────────────────┐
│                      AI Provider APIs                            │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │   Gemini     │   │   Ollama     │   │   Custom     │       │
│   │   Cloud      │   │   Local      │   │   Endpoint   │       │
│   └──────────────┘   └──────────────┘   └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Requirements to Structure Mapping

| PRD 需求 ID | 功能描述 | 实现文件 |
|-------------|----------|----------|
| FR-CS-01 | 文本选择监听 | `src/content/selection.ts` |
| FR-CS-02 | 悬浮按钮显示 | `src/content/components/FloatingButton.tsx` |
| FR-CS-03 | XPath 位置保存 | `src/content/xpath.ts` |
| FR-CS-04 | 消息发送 | `src/shared/messaging/sender.ts` |
| FR-CS-05 | 高亮渲染 | `src/content/highlight.ts` |
| FR-SW-01 | AI 调用代理 | `src/background/handlers/aiHandlers.ts` |
| FR-SW-02 | 数据持久化 | `src/shared/storage/db.ts` |
| FR-SW-03 | 艾宾浩斯调度 | `src/shared/utils/ebbinghaus.ts` |
| FR-SW-04 | Badge 更新 | `src/background/badge.ts` |
| FR-PU-01 | 词库列表显示 | `src/popup/components/WordCard.tsx` |
| FR-PU-02 | 复习卡片交互 | `src/popup/components/ReviewCard.tsx` |
| FR-PU-03 | 搜索筛选 | `src/hooks/useVocabulary.ts` |
| FR-PU-04 | AI 设置配置 | `src/popup/components/SettingsPanel.tsx` |
| FR-PU-05 | 跳回原文触发 | `src/hooks/useVocabulary.ts` + messaging |

### Data Flow Diagram

```
用户选择文本
      │
      ▼
┌─────────────────┐
│ Content Script  │
│ selection.ts    │──────┐
└────────┬────────┘      │
         │               │ XPath 提取
         ▼               ▼
┌─────────────────┐  ┌─────────────┐
│ FloatingButton  │  │  xpath.ts   │
│ .tsx            │  └─────────────┘
└────────┬────────┘
         │ 用户点击
         ▼
┌─────────────────┐
│ ANALYZE_WORD    │◄─────── Message
│ Message         │
└────────┬────────┘
         │ chrome.runtime.sendMessage
         ▼
┌─────────────────┐
│ Service Worker  │
│ index.ts        │
└────────┬────────┘
         │ 路由到 Handler
         ▼
┌─────────────────┐
│ aiHandlers.ts   │──────────────► AI API
└────────┬────────┘                  │
         │                           │
         ◄───────────────────────────┘
         │ AI 分析结果
         ▼
┌─────────────────┐
│ Response        │──────► Content Script
│ {success, data} │       └──► AnalysisPopup
└────────┬────────┘
         │ 用户点击保存
         ▼
┌─────────────────┐
│ SAVE_WORD       │
│ Message         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ wordHandlers.ts │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ IndexedDB       │
│ db.ts           │
└─────────────────┘
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- React 19 + TypeScript 5.8 + Vite 6 技术栈完全兼容
- Chrome Manifest V3 API 与 Service Worker 架构一致
- IndexedDB + chrome.storage 分层存储无冲突
- Shadow DOM 隔离策略与 React 渲染兼容

**Pattern Consistency:**
- SCREAMING_SNAKE_CASE 消息类型命名贯穿全部消息定义
- 统一 Response 结构适用于所有异步操作
- 文件命名约定（PascalCase 组件、camelCase 工具）一致

**Structure Alignment:**
- src/ 目录结构完全支持 Chrome Extension 三上下文架构
- shared/ 模块正确处理跨上下文代码共享
- hooks/ 与 services/ 分层清晰

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

| 模块 | 需求数 | 已覆盖 | 覆盖率 |
|------|--------|--------|--------|
| Content Script | 5 | 5 | 100% |
| Service Worker | 4 | 4 | 100% |
| Popup/Sidebar | 5 | 5 | 100% |
| **总计** | **14** | **14** | **100%** |

**Non-Functional Requirements Coverage:**
- ✅ 性能 <100ms Content Script 加载 → 最小化注入、延迟加载
- ✅ 性能 <3s AI 响应 → 异步消息 + 流式响应架构
- ✅ 性能 <50ms 本地查询 → IndexedDB 索引设计
- ✅ 安全 API Key 本地存储 → chrome.storage.local + .env.local
- ✅ 兼容 Chrome 88+ → Manifest V3 标准 API

### Implementation Readiness Validation ✅

**Decision Completeness:**
- 6 大类核心决策全部文档化
- 每个决策包含代码示例和理由说明
- 版本号明确（React 19.2.3, TS 5.8.2, Vite 6.2.0）

**Structure Completeness:**
- 完整目录树定义 20+ 文件位置
- 每个 PRD 需求映射到具体文件路径
- 上下文边界图明确组件间通信

**Pattern Completeness:**
- 15+ 潜在冲突点已定义一致性规则
- 包含正面示例和反模式示例
- 错误处理三层架构明确

### Gap Analysis Results

**Critical Gaps: 无**

**Important Gaps (可后续完善):**
- ESLint 配置待添加
- Vitest 测试框架待配置
- CI/CD 流程未定义

**Nice-to-Have:**
- 性能监控 hook
- 调试工具集成
- 文档自动生成

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 项目上下文彻底分析
- [x] 规模与复杂度评估完成
- [x] 技术约束识别（Manifest V3 限制）
- [x] 跨切面关注点映射

**✅ Architectural Decisions**
- [x] 关键决策文档化并包含版本号
- [x] 技术栈完整指定
- [x] 集成模式定义（消息通信）
- [x] 性能考量已处理

**✅ Implementation Patterns**
- [x] 命名约定建立
- [x] 结构模式定义
- [x] 通信模式指定
- [x] 流程模式文档化

**✅ Project Structure**
- [x] 完整目录结构定义
- [x] 组件边界建立
- [x] 集成点映射
- [x] 需求到结构映射完成

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**
1. Brownfield 项目利用现有成熟代码库
2. Chrome Extension 三上下文架构边界清晰
3. 消息协议统一，减少 AI Agent 冲突
4. XPath + 文本匹配双重定位策略保证跳回原文可靠性
5. 艾宾浩斯算法简化实现，易于理解和调试

**Areas for Future Enhancement:**
1. 云同步功能（Post-MVP）
2. 多浏览器支持（Firefox WebExtension）
3. Anki 导出格式
4. 性能分析 Dashboard

### Implementation Handoff

**AI Agent Guidelines:**
- 严格遵循架构决策，特别是消息类型命名
- 使用统一 Response 结构处理所有异步操作
- 保持项目结构和边界
- 有疑问参考本文档的"反模式"示例

**First Implementation Priority:**
1. 配置 Vite 多入口构建
2. 实现 IndexedDB 存储层
3. 建立消息通信基础设施
4. Content Script Shadow DOM 注入

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-08
**Document Location:** _bmad-output/planning-artifacts/architecture.md

### Final Architecture Deliverables

**Complete Architecture Document**
- 所有架构决策已文档化，包含具体版本号
- 实现模式确保 AI Agent 一致性
- 完整项目结构包含所有文件和目录
- 需求到架构的完整映射
- 验证确认一致性和完整性

**Implementation Ready Foundation**
- 6 大类核心架构决策
- 15+ 实现模式定义
- 4 个架构上下文（Web Page, Content Script, Service Worker, Popup）
- 14 个功能需求全覆盖

**AI Agent Implementation Guide**
- 技术栈及验证版本
- 防止实现冲突的一致性规则
- 项目结构及清晰边界
- 集成模式和通信标准

### Development Sequence

1. **Phase 1: 基础设施**
   - 配置 Vite 多入口构建
   - 实现 IndexedDB 存储层 (`src/shared/storage/db.ts`)
   - 建立消息通信协议 (`src/shared/messaging/`)

2. **Phase 2: Content Script**
   - Shadow DOM 注入 (`src/content/shadow.ts`)
   - 文本选择监听 (`src/content/selection.ts`)
   - XPath 提取 (`src/content/xpath.ts`)

3. **Phase 3: Service Worker**
   - 消息路由 (`src/background/index.ts`)
   - AI 调用代理 (`src/background/handlers/aiHandlers.ts`)
   - 复习调度 (`src/background/alarms.ts`)

4. **Phase 4: 功能集成**
   - 跳回原文高亮
   - 艾宾浩斯复习
   - Badge 更新

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] 所有决策协同工作无冲突
- [x] 技术选型相互兼容
- [x] 模式支持架构决策
- [x] 结构与所有选型对齐

**✅ Requirements Coverage**
- [x] 所有功能需求得到支持
- [x] 所有非功能需求已处理
- [x] 跨切面关注点已处理
- [x] 集成点已定义

**✅ Implementation Readiness**
- [x] 决策具体且可执行
- [x] 模式防止 Agent 冲突
- [x] 结构完整无歧义
- [x] 提供示例以澄清复杂决策

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** 根据本文档的架构决策和模式开始实现

**Document Maintenance:** 实现过程中如有重大技术决策变更，请更新本架构文档

