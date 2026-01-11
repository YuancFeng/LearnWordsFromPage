---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-01-08'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: 'epics-and-stories'
project_name: 'LingoRecall AI'
user_name: '冯少'
date: '2026-01-08'
---

# LingoRecall AI - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for LingoRecall AI, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Content Script 模块 (5 个)**
- FR-1.1: 文本选择监听 - 监听 mouseup 事件，检测选中文本
- FR-1.2: 悬浮按钮渲染 - 在选区附近显示操作按钮
- FR-1.3: 选区位置计算 - 获取 XPath、偏移量、上下文
- FR-1.4: 消息通信 - 与 Service Worker 双向通信
- FR-1.5: 高亮渲染 - 跳回原文时高亮目标文本

**Service Worker 模块 (4 个)**
- FR-2.1: AI API 调用 - 调用 Gemini API 进行语境分析
- FR-2.2: 数据持久化 - IndexedDB 存储词汇数据
- FR-2.3: 复习调度 - 计算艾宾浩斯复习时间
- FR-2.4: Badge 更新 - 显示待复习词汇数量

**Popup/Sidebar 模块 (5 个)**
- FR-3.1: 词库列表 - 展示所有保存的词汇
- FR-3.2: 复习界面 - 艾宾浩斯复习卡片
- FR-3.3: 搜索筛选 - 按关键词、标签筛选
- FR-3.4: 设置页面 - API Key 配置、偏好设置
- FR-3.5: 跳回原文触发 - 点击跳回按钮触发

### NonFunctional Requirements

| ID | 类别 | 要求 |
|----|------|------|
| NFR-1 | 性能 | Content Script 加载 <100ms |
| NFR-2 | 性能 | AI 响应时间 <3s |
| NFR-3 | 性能 | 本地数据查询 <50ms |
| NFR-4 | 性能 | 跳回原文定位 <2s |
| NFR-5 | 安全 | API Key 仅本地存储，敏感页面自动禁用 |
| NFR-6 | 兼容 | Chrome 88+ (Manifest V3) |

### Additional Requirements

**来自 Architecture.md:**

1. **Brownfield 项目扩展** - 不使用外部 Starter，在现有 React + Vite + TypeScript 代码库扩展
2. **Vite 多入口构建配置** - popup, content, background 三个独立入口点
3. **Shadow DOM 隔离** - Content Script UI 注入使用 `mode: 'closed'` 防止样式污染
4. **IndexedDB Schema 设计** - words 和 tags 两个 Object Store，包含 4 个索引
5. **统一消息协议** - SCREAMING_SNAKE_CASE 命名，8 种消息类型定义
6. **XPath 双重定位策略** - 主定位（XPath + 偏移量）+ 备选（上下文文本匹配）
7. **艾宾浩斯算法实现** - SM-2 简化版，7 级复习间隔 [1, 3, 7, 15, 30, 60, 120]
8. **manifest.json 更新** - Manifest V3 权限配置和入口声明

### FR Coverage Map

| FR ID | 功能描述 | Epic | Story | 说明 |
|-------|----------|------|-------|------|
| FR-1.1 | 文本选择监听 | Epic 1 | 1.3 | Content Script mouseup 事件 |
| FR-1.2 | 悬浮按钮渲染 | Epic 1 | 1.3, 1.4 | Shadow DOM 中的 FloatingButton |
| FR-1.3 | 选区位置计算 | Epic 1 | 1.5 | XPath + 偏移量提取 |
| FR-1.4 | 消息通信 | Epic 1 | 1.2 | chrome.runtime.sendMessage |
| FR-1.5 | 高亮渲染 | Epic 2 | 2.4 | 跳回原文时的黄色高亮 |
| FR-2.1 | AI API 调用 | Epic 1 | 1.6 | Gemini API 语境分析 |
| FR-2.2 | 数据持久化 | Epic 2 | 2.1 | IndexedDB 存储 |
| FR-2.3 | 复习调度 | Epic 3 | 3.1, 3.4 | chrome.alarms + 艾宾浩斯 |
| FR-2.4 | Badge 更新 | Epic 3 | 3.2 | 待复习数量显示 |
| FR-3.1 | 词库列表 | Epic 2 | 2.2, 2.5 | Popup 词汇列表展示 |
| FR-3.2 | 复习界面 | Epic 3 | 3.3 | 复习卡片组件 |
| FR-3.3 | 搜索筛选 | Epic 4 | 4.4, 4.5, 4.6 | 关键词、标签筛选 |
| FR-3.4 | 设置页面 | Epic 4 | 4.1, 4.2, 4.3 | API Key、主题配置 |
| FR-3.5 | 跳回原文触发 | Epic 2 | 2.3 | 点击按钮触发跳转 |

