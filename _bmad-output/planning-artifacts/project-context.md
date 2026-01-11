---
project_name: 'LingoRecall AI'
user_name: '冯少'
date: '2026-01-08'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
existing_patterns_found: 12
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Technologies
| Technology | Version | Notes |
|------------|---------|-------|
| React | 19.2.3 | 使用 React 19 新特性 |
| TypeScript | 5.8.2 | ES2022 target |
| Vite | 6.2.0 | 多入口构建配置 |
| Chrome Extension | Manifest V3 | Service Worker 模式 |

### Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| @google/genai | 1.34.0 | Gemini AI SDK |
| lucide-react | 0.562.0 | 图标库 |
| react-dom | 19.2.3 | React DOM 渲染 |

### Chrome Extension Permissions
```json
["storage", "activeTab", "tabs", "alarms", "contextMenus"]
```

---

## Critical Implementation Rules

### Chrome Extension Context Rules

**CRITICAL: 三上下文隔离**
```
Web Page Context → Content Script → Service Worker → Popup
     ↑                   ↓                ↓           ↓
   (DOM)          (Shadow DOM)    (chrome.runtime)  (React)
```

- Content Script 无法直接调用 Service Worker 函数，必须使用 `chrome.runtime.sendMessage`
- Popup 和 Service Worker 共享 Extension Context，可直接调用 chrome API
- Content Script 注入的 UI 必须使用 Shadow DOM 隔离

**消息类型命名规则**
```typescript
// ✅ CORRECT: SCREAMING_SNAKE_CASE
type MessageType = 'ANALYZE_WORD' | 'SAVE_WORD' | 'GET_WORDS';

// ❌ WRONG: camelCase 或其他格式
type MessageType = 'analyzeWord' | 'saveWord';
```

**统一响应结构**
```typescript
// 所有异步操作必须返回此结构
interface Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: ErrorCode; message: string; };
}
```

### TypeScript Configuration Rules

**必须遵循的配置:**
- Target: ES2022
- Module: ESNext
- JSX: react-jsx
- 路径别名: `@/*` → 项目根目录

**Import 规则:**
```typescript
// ✅ CORRECT: 使用路径别名
import { WordRecord } from '@/types';
import { explainWord } from '@/services/geminiService';

// ❌ WRONG: 相对路径过深
import { WordRecord } from '../../../types';
```

**类型定义位置:**
- 共享类型 → `src/shared/types/`
- 组件 Props → 组件文件内部
- 消息类型 → `src/shared/messaging/types.ts`

### React/Hooks Rules

**Hooks 命名规则:**
```typescript
// ✅ CORRECT: use + 功能描述
useVocabulary, useReview, useAIConfig, useMessaging

// ❌ WRONG: 不清晰的命名
useData, useStuff, useHelper
```

**状态管理规则:**
- 使用 React Hooks + 自定义 Hooks，不引入 Redux/Zustand
- 每个操作独立 loading 状态: `isSaving`, `isAnalyzing`, `isDeleting`
- 禁止全局共享 loading 状态

**组件文件命名:**
```
PascalCase.tsx  → WordCard.tsx, ReviewCard.tsx
camelCase.ts    → useVocabulary.ts, geminiService.ts
```

### Storage Layer Rules

**IndexedDB 命名规则:**
```typescript
// Database 名称: PascalCase
const DB_NAME = 'LingoRecallDB';

// Object Store 名称: lowercase plural
const STORES = { words: 'words', tags: 'tags' };

// Index 名称: by + FieldName
const INDEXES = {
  byCreatedAt: 'createdAt',
  byNextReviewAt: 'nextReviewAt',
  byTagId: 'tagIds',  // multiEntry: true
  bySourceUrl: 'sourceUrl'
};
```

**存储分层:**
| 数据类型 | 存储位置 | 原因 |
|----------|----------|------|
| WordRecord, Tag | IndexedDB | 需要复杂查询和索引 |
| AIConfig, Settings | chrome.storage.local | 简单配置，便于同步 |
| 临时状态 | chrome.storage.session | 会话级别数据 |

### Shadow DOM UI Injection Rules

**Content Script UI 必须使用 Shadow DOM:**
```typescript
// ✅ CORRECT: closed mode Shadow DOM
const host = document.createElement('lingorecall-root');
const shadow = host.attachShadow({ mode: 'closed' });

// ❌ WRONG: 直接操作页面 DOM
document.body.appendChild(myComponent);
```

**样式隔离:**
- 使用内联样式或构建时提取的 CSS
- 禁止使用全局 CSS 类名
- 自定义元素名必须包含项目前缀: `lingorecall-*`

### AI Service Rules

**API Key 安全:**
```typescript
// ✅ CORRECT: 从环境变量读取
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ❌ WRONG: 硬编码 API Key
const ai = new GoogleGenAI({ apiKey: 'AIzaSy...' });
```

