---
stepsCompleted: [1, 2, 3, 4, 6, 8, 11, 14]
status: 'complete'
completedAt: '2026-01-11'
workflowType: 'ux-design'
scope: 'lightweight'
project_name: 'LingoRecall AI'
user_name: '冯少'
date: '2026-01-10'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-LearnWordsFromPage-2026-01-06.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/project-context.md
---

# UX Design Specification - LingoRecall AI

**Author:** 冯少
**Date:** 2026-01-10
**Scope:** 轻量级 UX 规范（设计令牌 + 核心组件规范）

---

## Executive Summary

### Project Vision

LingoRecall AI 是一款面向非英语母语者的智能词汇学习 Chrome 扩展。
核心价值主张："一键跳回原文位置并高亮显示"——让用户在语境中记忆词汇。

### Target Users

1. **英语学习者** - 日常网页浏览中无摩擦积累词汇
2. **跨国工作者** - 积累专业术语和地道表达
3. **AI 程序员** - 理解技术词汇的细微差别
4. **社交媒体博主** - 学习网络俚语和 meme 文化

用户技术水平：中等偏上，能独立配置 API Key

### Key Design Challenges

1. **多上下文协调** - Content Script、Popup、Shadow DOM 需要统一视觉语言
2. **不打断浏览** - 划词交互必须轻量，不遮挡内容
3. **样式隔离** - Shadow DOM 内联样式，防止网页 CSS 污染
4. **跳回高亮** - 醒目但不刺眼的高亮效果

### Design Opportunities

1. **现代化视觉** - 比沙拉查词更现代的 UI 设计
2. **微交互品质** - 悬浮按钮、卡片翻转、高亮渐隐动画
3. **主题支持** - Light / Dark / System 三种模式

## Core User Experience

### Defining Experience

**核心用户动作**: 选词 → AI 分析 → 保存 → 跳回原文
**核心价值循环**: 浏览学习 → 积累词汇 → 语境复习 → 长期记忆

### Platform Strategy

- **主平台**: Chrome 浏览器扩展 (Manifest V3)
- **交互方式**: 鼠标划词为主
- **离线支持**: IndexedDB 本地存储
- **兼容性**: Chrome 88+ 桌面端

### Effortless Interactions

1. **划词触发** - 选中文本 300ms 内显示悬浮按钮
2. **一键保存** - 自动提取语境、来源、位置信息
3. **跳回原文** - 一键打开页面 + 滚动 + 高亮
4. **复习提醒** - Badge 无打扰通知

### Critical Success Moments

1. AI 分析让用户理解词汇在当前语境的含义
2. 跳回原文看到高亮词汇和完整上下文
3. 复习卡片成功回忆含义
4. 词库积累带来的进步感

### Experience Principles

1. **Zero Friction** - 核心流程 3 步内完成
2. **Context First** - 语境是核心价值
3. **Quiet Power** - 强大但不打断阅读
4. **Progressive Value** - 使用越多价值越大

## Desired Emotional Response

### Primary Emotional Goals

- **成就感** - 保存词汇时感受到积累的价值
- **恍然大悟** - AI 分析结果让语境含义豁然开朗
- **惊喜** - 跳回原文功能带来的"原来还能这样"
- **掌控感** - 词库统计让学习进度可视化

### Emotional Journey Mapping

| 阶段 | 目标情感 |
|------|----------|
| 首次发现 | 好奇、期待 |
| 划词分析 | 专注 → 恍然大悟 |
| 保存词汇 | 成就感 |
| 跳回原文 | 惊喜、掌控 |
| 复习卡片 | 自信或坦然 |
| 长期使用 | 进步感 |

### Micro-Emotions

- 自信 > 困惑（清晰的 UI 层次）
- 信任 > 怀疑（数据本地存储）
- 成就 > 挫败（成功反馈 + 统计可视化）
- 平静 > 焦虑（Loading 状态 + 优雅降级）

### Emotional Design Principles

1. **即时反馈** - 消除操作不确定感
2. **优雅降级** - 出错时友好提示
3. **微妙惊喜** - 关键时刻的小确幸
4. **零压力** - 复习不打分、不惩罚

