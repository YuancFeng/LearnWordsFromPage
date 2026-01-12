<div align="center">
<img width="1200" height="475" alt="LingoRecall AI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# LingoRecall AI

**智能划词翻译与记忆助手** - 在浏览网页时轻松学习英语词汇

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)

</div>

---

## 功能特性

- **智能划词分析** - 选中英文单词/短语，AI 根据上下文提供准确释义
- **长文本翻译** - 支持段落级别的中英翻译
- **词汇收藏** - 一键保存单词到个人词库
- **艾宾浩斯复习** - 科学的间隔重复算法，帮助长期记忆
- **原文定位** - 点击即可跳转到单词的原始出处
- **多 AI 支持** - 支持 Gemini API、OpenAI 兼容 API（Ollama、LM Studio 等）
- **高性能缓存** - 智能缓存机制，重复查询秒级响应

---

## 快速开始

### 安装

1. 克隆仓库
```bash
git clone https://github.com/your-repo/lingorecall-ai.git
cd lingorecall-ai
```

2. 安装依赖
```bash
npm install
```

3. 构建扩展
```bash
npm run build
```

4. 加载扩展
   - 打开 Chrome，访问 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 目录

### 配置 AI Provider

#### 方式一：使用 Gemini API（推荐）

1. 获取 [Google AI Studio API Key](https://aistudio.google.com/app/apikey)
2. 在扩展设置中选择 "Gemini" 并填入 API Key

#### 方式二：使用 OpenAI 兼容 API

支持 Ollama、LM Studio、CLI Proxy 等本地模型服务：

1. 在扩展设置中选择 "OpenAI 兼容"
2. 配置 API 端点，例如：
   - Ollama: `http://localhost:11434/v1/chat/completions`
   - LM Studio: `http://localhost:1234/v1/chat/completions`
   - CLI Proxy: `http://localhost:8317/v1/chat/completions`
3. 填入模型名称，例如：`gemini-2.5-flash-lite`、`qwen2.5:7b`

---

## 性能优化

LingoRecall AI 采用多层缓存架构，显著提升响应速度：

### 缓存机制

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

### 进一步提速建议

1. **选择更快的模型**
   - `gemini-2.0-flash-lite` 比 `gemini-2.5-flash-lite` 更快
   - 本地小模型如 `qwen2.5-1.5b` 推理更快

2. **启用 GPU 加速**
   - Ollama：确保安装了 GPU 驱动
   - LM Studio：设置 → GPU Offload → 启用

3. **直接使用 Gemini API**
   - 无需本地代理，延迟更低
   - 免费额度足够日常使用

---

## 开发

### 项目结构

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
├── services/            # AI 服务层
│   ├── aiService.ts     # 统一 AI 接口
│   ├── geminiService.ts # Gemini API
│   ├── openaiCompatibleService.ts  # OpenAI 兼容
│   └── analysisCache.ts # 缓存模块
└── shared/              # 共享模块
    ├── messaging/       # 消息系统
    ├── storage/         # IndexedDB 存储
    └── types/           # TypeScript 类型
```

### 开发命令

```bash
# 开发模式（热更新）
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test
```

### 技术栈

- **前端**: React 18 + TypeScript 5
- **构建**: Vite 6
- **样式**: Tailwind CSS
- **存储**: IndexedDB (idb)
- **AI SDK**: @google/generative-ai

---

## 使用说明

### 基本用法

1. **划词分析**: 在任意网页选中英文单词，点击弹出的分析按钮
2. **查看结果**: AI 会显示单词的释义、音标、词性和用法示例
3. **保存单词**: 点击"保存词汇"将单词加入个人词库
4. **复习提醒**: 扩展会根据艾宾浩斯曲线提醒你复习

### 快捷操作

- **长文本翻译**: 选中超过 100 字符的文本自动切换为翻译模式
- **跳转原文**: 在词库中点击单词可跳转到原始页面并高亮

### 设置选项

- **AI Provider**: 选择 Gemini 或 OpenAI 兼容 API
- **黑名单**: 设置不启用划词的网站
- **跳过中文**: 选择是否跳过纯中文文本

---

## 架构设计

### 消息流程

```
Content Script ──→ Service Worker ──→ AI Service
       ↑                                   │
       └───────────── Response ────────────┘
```

### 数据存储

- **chrome.storage.local**: 用户设置、API Key
- **IndexedDB**: 词汇数据、复习记录

### 复习调度

采用艾宾浩斯遗忘曲线算法：
- 第 1 次复习: 1 天后
- 第 2 次复习: 2 天后
- 第 3 次复习: 4 天后
- 第 4 次复习: 7 天后
- 第 5 次复习: 15 天后
- 第 6+ 次复习: 30 天后

---

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 许可证

[MIT License](LICENSE)

---

<div align="center">

**Made with ❤️ for language learners**

</div>
