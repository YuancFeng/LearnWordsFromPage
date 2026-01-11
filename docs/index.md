# LingoRecall AI - 项目文档索引

> 智能语言学习助手浏览器扩展的完整技术文档

---

## 项目概览

| 属性 | 值 |
|------|------|
| **类型** | Chrome 浏览器扩展 (Manifest V3) |
| **主要语言** | TypeScript |
| **框架** | React 19.2.3 |
| **架构模式** | 组件化架构 + 服务层模式 |
| **AI 集成** | Google Gemini + OpenAI 兼容代理 |

---

## 快速参考

### 技术栈

- **前端**: React 19.2.3 + TypeScript 5.8.2
- **构建**: Vite 6.2.0
- **样式**: Tailwind CSS (CDN)
- **图标**: Lucide React
- **AI SDK**: @google/genai 1.34.0

### 入口点

| 文件 | 用途 |
|------|------|
| `index.tsx` | React 应用入口 |
| `App.tsx` | 主组件 |
| `manifest.json` | 扩展配置 |

---

## 生成的文档

### 核心文档

- [项目概述](./project-overview.md) - 项目简介、技术栈、快速开始
- [架构文档](./architecture.md) - 系统架构、数据模型、服务层设计
- [源代码树分析](./source-tree-analysis.md) - 目录结构、文件说明、依赖关系

### 开发文档

- [组件清单](./component-inventory.md) - React 组件详细文档
- [开发指南](./development-guide.md) - 环境配置、开发工作流、调试技巧

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
echo "GEMINI_API_KEY=your_key_here" > .env.local

# 3. 启动开发服务器
npm run dev
```

---

## AI 提供者支持

| 提供者 | 端点 | 用途 |
|--------|------|------|
| Gemini Cloud | 内置 | 默认，最快推理 |
| CLI Proxy | localhost:8080/v1 | OpenAI 兼容 |
| Ollama | localhost:11434/v1 | 本地 LLM |
| Custom | 用户配置 | 自定义端点 |

---

## 项目统计

| 指标 | 值 |
|------|------|
| 源文件 | 8 |
| 组件数 | 4 |
| 服务数 | 1 |
| 代码行数 | ~1,300 |
| 文档生成 | 5 |

---

## 扩展功能路线图

- [ ] Content Script 实现
- [ ] Background Service Worker
- [ ] Chrome Storage 持久化
- [ ] 间隔重复算法
- [ ] 词汇导出/导入

---

## 文档元数据

| 属性 | 值 |
|------|------|
| 生成时间 | 2026-01-06 |
| 扫描模式 | Deep Scan |
| 工作流版本 | 1.2.0 |

---

*本文档由 BMAD Document Project 工作流自动生成*