---

## Design System Foundation

### Design System Choice: Tailwind CSS

**决策**: 使用 Tailwind CSS 作为设计系统基础

**理由**:
1. **现有技术栈** - 项目已使用 Tailwind CSS via CDN
2. **Shadow DOM 兼容** - 可提取为内联样式注入
3. **快速迭代** - 无需维护独立组件库
4. **一致性保证** - 设计令牌内置于配置

### Tailwind Configuration

> **注意**: 以下配置基于已完成 Stories 的实际实现进行调整，确保规范与代码一致。

```javascript
// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html', './popup.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 品牌色 - 蓝色系 (基于现有实现)
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',  // 主色 (Blue-500)
          600: '#2563EB',  // Hover (Blue-600)
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // 成功/记住
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
        // 警告/待复习
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
        },
        // 错误/忘记
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
        },
        // 高亮色 (基于现有实现)
        highlight: {
          DEFAULT: '#FEF08A',  // Yellow-200 (现有实现)
          ring: 'rgba(254, 240, 138, 0.5)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md': '0 2px 8px rgba(0, 0, 0, 0.1)',      // 卡片阴影
        'lg': '0 4px 12px rgba(0, 0, 0, 0.15)',    // 悬浮按钮
        'xl': '0 8px 24px rgba(0, 0, 0, 0.2)',     // 悬停增强
        'popup': '0 4px 12px rgba(0, 0, 0, 0.15)', // 弹窗
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',       // 基于现有实现
        'fade-out': 'fadeOut 300ms ease-in',
        'slide-up': 'slideUp 200ms ease-out',
        'pulse-once': 'pulse 400ms ease-in-out',
        'highlight-fade': 'highlightFade 5000ms ease-out forwards',  // 5秒淡出
        'spin': 'spin 0.8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        highlightFade: {
          '0%': { backgroundColor: '#FEF08A', boxShadow: '0 0 0 2px rgba(254, 240, 138, 0.5)' },
          '90%': { backgroundColor: '#FEF08A', boxShadow: '0 0 0 2px rgba(254, 240, 138, 0.5)' },
          '100%': { backgroundColor: 'transparent', boxShadow: 'none' },
        },
        spin: {
          'to': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
```

---

## Visual Foundation (Design Tokens)

### Color System

#### Semantic Colors

> **基于现有实现调整** - 使用蓝色系作为品牌色

| 语义 | Light Mode | Dark Mode | 使用场景 |
|------|------------|-----------|----------|
| **Primary** | `#3B82F6` | `#60A5FA` | 主操作按钮、链接、强调 |
| **Primary Hover** | `#2563EB` | `#3B82F6` | 按钮悬停状态 |
| **Primary Light** | `#DBEAFE` | `#1E3A8A` | 标签背景、浅色强调 |
| **Success** | `#10B981` | `#34D399` | 保存成功、记住反馈 |
| **Warning** | `#F59E0B` | `#FBBF24` | 待复习提醒、Badge |
| **Error** | `#EF4444` | `#F87171` | 错误提示、忘记反馈 |
| **Highlight** | `#FEF08A` | `#FEF08A` | 跳回原文高亮 (Yellow-200) |

#### Background Colors

| 语义 | Light Mode | Dark Mode |
|------|------------|-----------|
| **Surface** | `#FFFFFF` | `#1F2937` |
| **Surface Secondary** | `#F9FAFB` | `#111827` |
| **Surface Elevated** | `#FFFFFF` | `#374151` |
| **Overlay** | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` |

#### Text Colors

| 语义 | Light Mode | Dark Mode |
|------|------------|-----------|
| **Primary** | `#111827` | `#F9FAFB` |
| **Secondary** | `#6B7280` | `#9CA3AF` |
| **Tertiary** | `#9CA3AF` | `#6B7280` |
| **Disabled** | `#D1D5DB` | `#4B5563` |

### Typography Scale