**多 Provider 适配:**
```typescript
// 必须支持的 Provider 类型
type AIProvider = 'gemini' | 'cli-proxy' | 'ollama' | 'custom';

// 所有 AI 调用必须检查 provider 类型
if (config.provider !== 'gemini') {
  return await fetchFromProxy(config, prompt);
}
```

### Error Handling Rules

**三层错误处理:**
```typescript
// Layer 1: 服务层 - 捕获并返回 Response
async function saveWord(word: WordRecord): Promise<Response<void>> {
  try {
    await db.words.add(word);
    return { success: true };
  } catch (error) {
    return { success: false, error: { code: 'STORAGE_ERROR', message: error.message } };
  }
}

// Layer 2: Hook 层 - 管理状态
const { data, error, isLoading } = useVocabulary();

// Layer 3: UI 层 - 显示错误
{error && <ErrorMessage message={error.message} />}
```

**错误代码枚举:**
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

---

## Testing Rules

**测试文件位置:**
```
src/utils/xpath.ts      → src/utils/xpath.test.ts
src/hooks/useReview.ts  → src/hooks/useReview.test.ts
```

**测试框架:** Vitest (与 Vite 生态一致)

**Mock 规则:**
- Chrome API Mock: 使用 `chrome-mock` 或自定义 mock
- IndexedDB Mock: 使用 `fake-indexeddb`
- AI API Mock: 使用 MSW (Mock Service Worker)

---

## Code Quality & Style Rules

**异步操作:**
```typescript
// ✅ CORRECT: async/await
const result = await saveWord(word);
if (!result.success) handleError(result.error);

// ❌ WRONG: Promise.then/catch
saveWord(word).then(res => { ... }).catch(err => { ... });
```

**DateTime 处理:**
```typescript
// 存储: Unix 时间戳
createdAt: Date.now()

// 显示: Intl.DateTimeFormat
new Intl.DateTimeFormat('zh-CN').format(new Date(createdAt))

// 计算: 毫秒运算
nextReviewAt = Date.now() + intervalDays * 24 * 60 * 60 * 1000
```

---

## Critical Don't-Miss Rules

### Anti-Patterns to AVOID

```typescript
// ❌ 混用 Promise.then
saveWord(word).then(res => { ... });

// ❌ 错误的消息类型命名
type MessageType = 'analyzeWord';  // 应该是 'ANALYZE_WORD'

// ❌ 不一致的响应结构
return { ok: true, result: data };  // 应该是 { success: true, data }

// ❌ 全局 loading 状态
const [isLoading, setIsLoading] = useState(false);  // 应该分开

// ❌ Content Script 直接操作页面样式
document.body.style.background = 'red';  // 会影响用户网页

// ❌ 在 Content Script 中直接调用 IndexedDB
const db = indexedDB.open('LingoRecallDB');  // 必须通过 Service Worker
```

### Edge Cases to Handle

1. **XPath 定位失败:** 使用文本上下文匹配作为降级方案
2. **Service Worker 休眠:** 使用 chrome.alarms 保持定时任务
3. **API Key 未配置:** 显示配置引导而非错误
4. **网络断开:** 本地优先，支持离线词库浏览
5. **页面动态变化:** XPath 失效时通过 contextBefore/contextAfter 重新定位

### Security Rules

- API Key 仅存储在 chrome.storage.local，禁止网络传输
- Content Script 不访问用户敏感数据
- Shadow DOM 使用 `mode: 'closed'` 防止外部访问
- 所有外部 API 调用使用 HTTPS

---

## Development Workflow

**分支命名:**
```
feature/xxx  - 新功能
fix/xxx      - Bug 修复
refactor/xxx - 重构
```

**Commit Message:**
```
feat: 添加词汇保存功能
fix: 修复 XPath 定位失败问题
refactor: 重构消息通信层
```

**构建验证:**
```bash
npm run build    # 必须无错误
npm run typecheck  # TypeScript 检查
```

---

## Quick Reference

### 文件位置速查
| 功能 | 文件路径 |
|------|----------|
| 消息类型定义 | `src/shared/messaging/types.ts` |
| IndexedDB 封装 | `src/shared/storage/db.ts` |
| AI 服务 | `src/services/geminiService.ts` |
| Content Script 入口 | `src/content/index.ts` |
| Service Worker 入口 | `src/background/index.ts` |
| Popup React 入口 | `src/popup/index.tsx` |

### 常用代码片段

**发送消息到 Service Worker:**
```typescript
const response = await chrome.runtime.sendMessage({
  type: 'ANALYZE_WORD',
  payload: { word, context }
});
```

**计算下次复习时间:**
```typescript
const REVIEW_INTERVALS = [1, 3, 7, 15, 30, 60, 120]; // 天
const nextReviewAt = Date.now() + REVIEW_INTERVALS[reviewCount] * 86400000;
```

---

**Context Status:** READY FOR AI AGENT IMPLEMENTATION
**Last Updated:** 2026-01-08