**覆盖率**: 14/14 FR = 100% ✅

## Epic List

### Epic 1: 智能划词翻译（核心 MVP）
**用户成果**：用户可以在任意网页选中文字，立即获得 AI 语境分析结果（含义、音标、词性）
**FRs 覆盖**：FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-2.1
**Stories**: 6 个

### Epic 2: 词汇保存与跳回原文（核心差异化 🌟）
**用户成果**：用户可以保存词汇，并随时一键跳回原文位置查看上下文
**FRs 覆盖**：FR-1.5, FR-2.2, FR-3.1, FR-3.5
**Stories**: 5 个

### Epic 3: 艾宾浩斯智能复习
**用户成果**：用户可以按科学记忆曲线收到复习提醒，通过卡片界面高效复习
**FRs 覆盖**：FR-2.3, FR-2.4, FR-3.2
**Stories**: 4 个

### Epic 4: 词库增强与个性化设置
**用户成果**：用户可以搜索、筛选、标签管理词汇，配置 API Key 和偏好设置
**FRs 覆盖**：FR-3.3, FR-3.4
**Stories**: 6 个

## Epic 依赖关系

```
Epic 1 (划词翻译)
    │
    ▼
Epic 2 (保存 + 跳回) ←── 核心差异化
    │
    ├──────────────┐
    ▼              ▼
Epic 3 (复习)   Epic 4 (增强)
```

---

## Epic 1: 智能划词翻译（核心 MVP）

**目标**：用户可以在任意网页选中文字，立即获得 AI 语境分析结果

**覆盖 FRs**：FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-2.1

---

### Story 1.1: 配置扩展多入口构建

**As a** 开发者,
**I want to** 配置 Vite 多入口构建和 manifest.json,
**So that** Content Script 和 Service Worker 能正确加载运行。

**Acceptance Criteria:**

**Given** 现有的 Vite + React 项目结构
**When** 运行 `npm run build`
**Then** 在 dist/ 目录生成：
- `popup.html` + `assets/popup-[hash].js`
- `content.js`（无 hash，便于 manifest 引用）
- `background.js`（无 hash）
- 更新后的 `manifest.json`
**And** manifest.json 包含正确的 content_scripts 和 background.service_worker 配置
**And** 扩展可以在 Chrome 中加载而不报错

---

### Story 1.2: 建立消息通信基础设施

**As a** 开发者,
**I want to** 建立 Content Script ↔ Service Worker 的类型安全消息通信,
**So that** 各模块可以可靠地交换数据。

**Acceptance Criteria:**

**Given** Content Script 和 Service Worker 已加载
**When** Content Script 发送 `ANALYZE_WORD` 消息
**Then** Service Worker 收到消息并返回 Response
**And** 消息类型使用 TypeScript 强类型定义
**And** 所有消息类型使用 SCREAMING_SNAKE_CASE 命名
**And** Response 结构统一为 `{ success, data?, error? }`

---

### Story 1.3: 实现网页文本选择监听

**As a** 英语学习者,
**I want to** 在网页上选中文字后看到操作按钮,
**So that** 我可以快速触发 AI 分析。

**Acceptance Criteria:**

**Given** 用户在任意网页浏览
**When** 用户选中 1-50 个字符的文本
**Then** 在选区右上角 8px 处显示悬浮按钮（32x32px 圆形）
**And** 按钮在 300ms 内淡入显示
**And** 点击页面其他区域时按钮消失
**And** 选中文本超过 50 字符时不显示按钮
**And** Content Script 加载时间 < 100ms

---

### Story 1.4: 实现 Shadow DOM UI 隔离

**As a** 开发者,
**I want to** 将 Content Script UI 注入到 Shadow DOM 中,
**So that** 扩展样式不受网页 CSS 影响。

**Acceptance Criteria:**

**Given** 悬浮按钮需要渲染到网页
**When** UI 组件注入到页面
**Then** 使用 `<lingorecall-root>` 自定义元素
**And** Shadow DOM 使用 `mode: 'closed'` 防止外部访问
**And** 样式完全内联，不依赖外部 CSS
**And** 在各类网站（Wikipedia、Twitter、MDN）上样式正常显示

---

### Story 1.5: 实现 XPath 选区位置提取

