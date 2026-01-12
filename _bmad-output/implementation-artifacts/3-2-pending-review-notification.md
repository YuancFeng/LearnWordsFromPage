# Story 3.2: 待复习词汇提醒

Status: done

## Story

**As a** 语言学习者,
**I want to** 在浏览器工具栏看到待复习词汇的数量,
**So that** 我能及时知道需要复习，不会错过最佳复习时机。

## Acceptance Criteria

### AC1: Badge 显示待复习数量
**Given** 有 N 个词汇已到复习时间 (nextReviewAt <= 当前时间)
**When** 用户查看浏览器工具栏的扩展图标
**Then** Badge 显示数字 "N"
**And** Badge 背景色为红色 (#EF4444)

### AC2: 无待复习词汇时清空 Badge
**Given** 没有待复习的词汇
**When** 用户查看扩展图标
**Then** Badge 不显示任何数字（清空状态）

### AC3: Badge 数量超过 99 显示 "99+"
**Given** 待复习数量超过 99
**When** 用户查看扩展图标
**Then** Badge 显示 "99+"

### AC4: 复习完成后实时更新 Badge
**Given** 用户完成了一个词汇的复习
**When** 复习结果保存成功
**Then** Badge 数字立即减 1

## Tasks / Subtasks

### Task 1: 创建 Badge 管理模块 (AC: #1, #2, #3)
- [x] 1.1 在 `src/background/badge.ts` 创建文件
- [x] 1.2 定义 Badge 颜色常量 `BADGE_COLOR = '#EF4444'`
- [x] 1.3 定义最大显示数量常量 `MAX_BADGE_COUNT = 99`
- [x] 1.4 实现 `formatBadgeText(count: number): string` 函数

### Task 2: 实现 Badge 更新函数 (AC: #1, #2, #3)
- [x] 2.1 实现 `updateBadge(count: number): Promise<void>` 函数
- [x] 2.2 当 count > 99 时显示 "99+"
- [x] 2.3 当 count === 0 时清空 Badge（设置为 ''）
- [x] 2.4 设置 Badge 背景色为 #EF4444

### Task 3: 实现待复习检查与更新流程 (AC: #1, #2)
- [x] 3.1 实现 `checkAndUpdateBadge(): Promise<void>` 函数
- [x] 3.2 调用 `countDueWords()` 获取待复习数量
- [x] 3.3 调用 `updateBadge(count)` 更新显示
- [x] 3.4 导出供 Alarm 处理器调用

### Task 4: 集成 Alarm 触发 Badge 更新 (AC: #1)
- [x] 4.1 修改 `src/background/alarms.ts` 的 `handleReviewAlarm`
- [x] 4.2 在 Alarm 触发时调用 `checkAndUpdateBadge()`
- [x] 4.3 确保错误不会中断后续 Alarm 触发

### Task 5: 实现复习完成后 Badge 更新 (AC: #4)
- [x] 5.1 在 `src/background/index.ts` 的 `UPDATE_WORD` handler 中添加复习处理逻辑
- [x] 5.2 在 `UPDATE_WORD` 消息处理后调用 `checkAndUpdateBadge()`
- [x] 5.3 确保更新操作是异步的，不阻塞响应返回

### Task 6: 扩展初始化时更新 Badge (AC: #1, #2)
- [x] 6.1 在 `src/background/index.ts` 的初始化逻辑中调用 `checkAndUpdateBadge()`
- [x] 6.2 确保 Service Worker 激活时 Badge 状态正确

### Task 7: 编写测试 (AC: #1, #2, #3, #4)
- [x] 7.1 测试 `formatBadgeText` 函数各种输入
- [x] 7.2 测试 Badge 更新逻辑
- [x] 7.3 Mock chrome.action API 进行集成测试

## Dev Notes

### 技术要求

**Chrome Badge API:**
- `chrome.action.setBadgeText({ text })` - 设置 Badge 文本
- `chrome.action.setBadgeBackgroundColor({ color })` - 设置背景色
- Badge 文本最多显示 4 个字符

**颜色规范:**
- 待复习 Badge 背景色: `#EF4444` (Tailwind red-500)
- 文本颜色: 白色（Chrome 默认）

### 文件结构

**需要创建的文件:**
```
src/background/badge.ts             # Badge 管理模块
```

**需要修改的文件:**
```
src/background/index.ts             # 初始化时更新 Badge
src/background/alarms.ts            # Alarm 处理中调用 Badge 更新
src/background/handlers/wordHandlers.ts  # 复习完成后更新 Badge
```

### 关键代码模式

**Badge 管理模块:**
```typescript
// src/background/badge.ts

export const BADGE_COLOR = '#EF4444';
export const MAX_BADGE_COUNT = 99;

/**
 * 格式化 Badge 显示文本
 * @param count 待复习数量
 * @returns Badge 显示文本，超过 99 显示 "99+"
 */
export function formatBadgeText(count: number): string {
  if (count <= 0) return '';
  if (count > MAX_BADGE_COUNT) return '99+';
  return String(count);
}

/**
 * 更新扩展图标 Badge
 * @param count 待复习数量
 */
export async function updateBadge(count: number): Promise<void> {
  const text = formatBadgeText(count);

  await chrome.action.setBadgeText({ text });

  // 只有在有待复习时设置背景色
  if (count > 0) {
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  }
}

/**
 * 检查待复习数量并更新 Badge
 */
export async function checkAndUpdateBadge(): Promise<void> {
  try {
    const count = await countDueWords();
    await updateBadge(count);
  } catch (error) {
    console.error('[Badge] Failed to update:', error);
    // 错误时清空 Badge，避免显示过期数据
    await updateBadge(0);
  }
}
```

**Alarm 处理集成:**
```typescript
// src/background/alarms.ts
import { checkAndUpdateBadge } from './badge';

export function handleReviewAlarm(alarm: chrome.alarms.Alarm): void {
  if (alarm.name === REVIEW_CHECK_ALARM) {
    // 异步执行，不阻塞
    checkAndUpdateBadge().catch(console.error);
  }
}

// 注册监听器
chrome.alarms.onAlarm.addListener(handleReviewAlarm);
```

**复习完成后更新:**
```typescript
// src/background/handlers/wordHandlers.ts
import { checkAndUpdateBadge } from '../badge';

async function handleUpdateWord(payload: UpdateWordPayload): Promise<Response<void>> {
  try {
    await updateWordInDB(payload.id, payload.updates);

    // 异步更新 Badge，不阻塞响应
    checkAndUpdateBadge().catch(console.error);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}
```

**Service Worker 初始化:**
```typescript
// src/background/index.ts
import { setupReviewAlarm } from './alarms';
import { checkAndUpdateBadge } from './badge';

// Service Worker 激活时执行
async function initialize(): Promise<void> {
  // 设置定时 Alarm
  await setupReviewAlarm();

  // 立即检查并更新 Badge
  await checkAndUpdateBadge();

  console.log('[LingoRecall] Service Worker initialized');
}

// 立即执行初始化
initialize().catch(console.error);
```

### 测试用例

```typescript
// src/background/badge.test.ts
describe('badge', () => {
  describe('formatBadgeText', () => {
    it('should return empty string for 0', () => {
      expect(formatBadgeText(0)).toBe('');
    });

    it('should return empty string for negative numbers', () => {
      expect(formatBadgeText(-5)).toBe('');
    });

    it('should return number as string for 1-99', () => {
      expect(formatBadgeText(1)).toBe('1');
      expect(formatBadgeText(50)).toBe('50');
      expect(formatBadgeText(99)).toBe('99');
    });

    it('should return "99+" for numbers > 99', () => {
      expect(formatBadgeText(100)).toBe('99+');
      expect(formatBadgeText(999)).toBe('99+');
    });
  });

  describe('updateBadge', () => {
    beforeEach(() => {
      // Mock chrome.action API
      global.chrome = {
        action: {
          setBadgeText: jest.fn().mockResolvedValue(undefined),
          setBadgeBackgroundColor: jest.fn().mockResolvedValue(undefined),
        }
      } as any;
    });

    it('should set badge text and color for positive count', async () => {
      await updateBadge(5);

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '5' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#EF4444'
      });
    });

    it('should clear badge for zero count', async () => {
      await updateBadge(0);

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });
});
```

### UI 规范

**Badge 样式:**
| 属性 | 值 |
|------|-----|
| 背景色 | #EF4444 (红色) |
| 文字颜色 | 白色 (Chrome 默认) |
| 最大字符 | 4 个 ("99+") |
| 位置 | 扩展图标右下角 |

### 注意事项

1. **Service Worker 休眠:** Badge 状态在 Service Worker 休眠后仍然保持，无需特殊处理
2. **并发更新:** 多处调用 `checkAndUpdateBadge()` 是安全的，Chrome API 会处理并发
3. **错误处理:** Badge 更新失败不应影响核心功能，使用 try-catch 包装
4. **性能:** `countDueWords()` 使用索引查询，即使大量词汇也能快速返回

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` - Decision 2.2: 通信模式选择
- PRD: `_bmad-output/planning-artifacts/prd.md` - US-3.1: 复习提醒
- Chrome Action API: https://developer.chrome.com/docs/extensions/reference/api/action#badge
- Tailwind Colors: https://tailwindcss.com/docs/customizing-colors

### Dependencies

- Story 3.1 (复习时间自动计算) 必须完成
- `countDueWords()` 函数必须已实现

### Estimated Effort

- 开发: 2-3 小时
- 测试: 1 小时

---

## Dev Agent Record

### Implementation Plan

1. 创建独立的 `badge.ts` 模块，将 Badge 逻辑从 `alarms.ts` 中分离
2. 定义 `BADGE_COLOR = '#EF4444'`（符合 Tailwind red-500 规范）
3. 实现 `formatBadgeText()`, `updateBadge()`, `checkAndUpdateBadge()` 三个核心函数
4. 重构 `alarms.ts`，导入新 Badge 模块，删除原有 Badge 实现
5. 修改 `UPDATE_WORD` handler，在复习完成后异步更新 Badge
6. 编写 19 个测试用例覆盖所有 AC

### Debug Log

- Story 3.1 已实现 Badge 基础功能，但颜色为 `#FF6B6B`，需更新为 `#EF4444`
- Story 3.1 的 `checkAndUpdateBadge()` 在 `alarms.ts` 中实现，按照 Story 3.2 要求抽取到独立模块
- 发现 `index.ts` 中的 `onStartup` 已调用 `checkAndUpdateBadge()`，Task 6 已满足

### Completion Notes

✅ Story 3.2 实现完成 (2026-01-11)

**AC 验证:**
- AC#1: Badge 显示待复习数量 ✅ - `updateBadge()` 设置文本和红色背景
- AC#2: 无待复习时清空 Badge ✅ - `formatBadgeText(0)` 返回空字符串
- AC#3: 超过 99 显示 "99+" ✅ - `formatBadgeText(100)` 返回 "99+"
- AC#4: 复习完成后实时更新 ✅ - `UPDATE_WORD` handler 异步调用 `checkAndUpdateBadge()`

**测试结果:**
- 167 个测试全部通过
- badge.test.ts: 19 个测试
- alarms.test.ts: 13 个测试

### Review Fixes (2026-01-12)

1. `src/background/alarms.ts` 增加 Alarm 触发异常兜底，避免中断后续触发。
2. `src/background/index.ts` 安装/更新后立即同步 Badge 状态。
3. `src/background/badge.ts` 清空 Badge 失败场景增加二次异常保护。
4. 文件清单补充当前工作区的 out-of-scope 变更。

---

## File List

### New Files
- `src/background/badge.ts` - Badge 管理模块（含错误兜底修复）
- `src/background/badge.test.ts` - Badge 模块测试

### Modified Files
- `src/background/alarms.ts` - Alarm 触发兜底，避免异常中断
- `src/background/alarms.test.ts` - 更新颜色测试从 #FF6B6B 到 #EF4444
- `src/background/index.ts` - UPDATE_WORD 后更新 Badge + 安装/更新后同步 Badge
- `_bmad-output/implementation-artifacts/3-2-pending-review-notification.md` - Review 修复记录与状态更新

### Out-of-scope 工作区变更（仅审查上下文）
- `src/content/components/ShadowApp.tsx`
- `src/content/index.ts`
- `src/popup/components/VocabularyList.tsx`
- `src/shared/storage/wordService.ts`
- `src/hooks/useTags.test.ts`
- `src/popup/components/BatchActionBar.tsx`
- `src/popup/components/BatchTagSelector.tsx`
- `src/popup/components/ColorPicker.test.tsx`
- `src/popup/components/TagManagement.test.tsx`
- `src/shared/storage/tagStore.test.ts`
- `_bmad-output/implementation-artifacts/1-1-configure-extension-multientry-build.md`
- `_bmad-output/implementation-artifacts/1-2-establish-messaging-infrastructure.md`
- `_bmad-output/implementation-artifacts/1-3-implement-text-selection-listener.md`
- `_bmad-output/implementation-artifacts/1-4-implement-shadow-dom-ui-isolation.md`
- `_bmad-output/implementation-artifacts/1-5-implement-xpath-selection-extraction.md`
- `_bmad-output/implementation-artifacts/2-1-save-words-to-local-database.md`
- `_bmad-output/implementation-artifacts/3-3-review-card-interface.md`
- `_bmad-output/implementation-artifacts/3-4-review-result-feedback.md`
- `_bmad-output/implementation-artifacts/4-1-api-key-configuration.md`
- `_bmad-output/implementation-artifacts/4-2-preferences-management.md`
- `_bmad-output/implementation-artifacts/4-3-website-blacklist-management.md`
- `_bmad-output/implementation-artifacts/4-4-tag-creation-management.md`
- `_bmad-output/implementation-artifacts/4-5-advanced-search-filter.md`
- `_bmad-output/implementation-artifacts/4-6-vocabulary-tag-association.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-12 | Review 修复 - Alarm 兜底、安装/更新后同步 Badge、清空 Badge 异常保护、文件清单更新 | Dev Agent (Amelia) |
| 2026-01-11 | Story 3.2 实现完成 - Badge 管理模块创建、颜色规范更新、复习后实时更新 | Dev Agent (Amelia) |
