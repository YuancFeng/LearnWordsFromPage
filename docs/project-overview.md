# LingoRecall AI - 项目概述

## 基本信息

| 属性 | 值 |
|------|------|
| **项目名称** | LingoRecall AI - Language Learning Suite |
| **项目类型** | Chrome 浏览器扩展 |
| **版本** | 1.0.0 |
| **仓库类型** | Monolith (单体项目) |
| **主要语言** | TypeScript |
| **架构模式** | 组件化架构 (React Component-based) |

## 项目描述

LingoRecall AI 是一款智能语言学习助手浏览器扩展，帮助用户在阅读网页时捕获、分类和复习专业词汇。它使用 AI 技术提供上下文感知的词汇解释和间隔重复学习原则。

### 核心功能

1. **智能词汇捕获** - 选中网页文本，AI 自动分析并解释
2. **上下文学习** - 保留词汇的原始上下文
3. **多 AI 提供者支持** - Gemini、Ollama、自定义代理
4. **分类管理** - 按专业领域分类词汇
5. **AI 对话** - 深入探讨任何语言问题
6. **语音朗读** - TTS 功能帮助发音学习

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React | 19.2.3 |
| **语言** | TypeScript | 5.8.2 |
| **构建工具** | Vite | 6.2.0 |
| **UI 框架** | Tailwind CSS | CDN |
| **图标库** | Lucide React | 0.562.0 |
| **AI SDK** | @google/genai | 1.34.0 |
| **扩展规范** | Chrome Manifest V3 | - |

## AI 提供者支持

| 提供者 | 描述 | 默认端点 |
|--------|------|----------|
| **Gemini Cloud** | Google AI Studio 直连 | 内置 |
| **CLI Proxy** | OpenAI 兼容代理 | `http://localhost:8080/v1` |
| **Ollama** | 本地 LLM | `http://localhost:11434/v1` |
| **Custom** | 自定义端点 | 用户配置 |

## 浏览器扩展权限

- `storage` - 本地数据存储
- `activeTab` - 访问当前标签页
- `contextMenus` - 右键菜单功能

## 快速开始

```bash
# 安装依赖
npm install

# 配置 API 密钥
# 在 .env.local 中设置 GEMINI_API_KEY

# 启动开发服务器
npm run dev
```

## 相关文档

- [架构文档](./architecture.md)
- [源代码树分析](./source-tree-analysis.md)
- [组件清单](./component-inventory.md)
- [开发指南](./development-guide.md)

---
*文档生成时间: 2026-01-06*