**As a** 系统,
**I want to** 提取选中文本的 XPath 和偏移量,
**So that** 将来可以精确定位回原文位置。

**Acceptance Criteria:**

**Given** 用户选中了网页上的文本
**When** 触发保存操作时
**Then** 提取并保存：
- `xpath`: 元素的完整 XPath 路径
- `textOffset`: 文本在元素内的起始偏移量
- `textLength`: 选中文本长度
- `contextBefore`: 前 100 字符上下文
- `contextAfter`: 后 100 字符上下文
**And** 对于动态页面，同时保存文本匹配备选信息

---

### Story 1.6: 集成 AI 语境分析功能

**As a** 英语学习者,
**I want to** 点击悬浮按钮后获得 AI 语境分析结果,
**So that** 我能理解词汇在当前上下文中的准确含义。

**Acceptance Criteria:**

**Given** 用户选中文本并点击悬浮按钮
**When** AI 分析请求发送
**Then** 显示分析结果弹窗（宽 320px）包含：
- 词汇含义（中文）
- IPA 音标
- 词性
- 语境化用法说明
**And** 响应时间 < 3 秒
**And** 加载中显示 loading 状态
**And** API 错误时显示友好提示
**And** 弹窗可点击外部关闭

---

## Epic 2: 词汇保存与跳回原文（核心差异化 🌟）

**目标**：用户可以保存词汇，并随时一键跳回原文位置查看上下文

**覆盖 FRs**：FR-1.5, FR-2.2, FR-3.1, FR-3.5

---

### Story 2.1: 保存词汇到本地数据库

**As a** 英语学习者，
**I want to** 将查询到的词汇保存到本地，
**So that** 我可以在离线状态下随时复习这些词汇。

**Acceptance Criteria:**

**Given** 用户已在 Popup 中查询了单词并看到释义
**When** 用户点击"保存"按钮
**Then** 系统将词汇信息存入 IndexedDB 的 words Object Store
**And** 保存的数据包含: id, text, meaning, pronunciation, partOfSpeech, exampleSentence
**And** 保存的数据包含来源信息: sourceUrl, sourceTitle, xpath, textOffset, contextBefore, contextAfter
**And** 初始化复习参数: createdAt=当前时间戳, nextReviewAt=当前时间戳+1天, reviewCount=0
**And** 显示"保存成功"的 Toast 提示

**Given** 用户已保存过同一单词（相同 text + 相同 sourceUrl + 相同 xpath）
**When** 用户再次尝试保存
**Then** 系统提示"该词汇已保存"
**And** 不创建重复记录

**Given** 用户首次使用扩展
**When** 扩展加载时
**Then** 自动创建 IndexedDB 数据库 "LingoRecallDB"
**And** 创建 words Object Store，keyPath 为 "id"
**And** 创建索引: byCreatedAt, byNextReviewAt, byTagId (multiEntry), bySourceUrl

---

### Story 2.2: 查看词库列表

**As a** 英语学习者，
**I want to** 在扩展中查看所有保存的词汇列表，
**So that** 我可以浏览和管理我的学习词库。

**Acceptance Criteria:**

**Given** 用户已保存了多个词汇
**When** 用户在 Popup 中点击"词库"标签页
**Then** 显示所有保存词汇的列表
**And** 每个词汇条目显示: 单词文本、词性、中文释义、保存时间
**And** 列表按保存时间倒序排列（最新的在最上面）

**Given** 用户没有保存任何词汇
**When** 用户进入词库页面
**Then** 显示空状态提示："还没有保存任何词汇，快去阅读网页并保存生词吧！"

**Given** 用户正在查看词库列表
**When** 用户点击某个词汇条目
**Then** 展开显示完整信息: 音标、完整释义、例句、来源页面标题
**And** 显示"跳回原文"按钮

**Given** 用户正在查看某个词汇的详情
**When** 用户点击"删除"按钮并确认
**Then** 从 IndexedDB 中删除该词汇记录
**And** 列表实时更新，移除该词汇

---

### Story 2.3: 跳回原文页面

**As a** 英语学习者，
**I want to** 点击词库中的"跳回原文"按钮后回到词汇来源页面，
**So that** 我可以在原始语境中复习这个词汇。

**Acceptance Criteria:**

**Given** 用户保存了来自某网页的词汇
**And** 该页面已在浏览器中打开
**When** 用户在词库中点击"跳回原文"按钮
**Then** 浏览器切换到该页面标签页
**And** 向该页面发送高亮请求消息

