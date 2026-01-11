# LingoRecall AI - 源代码树分析

## 目录结构

```
LearnWordsFromPage/
├── .agent/                    # AI Agent 工作流配置
│   └── workflows/
├── .claude/                   # Claude Code 配置
│   └── commands/
├── .codex/                    # Codex 配置
│   └── prompts/
├── .cursor/                   # Cursor IDE 配置
│   └── rules/
├── .git/                      # Git 版本控制
├── .opencode/                 # OpenCode 配置
│   ├── agent/
│   └── command/
├── _bmad/                     # BMAD 框架配置
│   ├── _config/
│   ├── bmm/                   # BMAD 模块
│   └── core/                  # 核心工作流
├── _bmad-output/              # BMAD 输出目录
│   └── implementation-artifacts/
├── components/                # React 组件 [关键目录]
│   ├── AIChatSidebar.tsx      # AI 聊天侧边栏
│   ├── SelectionPopup.tsx     # 文本选择弹窗
│   └── WordCard.tsx           # 词汇卡片组件
├── docs/                      # 项目文档 [输出目录]
├── services/                  # 服务层 [关键目录]
│   └── geminiService.ts       # AI 服务封装
├── .gitignore                 # Git 忽略配置
├── App.tsx                    # 主应用组件 [入口点]
├── constants.ts               # 常量定义
├── index.html                 # HTML 入口
├── index.tsx                  # React 入口
├── manifest.json              # Chrome 扩展清单 [关键配置]
├── metadata.json              # 项目元数据
├── package.json               # NPM 配置
├── README.md                  # 项目说明
├── tsconfig.json              # TypeScript 配置
├── types.ts                   # 类型定义
└── vite.config.ts             # Vite 构建配置
```

## 关键目录说明

### `/components` - React 组件

存放所有可复用的 React 组件。当前包含 3 个核心 UI 组件：

| 文件 | 大小 | 功能 |
|------|------|------|
| `AIChatSidebar.tsx` | 4.8 KB | AI 对话侧边栏，支持多轮对话 |
| `SelectionPopup.tsx` | 4.4 KB | 文本选择后的操作菜单 |
| `WordCard.tsx` | 4.4 KB | 词汇展示卡片，含 TTS 功能 |

### `/services` - 服务层

封装外部服务交互逻辑：

| 文件 | 大小 | 功能 |
|------|------|------|
| `geminiService.ts` | 6.0 KB | AI 服务抽象层，支持多提供者 |

### 根目录关键文件

| 文件 | 大小 | 功能 |
|------|------|------|
| `App.tsx` | 37.9 KB | 主应用组件，包含所有视图逻辑 |
| `types.ts` | 637 B | TypeScript 类型定义 |
| `constants.ts` | 1.4 KB | 常量和模拟数据 |
| `manifest.json` | 530 B | Chrome 扩展配置 |

## 文件依赖关系

```
index.html
    └── index.tsx
        └── App.tsx
            ├── components/SelectionPopup.tsx
            ├── components/AIChatSidebar.tsx
            │   └── services/geminiService.ts
            ├── components/WordCard.tsx
            │   └── services/geminiService.ts
            ├── services/geminiService.ts
            ├── constants.ts
            └── types.ts
```

## 配置文件说明

### manifest.json (Chrome 扩展)

```json
{
  "manifest_version": 3,
  "name": "LingoRecall AI",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab", "contextMenus"],
  "action": {
    "default_popup": "index.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],  // 待实现
      "css": ["styles.css"]  // 待实现
    }
  ],
  "background": {
    "service_worker": "background.js"  // 待实现
  }
}
```

### package.json (NPM 依赖)

```json
{
  "dependencies": {
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "lucide-react": "^0.562.0",
    "@google/genai": "^1.34.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
```

### tsconfig.json (TypeScript)

- **Target**: ES2022
- **Module**: ESNext
- **JSX**: react-jsx
- **路径别名**: `@/*` → 根目录

## 待实现文件

根据 `manifest.json` 配置，以下文件需要实现：

| 文件 | 状态 | 用途 |
|------|------|------|
| `content.js` | 待实现 | 内容脚本，网页内嵌功能 |
| `styles.css` | 待实现 | 内容脚本样式 |
| `background.js` | 待实现 | Service Worker 后台逻辑 |
| `icon.png` | 待添加 | 扩展图标 |

## 代码统计

| 类型 | 文件数 | 总行数 |
|------|--------|--------|
| TypeScript/TSX | 8 | ~1,200 |
| JSON 配置 | 4 | ~80 |
| HTML | 1 | ~30 |
| 总计 | 13 | ~1,310 |

---
*文档生成时间: 2026-01-06*