```css
/* 字体家族 */
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', Menlo, monospace;

/* 字号阶梯 */
--text-xs: 0.75rem;     /* 12px - 辅助信息 */
--text-sm: 0.875rem;    /* 14px - 次要文本 */
--text-base: 1rem;      /* 16px - 正文 */
--text-lg: 1.125rem;    /* 18px - 小标题 */
--text-xl: 1.25rem;     /* 20px - 标题 */
--text-2xl: 1.5rem;     /* 24px - 大标题 */

/* 字重 */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* 行高 */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### Spacing System

```css
/* 4px 基础单位 */
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### Border & Radius

```css
/* 圆角 */
--radius-sm: 0.25rem;   /* 4px - 小元素 */
--radius-md: 0.375rem;  /* 6px - 输入框 */
--radius-lg: 0.5rem;    /* 8px - 卡片 */
--radius-xl: 0.75rem;   /* 12px - 弹窗 */
--radius-2xl: 1rem;     /* 16px - 大卡片 */
--radius-full: 9999px;  /* 圆形按钮 */

/* 边框 */
--border-width: 1px;
--border-color-default: #E5E7EB;
--border-color-hover: #D1D5DB;
--border-color-focus: #3B82F6;  /* Blue-500 (现有实现) */
```

### Shadow System

> **基于现有实现 `src/content/styles/components.ts`**

```css
/* 阴影层级 */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.1);     /* 卡片 */
--shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15);   /* 悬浮按钮 */
--shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.2);    /* 悬停增强 */

/* 特殊阴影 */
--shadow-popup: 0 4px 12px rgba(0, 0, 0, 0.15);   /* 弹窗 */
--shadow-highlight: 0 0 0 2px rgba(254, 240, 138, 0.5);  /* 高亮 ring */
```

### Animation Tokens

> **基于现有实现调整**

```css
/* 时长 */
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-highlight: 5000ms;  /* 高亮持续时间 (现有实现) */

/* 缓动函数 */
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

---

## Component Strategy

### Core Component Specifications

#### 1. FloatingButton (悬浮按钮)

> **基于现有实现 `src/content/components/FloatingButton.tsx`**

**位置**: 选中文本右下角偏移 8px

**尺寸**: 32×32px (触摸友好)

**样式规范**:
```css
.floating-button {
  /* 尺寸与位置 */
  width: 32px;
  height: 32px;
  position: fixed;
  z-index: 2147483647;  /* 最高层级 */

  /* 视觉样式 - 纯色背景 (现有实现) */
  background: #3B82F6;  /* Blue-500 */
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-lg);  /* 0 4px 12px rgba(0,0,0,0.15) */

  /* 图标 */
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;

  /* 交互 */
  cursor: pointer;
  transition: transform var(--duration-slow) var(--ease-out),
              box-shadow var(--duration-slow) var(--ease-out),
              opacity var(--duration-slow) var(--ease-out);
}

.floating-button:hover {
  transform: scale(1.05);  /* 现有实现 */
  background: #2563EB;     /* Blue-600 */
  box-shadow: var(--shadow-xl);
}

.floating-button:active {
  transform: scale(0.95);
}
```

**动画**:
- 出现: `fade-in` 300ms (现有实现)
- 消失: `fade-out` 300ms
- 悬停: `scale(1.05)` + 背景色变深

**图标**: Sparkles (16×16px, lucide-react)

---

#### 2. AnalysisPopup (分析弹窗)

> **基于现有实现 `src/content/components/AnalysisPopup.tsx`**

**尺寸**: 宽度 320px，高度自适应 (max 400px)

**位置**: 悬浮按钮下方，边缘防溢出

**样式规范**:
```css
.analysis-popup {
  /* 尺寸 */
  width: 320px;
  max-height: 400px;
  overflow-y: auto;

  /* 视觉 - 现有实现 */
  background: #FFFFFF;
  border-radius: 12px;  /* radius-xl */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);  /* shadow-popup */
  border: 1px solid #E5E7EB;

  /* 内边距 */
  padding: 16px;
}

