# LingoRecall AI - 组件清单

## 组件概览

| 组件名称 | 文件 | 类型 | 功能描述 |
|----------|------|------|----------|
| App | App.tsx | 容器组件 | 主应用容器，管理全局状态和视图路由 |
| AIChatSidebar | components/AIChatSidebar.tsx | 功能组件 | AI 对话侧边栏 |
| SelectionPopup | components/SelectionPopup.tsx | 功能组件 | 文本选择弹出菜单 |
| WordCard | components/WordCard.tsx | 展示组件 | 词汇卡片展示 |

---

## 详细组件文档

### App (主应用组件)

**文件**: `App.tsx`
**大小**: 37.9 KB (~740 行)
**类型**: 容器组件

#### 职责

- 全局状态管理 (vocabulary, tags, aiConfig)
- 视图路由 (Reader, Vocabulary, Settings)
- AI 连接状态监控
- 用户交互处理

#### 状态定义

```typescript
// 视图状态
const [view, setView] = useState<View>('reader');
const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('ai');

// 数据状态
const [vocabulary, setVocabulary] = useState<WordRecord[]>([]);
const [tags, setTags] = useState<Tag[]>(INITIAL_TAGS);
const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

// AI 配置
const [aiConfig, setAiConfig] = useState<AIConfig>({...});
const [isConnected, setIsConnected] = useState<boolean>(true);

// UI 状态
const [selection, setSelection] = useState({...});
const [isChatOpen, setIsChatOpen] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);
```

#### 子视图

| 视图 | 功能 |
|------|------|
| Reader | 文章阅读器，支持文本选择 |
| Vocabulary | 词汇库管理，支持过滤 |
| Settings | AI 配置 + 标签管理 |

#### 内部组件

- `Navigation` - 底部导航栏

---

### AIChatSidebar (AI 聊天侧边栏)

**文件**: `components/AIChatSidebar.tsx`
**大小**: 4.8 KB (~125 行)
**类型**: 功能组件

#### Props

```typescript
interface AIChatSidebarProps {
  isOpen: boolean;        // 是否显示
  onClose: () => void;    // 关闭回调
  initialQuery?: string;  // 初始查询词
  aiConfig: AIConfig;     // AI 配置
}
```

#### 功能

- 多轮对话界面
- 自动滚动到最新消息
- 支持初始查询自动发送
- 显示当前 AI 提供者信息
- 加载状态指示器

#### 依赖

- `services/geminiService.ts` - `getChatResponse()`
- `lucide-react` - Send, X, Bot, User, Loader2

---

### SelectionPopup (文本选择弹窗)

**文件**: `components/SelectionPopup.tsx`
**大小**: 4.4 KB (~103 行)
**类型**: 功能组件

#### Props

```typescript
interface SelectionPopupProps {
  position: { x: number; y: number };  // 弹窗位置
  selectedText: string;                 // 选中文本
  tags: Tag[];                         // 可用标签列表
  onExplain: (tagId: string) => void;  // 解释回调
  onChat: () => void;                  // 聊天回调
  onClose: () => void;                 // 关闭回调
}
```

#### 功能

- 显示选中的文本
- 快速 AI 分析按钮 (默认标签)
- 带标签选择的保存功能 (下拉菜单)
- 深度对话入口

#### UI 特点

- 悬浮定位 (基于鼠标位置)
- 动画进入效果
- 嵌套子菜单 (标签选择)

---

### WordCard (词汇卡片)

**文件**: `components/WordCard.tsx`
**大小**: 4.4 KB (~131 行)
**类型**: 展示组件

#### Props

```typescript
interface WordCardProps {
  word: WordRecord;       // 词汇数据
  tag?: Tag;             // 关联标签
  onNavigate: () => void; // 跳转源文回调
}
```

#### 功能

- 展示词汇详细信息
- 发音播放 (TTS)
- 显示原文上下文
- 跳转到来源文章
- 显示添加时间

#### 内部函数

```typescript
// Base64 解码
function decode(base64: string): Uint8Array

// 音频数据解码
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer>
```

#### 依赖

- `services/geminiService.ts` - `generateSpeech()`
- `lucide-react` - ExternalLink, Clock, Hash, Volume2, Loader2

---

## 组件关系图

```
App.tsx
├── [内部] Navigation
├── [内部] Reader View
│   └── SelectionPopup
├── [内部] Vocabulary View
│   └── WordCard (多个)
├── [内部] Settings View
└── AIChatSidebar
```

## 样式系统

所有组件使用 **Tailwind CSS** 进行样式设计：

| 特性 | 实现方式 |
|------|----------|
| 响应式布局 | `md:` 断点前缀 |
| 动画效果 | `animate-*` 工具类 |
| 悬停状态 | `hover:*` 伪类 |
| 组悬停 | `group-hover/*` 变体 |
| 渐变背景 | `bg-gradient-*` |
| 模糊背景 | `backdrop-blur-*` |

## 设计系统色彩

```
主色调: blue-600 (#2563EB)
成功色: green-500 (#22C55E)
警告色: orange-500 (#F97316)
错误色: red-500 (#EF4444)
中性色: gray-50 ~ gray-900
```

## 图标使用

项目使用 `lucide-react` 图标库：

| 图标 | 用途 |
|------|------|
| BookOpen | 词汇库标识 |
| Layout | Reader 视图 |
| Settings | 设置页面 |
| Search | 搜索/分析 |
| MessageSquare | 聊天功能 |
| Volume2 | 发音播放 |
| Bot | AI 助手 |
| Cpu | AI 设置 |
| Globe | 云服务 |
| Database | 本地模型 |

---
*文档生成时间: 2026-01-06*