**Given** 用户保存的词汇来源页面未在浏览器中打开
**When** 用户点击"跳回原文"按钮
**Then** 在新标签页中打开该 URL
**And** 页面加载完成后发送高亮请求消息

**Given** 用户保存的词汇来源页面已无法访问（404 或其他错误）
**When** 用户点击"跳回原文"按钮
**Then** 显示友好提示："原文页面无法访问，但您仍可在此查看完整上下文"
**And** 在 Popup 中展示 contextBefore + 词汇 + contextAfter

---

### Story 2.4: 高亮定位原文位置

**As a** 英语学习者，
**I want to** 跳回原文后看到目标词汇被高亮显示并自动滚动到该位置，
**So that** 我可以立即看到词汇在原文中的确切位置和上下文。

**Acceptance Criteria:**

**Given** 原文页面已加载完成
**And** Content Script 收到高亮请求
**When** 使用 XPath + textOffset 定位目标文本
**Then** 找到目标文本节点
**And** 用 `<mark>` 标签包裹目标词汇
**And** 应用淡黄色背景样式 (#FEF08A)
**And** 页面平滑滚动到高亮位置（垂直居中）
**And** 5 秒后高亮渐隐消失（0.5 秒动画）

**Given** 原文页面结构已变化，XPath 定位失败
**When** XPath 定位返回 null
**Then** 使用备选方案: contextBefore + text + contextAfter 进行全文搜索
**And** 找到匹配文本后执行高亮和滚动

**Given** XPath 定位和上下文匹配都失败
**When** 无法在页面中找到目标文本
**Then** 显示 Toast 提示："无法在当前页面中定位该词汇，页面内容可能已更改"
**And** 不执行任何高亮操作

---

### Story 2.5: 词汇基础搜索

**As a** 英语学习者，
**I want to** 在词库中搜索词汇，
**So that** 当词库变大时我仍能快速找到想要复习的词汇。

**Acceptance Criteria:**

**Given** 用户词库中有多个词汇
**When** 用户在搜索框中输入关键词
**Then** 实时显示匹配结果（debounce 300ms）
**And** 匹配单词文本或释义中包含关键词的词汇
**And** 显示匹配数量

**Given** 用户正在查看词库列表
**When** 用户点击排序选项
**Then** 可选择: 最近保存、最早保存、字母顺序
**And** 列表立即按选中的方式重新排序

**Given** 搜索无结果
**When** 词库中没有匹配的词汇
**Then** 显示"没有找到匹配的词汇"
**And** 提供"清除搜索"按钮

---

## Epic 3: 艾宾浩斯智能复习

**目标**：用户可以按科学记忆曲线收到复习提醒，通过卡片界面高效复习

**覆盖 FRs**：FR-2.3, FR-2.4, FR-3.2

---

### Story 3.1: 复习时间自动计算

**As a** 语言学习者，
**I want to** 系统自动为我保存的词汇计算下次复习时间，
**So that** 我不需要手动记录，能按科学的记忆曲线进行复习。

**Acceptance Criteria:**

**Given** 用户保存了一个新词汇
**When** 词汇成功存入数据库
**Then** 系统自动设置 nextReviewAt 为当前时间 + 1 天
**And** reviewCount 初始化为 0
**And** interval 设置为 1

**Given** 后台 Service Worker 正在运行
**When** 每小时触发一次定时检查（chrome.alarms）
**Then** 系统查询所有 nextReviewAt <= 当前时间 的词汇
**And** 更新 Badge 显示待复习数量

**Given** 系统使用的复习间隔配置
**When** 查看间隔配置
**Then** 间隔序列为 [1, 3, 7, 15, 30, 60, 120] 天

---

### Story 3.2: 待复习词汇提醒

**As a** 语言学习者，
**I want to** 在浏览器工具栏看到待复习词汇的数量，
**So that** 我能及时知道需要复习，不会错过最佳复习时机。

**Acceptance Criteria:**

**Given** 有 N 个词汇已到复习时间
**When** 用户查看浏览器工具栏的扩展图标
**Then** Badge 显示数字 "N"
**And** Badge 背景色为红色 (#EF4444)

**Given** 没有待复习的词汇
**When** 用户查看扩展图标
**Then** Badge 不显示任何数字（清空状态）

**Given** 待复习数量超过 99
**When** 用户查看扩展图标
**Then** Badge 显示 "99+"

**Given** 用户完成了一个词汇的复习
**When** 复习结果保存成功
**Then** Badge 数字立即减 1

---

### Story 3.3: 复习卡片界面

**As a** 语言学习者，
**I want to** 通过卡片界面查看待复习词汇，
**So that** 我能专注地一个一个复习，测试自己的记忆。

**Acceptance Criteria:**

**Given** 用户有待复习词汇
**When** 用户点击扩展图标并选择"开始复习"
**Then** 显示复习卡片界面
**And** 卡片正面显示英文单词
**And** 卡片背面（点击后显示）包含：中文释义、原文语境、来源标题

**Given** 用户正在查看复习卡片正面
**When** 用户点击卡片或"显示答案"按钮
**Then** 卡片翻转动画（300ms）显示背面内容
**And** 出现两个按钮："记住了" 和 "忘记了"

**Given** 用户完成当前卡片复习
**When** 用户点击"记住了"或"忘记了"
**Then** 自动切换到下一张待复习卡片
**And** 显示复习进度（如 "3/10"）

**Given** 用户复习完所有待复习词汇
**When** 最后一张卡片完成
**Then** 显示复习完成页面
**And** 展示本次复习统计：总数、记住数、忘记数

**Given** 没有待复习词汇
**When** 用户点击"开始复习"
**Then** 显示空状态提示："太棒了！暂无待复习词汇"

---

### Story 3.4: 复习结果反馈

**As a** 语言学习者，
**I want to** 系统根据我的记忆情况调整下次复习时间，
**So that** 记住的词汇复习间隔变长，忘记的词汇能更快再次复习。

**Acceptance Criteria:**

**Given** 用户复习一个词汇
**When** 用户点击"记住了"
**Then** reviewCount 增加 1
**And** interval 更新为下一个间隔值
**And** nextReviewAt 更新为当前时间 + 新间隔
**And** Badge 数字减 1

**Given** 用户复习一个词汇
**When** 用户点击"忘记了"
**Then** reviewCount 重置为 0
**And** interval 重置为 1
**And** nextReviewAt 更新为当前时间 + 1 天
**And** Badge 数字减 1

**Given** 用户复习一个 reviewCount=6 的词汇（已达最大间隔）
**When** 用户点击"记住了"
**Then** reviewCount 保持为 6
**And** interval 保持为 120（天）
**And** nextReviewAt 更新为当前时间 + 120 天

---

## Epic 4: 词库增强与个性化设置

**目标**：用户可以搜索、筛选、标签管理词汇，配置 API Key 和偏好设置

**覆盖 FRs**：FR-3.3, FR-3.4

---

### Story 4.1: API Key 配置

**As a** LingoRecall 用户,
**I want to** 在设置页面配置我的 AI API Key,
**So that** 我可以使用自己的 AI 服务获取词汇解释。

**Acceptance Criteria:**

**Given** 用户打开扩展的设置页面
**When** 用户在 API Key 输入框中输入密钥并点击保存
**Then** 系统将 API Key 存储到 chrome.storage.local
**And** 显示保存成功的提示信息

**Given** 用户已保存 API Key
**When** 用户再次打开设置页面
**Then** API Key 输入框显示掩码形式（如 sk-****xxxx）
**And** 提供"显示/隐藏"切换按钮

**Given** 用户想要更换 API Key
**When** 用户点击"清除"按钮并确认
**Then** 系统删除已存储的 API Key
**And** 输入框恢复为空状态

---

### Story 4.2: 偏好设置管理

**As a** LingoRecall 用户,
**I want to** 自定义扩展的交互方式和外观,
**So that** 扩展行为符合我的使用习惯。

**Acceptance Criteria:**

**Given** 用户打开设置页面的"偏好设置"区域
**When** 用户切换"双击查词"开关
**Then** enableDoubleClick 设置立即生效
**And** 设置自动保存到 chrome.storage.local

**Given** 用户打开设置页面
**When** 用户切换"悬停显示图标"开关
**Then** enableHoverIcon 设置立即生效

**Given** 用户打开设置页面
**When** 用户从主题下拉框选择 'light' / 'dark' / 'system'
**Then** 扩展界面主题立即切换
**And** 设置保存到 storage

**Given** 用户首次安装扩展
**When** 用户打开设置页面
**Then** 显示默认设置值:
- enableDoubleClick: true
- enableHoverIcon: true
- reviewReminder: true
- theme: 'system'

---

### Story 4.3: 网站黑名单管理

**As a** LingoRecall 用户,
**I want to** 设置在特定网站上禁用扩展功能,
**So that** 在银行、支付等敏感页面保护我的隐私。

**Acceptance Criteria:**

**Given** 用户打开设置页面的"黑名单"区域
**When** 用户输入 URL 模式（如 `*.bank.com`）并点击添加
**Then** URL 模式添加到 blacklistUrls 数组
**And** 在黑名单列表中显示该条目

**Given** 黑名单中已有 URL 模式
**When** 用户点击某条目的删除按钮
**Then** 该 URL 模式从 blacklistUrls 中移除

**Given** 用户访问匹配黑名单的网站
**When** 页面加载完成
**Then** 扩展的 content script 不激活
**And** 扩展图标显示禁用状态

**Given** 用户首次安装扩展
**When** 用户查看黑名单设置
**Then** 显示预设的常见敏感网站模式:
- `*.paypal.com`
- `*.alipay.com`
- `*bank*`

---

### Story 4.4: 标签创建与管理

**As a** LingoRecall 用户,
**I want to** 创建和管理自定义标签,
**So that** 我可以按主题分类我的词汇。

**Acceptance Criteria:**

**Given** 用户打开词库页面的标签管理区域
**When** 用户输入标签名称、选择颜色并点击创建
**Then** 新标签保存到 IndexedDB 的 tags 表
**And** 标签列表实时显示新标签

**Given** 标签列表中已有标签
**When** 用户点击某标签的编辑按钮
**Then** 显示编辑弹窗，可修改名称和颜色
**And** 保存后更新 IndexedDB 中的记录

**Given** 标签列表中已有标签
**When** 用户点击某标签的删除按钮并确认
**Then** 标签从 IndexedDB 中删除
**And** 关联该标签的词汇自动解除关联

**Given** 用户创建标签
**When** 选择颜色
**Then** 提供 8-12 个预设颜色供选择
**And** 支持自定义 HEX 颜色输入

---

### Story 4.5: 词汇高级搜索与筛选

**As a** LingoRecall 用户,
**I want to** 通过关键词搜索和筛选条件快速找到词汇,
**So that** 我能在大量词汇中高效定位目标单词。

**Acceptance Criteria:**

**Given** 用户在词库页面
**When** 用户在搜索框输入关键词
**Then** 实时显示单词或释义包含该关键词的词汇
**And** 搜索结果高亮匹配文本

**Given** 用户在词库页面已创建标签
**When** 用户点击标签筛选器选择一个或多个标签
**Then** 只显示包含所选标签的词汇
**And** 显示当前筛选条件的标签徽章

**Given** 用户应用了搜索和筛选条件
**When** 用户点击"清除筛选"按钮
**Then** 所有筛选条件重置
**And** 显示完整词汇列表

**Given** 搜索或筛选结果为空
**When** 结果加载完成
**Then** 显示"未找到匹配词汇"的友好提示

---

### Story 4.6: 词汇标签关联

**As a** LingoRecall 用户,
**I want to** 给已保存的词汇添加或移除标签,
**So that** 我可以对词汇进行分类整理。

**Acceptance Criteria:**

**Given** 用户在词库页面查看某个词汇
**When** 用户点击词汇卡片上的"标签"按钮
**Then** 显示标签选择弹窗
**And** 已关联的标签显示为选中状态

**Given** 用户打开词汇的标签选择弹窗
**When** 用户点击一个未选中的标签
**Then** 该标签添加到词汇的 tagIds 数组
**And** 标签颜色徽章显示在词汇卡片上

**Given** 用户打开词汇的标签选择弹窗
**When** 用户点击一个已选中的标签
**Then** 该标签从词汇的 tagIds 数组中移除
**And** 词汇卡片上的对应标签徽章消失

**Given** 用户批量选择多个词汇
**When** 用户点击"批量添加标签"
**Then** 显示标签选择弹窗
**And** 选择的标签应用到所有选中词汇

---

## Story 统计总览

| Epic | 名称 | Stories 数量 |
|------|------|--------------|
| Epic 1 | 智能划词翻译 | 6 |
| Epic 2 | 词汇保存与跳回原文 | 5 |
| Epic 3 | 艾宾浩斯智能复习 | 4 |
| Epic 4 | 词库增强与个性化设置 | 6 |
| **总计** | | **21** |

## 实现优先级建议

**MVP 阶段 (Epic 1 + Epic 2)**: 11 Stories
- 完成后用户可以：划词翻译、保存词汇、跳回原文

**Beta 阶段 (Epic 3)**: 4 Stories
- 完成后用户可以：艾宾浩斯复习

**GA 阶段 (Epic 4)**: 6 Stories
- 完成后用户可以：标签管理、高级搜索、个性化设置