/* 内部结构 */
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.popup-word {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.popup-context {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  background: var(--surface-secondary);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
}

.popup-analysis {
  font-size: var(--text-base);
  color: var(--text-primary);
  line-height: var(--leading-relaxed);
}

.popup-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-color-default);
}
```

**状态**:
- Loading: Skeleton + 脉冲动画
- Success: 内容渐入
- Error: 错误提示 + 重试按钮

**动画**: `slide-up` 300ms

---

#### 3. WordCard (词汇卡片)

**布局**: 垂直堆叠，间距 12px

**尺寸**: 宽度 100%，高度自适应

**样式规范**:
```css
.word-card {
  /* 布局 */
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  /* 视觉 */
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-4);

  /* 交互 */
  cursor: pointer;
  transition: box-shadow var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.word-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.word-card__word {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.word-card__context {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.word-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.word-card__source {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.word-card__jump-btn {
  color: var(--primary);
  font-weight: var(--font-medium);
}
```

**交互**:
- 点击卡片: 展开详情
- 点击"跳回原文": 新标签打开 + 高亮
- 长按: 显示操作菜单

---

#### 4. ReviewCard (复习卡片)

**布局**: 翻转卡片效果 (正面/背面)

**尺寸**: 宽度 100%，高度 200px

**样式规范**:
```css
.review-card {
  /* 3D 翻转容器 */
  perspective: 1000px;
  width: 100%;
  height: 200px;
}

.review-card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform var(--duration-slow) var(--ease-in-out);
}

.review-card--flipped .review-card__inner {
  transform: rotateY(180deg);
}

.review-card__front,
.review-card__back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;

  /* 共享样式 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  padding: var(--space-6);
}

.review-card__back {
  transform: rotateY(180deg);
}

.review-card__word {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.review-card__hint {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.review-card__answer {
  font-size: var(--text-base);
  color: var(--text-primary);
  text-align: center;
  line-height: var(--leading-relaxed);
}

.review-card__actions {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
```

**交互**:
- 点击卡片: 翻转显示答案
- "记住" 按钮: Success 色 + checkmark
- "忘记" 按钮: Error 色 + refresh

---

#### 5. Highlight Effect (跳回高亮)

> **基于现有实现 `src/content/highlight.ts`**

**样式规范**:
```css
.lingorecall-highlight {
  /* 高亮样式 - Yellow-200 (现有实现) */
  background-color: #FEF08A !important;
  border-radius: 2px;
  padding: 0 2px;
  box-shadow: 0 0 0 2px rgba(254, 240, 138, 0.5);

  /* 动画 */
  transition: background-color 0.5s ease-out;
}

.lingorecall-highlight.fade-out {
  background-color: transparent !important;
  box-shadow: none;
}
```

**行为** (现有实现):
1. 页面平滑滚动到目标位置 (scrollIntoView)
2. 高亮效果立即出现 (#FEF08A)
3. 高亮保持 5000ms (fadeOutDelay)
4. 高亮渐隐 500ms (animationDuration)
5. 自动移除高亮元素，恢复原始 DOM

---

### Button Components

#### Primary Button
```css
.btn-primary {
  background: var(--primary);
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  transition: background var(--duration-fast) var(--ease-out);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  background: var(--text-disabled);
  cursor: not-allowed;
}
```

#### Secondary Button
```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color-default);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
}

.btn-secondary:hover {
  border-color: var(--border-color-hover);
  background: var(--surface-secondary);
}
```

#### Icon Button
```css
.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: background var(--duration-fast) var(--ease-out);
}

.btn-icon:hover {
  background: var(--surface-secondary);
  color: var(--text-primary);
}
```

---

### Form Components

#### Search Input
```css
.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  padding-left: var(--space-10);  /* 图标空间 */
  border: 1px solid var(--border-color-default);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  background: var(--surface);
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.search-input:focus {
  outline: none;
  border-color: var(--border-color-focus);  /* #3B82F6 */
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);  /* ring-blue-500 (现有实现) */
}
```

#### Tag Chip
```css
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--primary-50);
  color: var(--primary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.tag-chip--active {
  background: var(--primary);
  color: white;
}
```

---

### Loading States

#### Skeleton
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-secondary) 25%,
    var(--surface) 50%,
    var(--surface-secondary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### Spinner
```css
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color-default);
  border-top-color: var(--primary);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Implementation Notes

### Shadow DOM Style Injection

