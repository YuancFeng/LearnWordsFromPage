# LingoRecall AI - 架构文档

## 执行摘要

LingoRecall AI 采用现代 React 组件化架构，结合服务层模式处理 AI 交互。作为 Chrome 浏览器扩展，它遵循 Manifest V3 规范，提供 popup 界面和内容脚本能力。

## 架构模式

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome 浏览器扩展                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Popup UI   │  │Content Script│  │   Service Worker     │   │
│  │  (React App) │  │   (待实现)    │  │     (background)     │   │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘   │
│         │                                                        │
├─────────┼────────────────────────────────────────────────────────┤
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    React 应用层                           │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │    │
│  │  │   Views    │  │ Components │  │     Services       │  │    │
│  │  │ ├─Reader   │  │├─WordCard  │  │├─geminiService     │  │    │
│  │  │ ├─Vocabulary│ │├─AIChatSidebar│                    │  │    │
│  │  │ └─Settings │  │└─SelectionPopup│                   │  │    │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                              │                                    │
├──────────────────────────────┼────────────────────────────────────┤
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    外部 AI 服务                           │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │    │
│  │  │   Gemini   │  │   Ollama   │  │   Custom Proxy     │  │    │
│  │  │   Cloud    │  │  (Local)   │  │  (OpenAI 兼容)      │  │    │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 组件层次结构

```
App.tsx (主应用组件)
├── Header (状态栏)
│   ├── Logo + 品牌
│   └── AI 连接状态指示器
│
├── Main Content (视图切换)
│   ├── Reader View
│   │   ├── 浏览器模拟框架
│   │   ├── 文章内容 (可选择)
│   │   └── SelectionPopup (选中时显示)
│   │
│   ├── Vocabulary View
│   │   ├── 过滤器栏
│   │   └── WordCard Grid
│   │
│   └── Settings View
│       ├── AI Connectivity Tab
│       │   ├── 提供者选择网格
│       │   └── 代理配置表单
│       └── Knowledge Domains Tab
│           └── 标签管理列表
│
├── Navigation (底部导航栏)
│
└── AIChatSidebar (侧边栏)
```

## 数据模型

### 核心类型定义

```typescript
// 标签/分类
interface Tag {
  id: string;
  name: string;
  color: string; // Tailwind 颜色类
}

// 词汇记录
interface WordRecord {
  id: string;
  text: string;           // 单词文本
  meaning: string;        // AI 生成的解释
  pronunciation: string;  // IPA 发音
  exampleSentence: string;// 原文上下文
  sourceUrl: string;      // 来源 URL
  sourceTitle: string;    // 来源标题
  tagId: string;          // 关联的标签 ID
  createdAt: number;      // 时间戳
}

// 聊天消息
interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// AI 配置
type AIProvider = 'gemini' | 'cli-proxy' | 'ollama' | 'custom';

interface AIConfig {
  provider: AIProvider;
  proxyUrl: string;       // 代理端点 URL
  modelId: string;        // 模型标识符
}

// 视图类型
type View = 'reader' | 'vocabulary' | 'settings';
```

## 服务层架构

### geminiService.ts

服务层封装了所有 AI 交互逻辑，支持多个提供者：

```
geminiService.ts
├── testConnection(config)      # 测试 AI 连接
├── getProxyModels(proxyUrl)    # 获取可用模型列表
├── explainWord(word, context)  # 解释单词 (JSON 响应)
├── generateSpeech(text)        # 文本转语音 (TTS)
└── getChatResponse(history, message) # 对话式 AI
```

#### API 兼容性策略

```
┌────────────────────────────────────────────────────────────┐
│                      geminiService                          │
├────────────────────────────────────────────────────────────┤
│  if (provider === 'gemini')                                 │
│    → 使用 @google/genai SDK                                 │
│    → 结构化 JSON 响应 (responseSchema)                      │
│    → TTS 使用 Gemini 2.5 Flash TTS                         │
│  else                                                       │
│    → 使用 OpenAI 兼容 REST API                              │
│    → POST /v1/chat/completions                              │
│    → JSON mode: response_format: { type: "json_object" }   │
└────────────────────────────────────────────────────────────┘
```

## 状态管理

采用 React Hooks 进行本地状态管理：

| 状态 | 类型 | 用途 |
|------|------|------|
| `view` | View | 当前活动视图 |
| `vocabulary` | WordRecord[] | 已保存词汇列表 |
| `tags` | Tag[] | 分类标签列表 |
| `aiConfig` | AIConfig | AI 提供者配置 |
| `isConnected` | boolean | AI 连接状态 |
| `selection` | object | 当前文本选择 |
| `isChatOpen` | boolean | 聊天侧边栏状态 |

## 构建与打包

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') }
  }
});
```

### 入口点

| 文件 | 用途 |
|------|------|
| `index.html` | Popup HTML 入口 |
| `index.tsx` | React 应用入口 |
| `manifest.json` | 扩展清单配置 |

## 安全考虑

1. **API 密钥管理** - 通过环境变量 (`GEMINI_API_KEY`) 注入
2. **CORS 处理** - 代理请求需要正确配置
3. **权限最小化** - 仅请求必要的浏览器权限
4. **输入验证** - AI 响应解析前进行清理

## 扩展点

### 计划中的功能

- [ ] Content Script 实现 (网页内嵌选词)
- [ ] Background Service Worker 逻辑
- [ ] Chrome Storage API 持久化
- [ ] 导出/导入词汇功能
- [ ] 间隔重复复习算法

---
*文档生成时间: 2026-01-06*
