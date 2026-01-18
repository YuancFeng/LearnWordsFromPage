<div align="center">
<img width="1200" height="475" alt="LingoRecall AI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# LingoRecall AI

**智能划词翻译与记忆助手** - 在浏览网页时轻松学习英语词汇

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)

[English](#features) | [中文](#功能特性)

</div>

---

## ✨ 功能特性

### 核心功能

| 功能 | 描述 |
|------|------|
| 🎯 **智能划词分析** | 选中英文单词/短语，AI 根据上下文提供准确释义 |
| 📝 **长文本翻译** | 支持段落级别的中英翻译 |
| 📚 **词汇收藏** | 一键保存单词到个人词库，支持标签分类 |
| 🧠 **艾宾浩斯复习** | 科学的间隔重复算法，帮助长期记忆 |
| 🔗 **原文定位** | 点击即可跳转到单词的原始出处并高亮 |
| 🌍 **21 种界面语言** | 支持中文、英文、日文、韩文等多语言界面 |
| 🎨 **深色模式** | 支持浅色/深色/跟随系统三种主题 |

### AI 服务支持

| Provider | 说明 | 推荐场景 |
|----------|------|----------|
| 🤖 **Gemini API** | Google 官方 API，免费额度充足 | 日常使用，推荐首选 |
| 🔧 **OpenAI 兼容** | 支持各种 OpenAI 格式的 API | CLI Proxy、第三方服务 |
| 💻 **本地模型** | 支持 Ollama、LM Studio 等本地部署 | 隐私优先、离线使用 |

---

## 🚀 快速开始

### 安装扩展

1. 克隆仓库
```bash
git clone https://github.com/your-repo/lingorecall-ai.git
cd lingorecall-ai
```

2. 安装依赖并构建
```bash
npm install
npm run build
```

3. 加载扩展
   - 打开 Chrome，访问 `chrome://extensions/`
   - 启用「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择项目的 `dist` 目录

---

## ⚙️ AI Provider 配置

### 方式一：Gemini API（推荐）

最简单的配置方式，适合大多数用户：

1. 获取 [Google AI Studio API Key](https://aistudio.google.com/app/apikey)（免费）
2. 在扩展设置中选择「Gemini」
3. 填入 API Key 即可使用

> 💡 **提示**: Gemini API 提供充足的免费额度，足够日常学习使用。

### 方式二：本地模型（隐私优先）

适合注重隐私或需要离线使用的用户。本地模型完全在您的电脑上运行，数据不会上传到云端。

#### 支持的本地模型工具

| 工具 | 默认端点 | 特点 |
|------|----------|------|
| [Ollama](https://ollama.ai)（推荐） | `http://localhost:11434` | 易用，模型丰富，跨平台 |
| [LM Studio](https://lmstudio.ai) | `http://localhost:1234` | 图形界面，适合新手 |
| [llama.cpp](https://github.com/ggerganov/llama.cpp) | `http://localhost:8080` | 轻量，高性能 |

#### 🌟 推荐模型：TranslateGemma（翻译专用）

**TranslateGemma** 是 Google 基于 Gemma 3 架构开发的专业翻译模型，针对翻译任务进行了专门优化，速度比通用模型快 **8 倍**，是本扩展的首选推荐。

| 模型 | 大小 | 内存要求 | 适用场景 |
|------|------|----------|----------|
| `translategemma:4b` ⚡ | 3.3GB | ≥8GB | 速度最快，日常查词 |
| `translategemma:12b` 🏆 | 8.1GB | ≥16GB | **强烈推荐**：专业翻译质量 |
| `translategemma:27b` | 17GB | ≥32GB | 最高翻译质量 |

#### 备选模型（通用大语言模型）

如果您已有其他模型或需要额外功能，这些通用模型也可使用：

| 内存 | 推荐模型 | 模型大小 | 适用场景 |
|------|----------|----------|----------|
| < 6GB | `llama3.2:1b` | 1.3GB | 基础查词，快速响应 |
| 6-8GB | `llama3.2:3b` | 2GB | 平衡速度和质量 |
| ≥8GB | `llama3.2` | 4.7GB | 通用模型，功能全面 |
| Apple Silicon | `qwen2.5:7b` | 4.4GB | 中文优化 |

> 💡 **性能对比**: TranslateGemma 12B 响应时间约 0.7s，而通用模型如 Qwen2.5 约 6s，快 8 倍！

#### 安装步骤（以 Ollama 为例）

**macOS:**
```bash
# 1. 下载安装 Ollama
# 访问 https://ollama.ai/download 下载 .dmg 文件并安装

# 2. 下载翻译专用模型（强烈推荐）
ollama pull translategemma:12b

# 或者下载通用模型
# ollama pull llama3.2

# 3. Ollama 会自动在后台运行，无需额外启动
```

**Windows:**
```bash
# 1. 下载安装 Ollama
# 访问 https://ollama.ai/download 下载安装程序

# 2. 打开命令提示符，下载翻译专用模型
ollama pull translategemma:12b
```

**Linux:**
```bash
# 1. 安装 Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. 下载翻译专用模型
ollama pull translategemma:12b

# 3. 启动服务（如果未自动启动）
ollama serve
```

#### 扩展中配置本地模型

1. 打开扩展设置，选择 AI Provider 为「本地模型」
2. 选择您使用的工具（如 Ollama）
3. 端点会自动填充，确认模型名称（如 `translategemma:12b`）
4. 点击「测试连接」确保配置正确
5. 保存配置

#### 如何选择模型？

```
┌─────────────────────────────────────────────────────────────┐
│                    模型选择决策树                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  您的内存有多少？                                            │
│       │                                                     │
│       ├── ≥16GB ──→ translategemma:12b 🏆 (强烈推荐)        │
│       │                                                     │
│       ├── 8-16GB ──→ translategemma:4b ⚡ (速度优先)         │
│       │                                                     │
│       └── <8GB ──→ llama3.2:1b 或 llama3.2:3b              │
│                                                             │
│  已有其他模型？                                              │
│       │                                                     │
│       └── 可以继续使用，但推荐尝试 TranslateGemma           │
│           翻译质量更高，速度更快                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> 🔒 **隐私说明**: 本地模型完全在您的设备上运行，不需要 API Key，翻译数据不会发送到任何服务器。

### 方式三：OpenAI 兼容 API

适合使用 CLI Proxy 或其他 OpenAI 兼容服务的用户：

1. 在扩展设置中选择「OpenAI 兼容」
2. 配置 API 端点，例如：
   - CLI Proxy: `http://localhost:8317/v1/chat/completions`
   - 其他服务: 根据服务商提供的端点配置
3. 填入模型名称和 API Key（如需要）

---

## 📖 使用说明

### 基本用法

1. **划词分析**: 在任意网页选中英文单词，点击弹出的 🔍 按钮
2. **查看结果**: AI 会显示单词的释义、音标、词性和用法示例
3. **保存单词**: 点击「保存词汇」将单词加入个人词库
4. **复习提醒**: 扩展会根据艾宾浩斯曲线提醒你复习

### 进阶功能

| 功能 | 触发方式 |
|------|----------|
| 长文本翻译 | 选中超过 100 字符的文本 |
| 跳转原文 | 在词库中点击单词的「跳转来源」 |
| 批量添加标签 | 进入批量选择模式后选择多个单词 |
| 双击查词 | 在设置中开启后，双击单词即可查询 |

### 设置选项

| 设置项 | 说明 |
|--------|------|
| **交互方式** | 双击查词、显示悬浮图标、复习提醒 |
| **外观** | 主题（浅色/深色/跟随系统）、界面语言 |
| **翻译语言** | 选择翻译目标语言（支持 30+ 种语言） |
| **黑名单** | 设置不启用划词的网站 |
| **标签管理** | 创建和管理词汇标签 |

---

## ⚡ 性能优化

LingoRecall AI 采用多层缓存架构，显著提升响应速度：

| 优化项 | 效果 | 说明 |
|--------|------|------|
| **AI 结果缓存** | 重复查询 <10ms | LRU 缓存，500 条目，24h TTL |
| **配置缓存** | 节省 10-30ms | 避免每次请求读取 storage |
| **Prompt 优化** | 节省 100-300ms | 精简 token 数量 |

### 响应时间对比

```
首次查询：1.5-2s → 1-1.5s （减少 20-30%）
重复查询：1.5-2s → <10ms （减少 99%+）
```

### 提速建议

1. **选择更快的模型**: `gemini-2.0-flash-lite` 比其他模型更快
2. **启用 GPU 加速**: 本地模型确保安装了 GPU 驱动
3. **使用云端 API**: 相比本地模型，延迟通常更低

---

## 🏗️ 项目架构

### 目录结构

```
src/
├── background/          # Service Worker
│   ├── index.ts         # 消息处理、AI 调用
│   ├── alarms.ts        # 复习提醒调度
│   └── handlers/        # 业务处理器
├── content/             # Content Script
│   ├── index.ts         # 文本选择检测
│   └── components/      # React 弹窗组件
├── popup/               # 扩展弹窗页面
│   └── components/      # 词库管理 UI
├── options/             # 全屏设置页面
│   └── components/      # 全屏词库 UI
├── services/            # AI 服务层
│   ├── aiService.ts     # 统一 AI 接口
│   ├── geminiService.ts # Gemini API
│   ├── openaiCompatibleService.ts  # OpenAI 兼容
│   ├── localModelService.ts        # 本地模型服务
│   └── analysisCache.ts # 缓存模块
├── i18n/                # 国际化
│   └── locales/         # 21 种语言翻译文件
└── shared/              # 共享模块
    ├── messaging/       # 消息系统
    ├── storage/         # IndexedDB 存储
    └── types/           # TypeScript 类型
```

### 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript 5 |
| 构建工具 | Vite 6 |
| 样式方案 | Tailwind CSS |
| 数据存储 | IndexedDB (idb) |
| AI SDK | @google/generative-ai |
| 国际化 | react-i18next |

### 开发命令

```bash
# 开发模式（热更新）
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test
```

---

## 🧠 复习算法

采用艾宾浩斯遗忘曲线算法，科学安排复习时间：

| 复习次数 | 间隔时间 |
|----------|----------|
| 第 1 次 | 1 天后 |
| 第 2 次 | 2 天后 |
| 第 3 次 | 4 天后 |
| 第 4 次 | 7 天后 |
| 第 5 次 | 15 天后 |
| 第 6+ 次 | 30 天后 |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

[MIT License](LICENSE)

---

<div align="center">

**Made with ❤️ for language learners**

[报告问题](https://github.com/your-repo/lingorecall-ai/issues) · [功能建议](https://github.com/your-repo/lingorecall-ai/issues)

</div>