Content Script 组件使用 Shadow DOM 隔离，需要内联样式：

```typescript
// src/content/styles/components.ts (现有实现)
export const COLORS = {
  primary: '#3B82F6',       // Blue-500
  primaryHover: '#2563EB',  // Blue-600
  success: '#10B981',       // Green-500
  error: '#EF4444',         // Red-500
  background: '#FFFFFF',
  text: '#1F2937',          // Gray-800
  textSecondary: '#6B7280', // Gray-500
  border: '#E5E7EB',        // Gray-200
};

export const SHADOWS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 2px 8px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.15)',
};

// 组件样式通过 React 内联注入
// 参考: FloatingButton.tsx, AnalysisPopup.tsx
```

### Dark Mode Support

```typescript
// 检测系统主题
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// 监听主题变化
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    document.documentElement.classList.toggle('dark', e.matches);
  });
```

### Responsive Breakpoints

| 断点 | 宽度 | 应用场景 |
|------|------|----------|
| **sm** | 640px | Popup 最小宽度 |
| **md** | 768px | 平板适配 (预留) |
| **lg** | 1024px | 桌面端 (预留) |

---

## Compliance Review Checklist

### 已完成 Stories 的 UX 合规性

> **审核日期**: 2026-01-11
> **审核结果**: 所有 UI 组件符合更新后的 UX 规范

| Story | 组件 | 合规状态 | 审核备注 |
|-------|------|----------|----------|
| 1-3 | FloatingButton | ✅ 符合 | 32×32px, #3B82F6, scale(1.05), shadow-lg |
| 1-6 | AnalysisPopup | ✅ 符合 | 320px宽, 12px圆角, shadow-popup |
| 2-1 | WordCard | ✅ 符合 | rounded-2xl, shadow-sm/md, Blue主题 |
| 2-2 | VocabularyList | ✅ 符合 | 统一使用 Tailwind Blue 色系 |
| 2-3 | JumpToSource | ✅ 无独立UI | 复用 Highlight 组件 |
| 2-4 | Highlight | ✅ 符合 | #FEF08A, 5s 持续, 0.5s 淡出 |
| 2-5 | SearchBar | ✅ 符合 | ring-blue-500, rounded-xl |
| 3-1 | Badge | ✅ 符合 | 使用 chrome.action.setBadgeBackgroundColor |

### 合规审查标准

1. **颜色**: ✅ 使用 Blue-500 (#3B82F6) 为主色
2. **间距**: ✅ 使用 Tailwind 标准间距 (p-4, gap-2, etc.)
3. **圆角**: ✅ 使用 rounded-xl/2xl 层级
4. **阴影**: ✅ 使用 shadow-sm/md/lg 层级
5. **动画**: ✅ 使用 300ms fade, 5s highlight
6. **字体**: ✅ 使用 text-sm/base/lg 阶梯

### 规范同步说明

本 UX 规范已根据以下已完成 Stories 的实际实现进行调整：
- 主色从 Indigo (#6366F1) 更新为 Blue (#3B82F6)
- 高亮色从 Amber 更新为 Yellow-200 (#FEF08A)
- 高亮持续时间从 2.5s 更新为 5s
- 阴影值与 `src/content/styles/components.ts` 对齐

---

## UX Specification Completion Summary

### Deliverables

✅ **设计系统选择**: Tailwind CSS + 自定义配置
✅ **设计令牌**: 颜色、字体、间距、圆角、阴影、动画
✅ **核心组件规范**: 5 个核心组件 + 3 类辅助组件
✅ **Shadow DOM 注入策略**: 内联样式方案
✅ **Dark Mode 支持**: 系统跟随 + CSS 变量切换
✅ **合规审查清单**: 已完成 Stories 的审查基准

### Next Steps

1. **审查已完成 Stories** - 对照本规范检查现有实现
2. **更新组件样式** - 统一使用设计令牌
3. **添加 Dark Mode** - 实现主题切换功能
4. **优化动画** - 统一使用定义的动画参数

---

**UX Design Specification Status:** COMPLETE ✅
**Document Version:** 1.0
**Last Updated:** 2026-01-11
