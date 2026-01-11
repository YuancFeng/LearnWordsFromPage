# LingoRecall AI - 开发指南

## 环境要求

| 依赖 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| Chrome | 116+ | 最新 |

## 快速开始

### 1. 克隆仓库

```bash
git clone <repository-url>
cd LearnWordsFromPage
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

> **获取 API Key**: 访问 [Google AI Studio](https://ai.studio.google.com/) 创建 API 密钥

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用

## NPM 脚本

| 命令 | 功能 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |

## 项目结构

```
LearnWordsFromPage/
├── components/        # React 组件
├── services/         # 服务层
├── docs/             # 项目文档
├── App.tsx           # 主应用
├── index.tsx         # React 入口
├── types.ts          # 类型定义
├── constants.ts      # 常量
├── manifest.json     # Chrome 扩展配置
└── vite.config.ts    # Vite 配置
```

## 开发工作流

### 添加新组件

1. 在 `components/` 目录创建新文件
2. 使用 TypeScript 定义 Props 接口
3. 使用 Tailwind CSS 编写样式
4. 在 `App.tsx` 中导入和使用

```typescript
// components/NewComponent.tsx
import React from 'react';

interface NewComponentProps {
  title: string;
  onClick: () => void;
}

const NewComponent: React.FC<NewComponentProps> = ({ title, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      {title}
    </button>
  );
};

export default NewComponent;
```

### 添加新服务

1. 在 `services/` 目录创建新文件
2. 导出异步函数
3. 处理错误和类型

```typescript
// services/newService.ts
import { AIConfig } from '../types';

export async function newFunction(config: AIConfig): Promise<string> {
  try {
    // 实现逻辑
    return result;
  } catch (error) {
    console.error('Service error:', error);
    throw error;
  }
}
```

### 添加新类型

在 `types.ts` 中定义：

```typescript
// types.ts
export interface NewType {
  id: string;
  name: string;
  // ...
}
```

## AI 提供者配置

### Gemini Cloud (默认)

无需额外配置，确保 `.env.local` 中有 `GEMINI_API_KEY`

### Ollama (本地)

1. 安装 Ollama: https://ollama.ai
2. 拉取模型: `ollama pull llama3`
3. 启动服务: `ollama serve`
4. 在设置中选择 Ollama，端点自动填充为 `http://localhost:11434/v1`

### CLI Proxy

1. 启动 OpenAI 兼容代理服务
2. 配置端点为 `http://localhost:8080/v1`
3. 选择可用模型

## Chrome 扩展开发

### 加载未打包扩展

1. 运行 `npm run build`
2. 打开 Chrome，访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `dist/` 目录

### 扩展文件说明

| 文件 | 状态 | 功能 |
|------|------|------|
| `manifest.json` | ✅ 已配置 | 扩展清单 |
| `index.html` | ✅ 已实现 | Popup 页面 |
| `content.js` | ❌ 待实现 | 内容脚本 |
| `background.js` | ❌ 待实现 | Service Worker |

### 待实现功能

**Content Script (content.js)**:
- 监听页面文本选择
- 注入选词弹窗到网页
- 与 Popup 通信

**Background Script (background.js)**:
- 处理扩展事件
- 管理 Chrome Storage
- 右键菜单功能

## 调试技巧

### React DevTools

安装 Chrome 扩展后，在开发者工具中使用 Components 面板

### Vite HMR

开发服务器支持热模块替换，修改代码后自动刷新

### 网络请求调试

1. 打开开发者工具 Network 面板
2. 查看 AI API 请求和响应
3. 检查错误状态码

### 控制台日志

服务层已包含错误日志：

```typescript
console.error("AI Error:", error);
console.debug("Proxy model detection skipped:", error);
console.warn("TTS failed, cloud service might be unavailable", e);
```

## 代码规范

### TypeScript

- 使用严格模式
- 为所有 Props 定义接口
- 避免 `any` 类型

### React

- 使用函数组件和 Hooks
- Props 解构
- 事件处理函数使用 `handle` 前缀

### Tailwind CSS

- 使用工具类组合
- 响应式设计使用 `md:` 断点
- 复用样式考虑提取常量

## 构建优化

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  }
});
```

### 包分析

```bash
npm run build -- --report
```

## 常见问题

### Q: API Key 不生效？

确保 `.env.local` 文件存在且格式正确，重启开发服务器。

### Q: Ollama 连接失败？

检查 Ollama 服务是否运行：`curl http://localhost:11434/v1/models`

### Q: 扩展无法加载？

确保已运行 `npm run build`，检查 manifest.json 语法。

### Q: TTS 不工作？

TTS 需要 Gemini Cloud 提供者，其他提供者不支持。

## 相关资源

- [React 文档](https://react.dev)
- [Vite 文档](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions)
- [Google AI SDK](https://ai.google.dev/gemini-api/docs)

---
*文档生成时间: 2026-01-06*
