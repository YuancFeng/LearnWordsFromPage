# Story 3.4: 复习结果反馈

Status: review

## Story

**As a** 语言学习者,
**I want to** 系统根据我的记忆情况调整下次复习时间,
**So that** 记住的词汇复习间隔变长，忘记的词汇能更快再次复习。

## Acceptance Criteria

### AC1: 记住了 - 升级复习间隔
**Given** 用户复习一个词汇
**When** 用户点击"记住了"
**Then** `reviewCount` 增加 1
**And** `interval` 更新为下一个间隔值 (按 [1, 3, 7, 15, 30, 60, 120] 序列)
**And** `nextReviewAt` 更新为当前时间 + 新间隔
**And** Badge 数字减 1

### AC2: 忘记了 - 重置复习间隔
**Given** 用户复习一个词汇
**When** 用户点击"忘记了"
**Then** `reviewCount` 重置为 0
**And** `interval` 重置为 1
**And** `nextReviewAt` 更新为当前时间 + 1 天
**And** Badge 数字减 1

### AC3: 最大间隔限制
**Given** 用户复习一个 `reviewCount=6` 的词汇（已达最大间隔 120 天）
**When** 用户点击"记住了"
**Then** `reviewCount` 保持为 6（不再增加）
**And** `interval` 保持为 120（天）
**And** `nextReviewAt` 更新为当前时间 + 120 天

## Tasks / Subtasks

### Task 1: 完善艾宾浩斯计算函数 (AC: #1, #2, #3)
- [x] 1.1 在 `src/shared/utils/ebbinghaus.ts` 完善 `calculateNextReview` 函数
- [x] 1.2 实现"记住了"逻辑：升级到下一个间隔
- [x] 1.3 实现"忘记了"逻辑：重置到第一个间隔
- [x] 1.4 实现最大间隔限制（reviewCount 不超过 6）
- [x] 1.5 返回完整的更新字段对象

### Task 2: 实现词汇复习更新处理器 (AC: #1, #2, #3)
- [x] 2.1 在 `src/background/handlers/wordHandlers.ts` 添加 `handleReviewWord` 函数
- [x] 2.2 接收 `wordId` 和 `reviewResult` ('remembered' | 'forgotten')
- [x] 2.3 从数据库获取当前词汇
- [x] 2.4 调用 `calculateNextReview` 计算新参数
- [x] 2.5 更新数据库记录

### Task 3: 添加 REVIEW_WORD 消息类型 (AC: #1, #2)
- [x] 3.1 在 `src/shared/messaging/types.ts` 定义 `REVIEW_WORD` 消息类型
- [x] 3.2 定义 `ReviewWordPayload` 接口
- [x] 3.3 在 Service Worker 消息路由中注册处理器

### Task 4: 集成 Badge 更新 (AC: #1, #2)
- [x] 4.1 在复习结果保存后调用 `checkAndUpdateBadge()`
- [x] 4.2 确保 Badge 数字实时减少
- [x] 4.3 处理并发复习场景（使用异步调用，不阻塞响应）

### Task 5: 添加数据库更新函数 (AC: #1, #2, #3)
- [x] 5.1 使用现有 `updateWord` 函数（已支持部分更新）
- [x] 5.2 支持部分更新：`nextReviewAt`, `reviewCount`, `interval`
- [x] 5.3 返回更新后的完整记录

### Task 6: 编写单元测试 (AC: #1, #2, #3)
- [x] 6.1 测试 `calculateNextReview` 所有场景
- [x] 6.2 测试边界情况：reviewCount=0, reviewCount=6
- [x] 6.3 测试时间戳计算准确性

### Task 7: 编写集成测试 (AC: #1, #2, #3)
- [x] 7.1 测试完整复习流程：用户点击 → 消息发送 → 数据更新 → Badge 更新
- [x] 7.2 测试连续复习多个词汇（full review sequence test）

## Dev Notes

### 技术要求

**艾宾浩斯算法实现:**
```typescript
// 复习间隔序列（天）
REVIEW_INTERVALS = [1, 3, 7, 15, 30, 60, 120]

// 计算逻辑
if (result === 'remembered') {
  newReviewCount = Math.min(reviewCount + 1, 6)  // 最大 6
  newInterval = REVIEW_INTERVALS[newReviewCount]
} else {
  newReviewCount = 0
  newInterval = REVIEW_INTERVALS[0]  // 1 天
}

nextReviewAt = Date.now() + newInterval * 86400000
```

**数据一致性:**
- 复习操作必须是原子的（读取 → 计算 → 更新）
- 使用 IndexedDB 事务保证一致性
- Badge 更新可以异步，但必须在复习操作之后

### 文件结构

**需要修改的文件:**
```
src/shared/utils/ebbinghaus.ts           # 完善计算函数
src/shared/messaging/types.ts            # 添加 REVIEW_WORD 消息
src/background/handlers/wordHandlers.ts  # 添加复习处理器
src/background/index.ts                  # 注册消息处理
src/shared/storage/db.ts                 # 添加更新函数
```

### 关键代码模式

**艾宾浩斯计算函数:**
```typescript
// src/shared/utils/ebbinghaus.ts

export const REVIEW_INTERVALS = [1, 3, 7, 15, 30, 60, 120]; // 天
export const DAY_MS = 24 * 60 * 60 * 1000; // 86400000ms
export const MAX_REVIEW_COUNT = REVIEW_INTERVALS.length - 1; // 6

export type ReviewResult = 'remembered' | 'forgotten';

export interface ReviewUpdate {
  nextReviewAt: number;
  reviewCount: number;
  interval: number;
}

/**
 * 根据复习结果计算下次复习时间
 * @param currentReviewCount 当前复习次数
 * @param result 复习结果
 * @returns 更新后的复习参数
 */
export function calculateNextReview(
  currentReviewCount: number,
  result: ReviewResult
): ReviewUpdate {
  const now = Date.now();

  if (result === 'forgotten') {
    // 忘记了：重置到第一个间隔
    return {
      nextReviewAt: now + REVIEW_INTERVALS[0] * DAY_MS,
      reviewCount: 0,
      interval: REVIEW_INTERVALS[0],
    };
  }

  // 记住了：升级到下一个间隔
  const newReviewCount = Math.min(currentReviewCount + 1, MAX_REVIEW_COUNT);
  const newInterval = REVIEW_INTERVALS[newReviewCount];

  return {
    nextReviewAt: now + newInterval * DAY_MS,
    reviewCount: newReviewCount,
    interval: newInterval,
  };
}

/**
 * 初始化新词汇的复习参数
 */
export function initializeReviewParams(): ReviewUpdate {
  return {
    nextReviewAt: Date.now() + REVIEW_INTERVALS[0] * DAY_MS,
    reviewCount: 0,
    interval: REVIEW_INTERVALS[0],
  };
}
```

**消息类型定义:**
```typescript
// src/shared/messaging/types.ts

export interface ReviewWordPayload {
  wordId: string;
  result: 'remembered' | 'forgotten';
}

export interface ReviewWordResponse {
  word: WordRecord;
}

// 添加到 MessageType 联合类型
export type MessageType =
  | 'ANALYZE_WORD'
  | 'SAVE_WORD'
  | 'GET_WORDS'
  | 'GET_DUE_WORDS'
  | 'UPDATE_WORD'
  | 'DELETE_WORD'
  | 'REVIEW_WORD'    // 新增
  | 'HIGHLIGHT_TEXT'
  | 'UPDATE_BADGE';

// PayloadMap 添加
export interface PayloadMap {
  // ... existing
  REVIEW_WORD: ReviewWordPayload;
}

// ResponseMap 添加
export interface ResponseMap {
  // ... existing
  REVIEW_WORD: ReviewWordResponse;
}
```

**复习处理器:**
```typescript
// src/background/handlers/wordHandlers.ts
import { calculateNextReview } from '@/shared/utils/ebbinghaus';
import { getWordById, updateWord } from '@/shared/storage/db';
import { checkAndUpdateBadge } from '../badge';

export async function handleReviewWord(
  payload: ReviewWordPayload
): Promise<Response<ReviewWordResponse>> {
  try {
    const { wordId, result } = payload;

    // 1. 获取当前词汇
    const word = await getWordById(wordId);
    if (!word) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Word not found' }
      };
    }

    // 2. 计算新的复习参数
    const updates = calculateNextReview(word.reviewCount, result);

    // 3. 更新数据库
    const updatedWord = await updateWord(wordId, updates);

    // 4. 异步更新 Badge（不阻塞响应）
    checkAndUpdateBadge().catch(console.error);

    return {
      success: true,
      data: { word: updatedWord }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'STORAGE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
```

**数据库更新函数:**
```typescript
// src/shared/storage/db.ts

export async function updateWord(
  id: string,
  updates: Partial<WordRecord>
): Promise<WordRecord> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readwrite');
    const store = tx.objectStore('words');

    // 先获取当前记录
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const word = getRequest.result;
      if (!word) {
        reject(new Error('Word not found'));
        return;
      }

      // 合并更新
      const updatedWord = { ...word, ...updates };

      const putRequest = store.put(updatedWord);

      putRequest.onsuccess = () => resolve(updatedWord);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getWordById(id: string): Promise<WordRecord | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readonly');
    const store = tx.objectStore('words');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
```

**消息路由注册:**
```typescript
// src/background/index.ts
import { handleReviewWord } from './handlers/wordHandlers';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    // ... existing cases

    case 'REVIEW_WORD':
      handleReviewWord(payload).then(sendResponse);
      return true; // 异步响应

    default:
      sendResponse({ success: false, error: { code: 'UNKNOWN_MESSAGE', message: 'Unknown message type' } });
  }
});
```

### 测试用例

```typescript
// src/shared/utils/ebbinghaus.test.ts
describe('calculateNextReview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-08T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('remembered', () => {
    it('should upgrade from reviewCount 0 to 1, interval 1 to 3', () => {
      const result = calculateNextReview(0, 'remembered');

      expect(result.reviewCount).toBe(1);
      expect(result.interval).toBe(3);
      expect(result.nextReviewAt).toBe(Date.now() + 3 * DAY_MS);
    });

    it('should upgrade from reviewCount 5 to 6, interval 60 to 120', () => {
      const result = calculateNextReview(5, 'remembered');

      expect(result.reviewCount).toBe(6);
      expect(result.interval).toBe(120);
    });

    it('should stay at max reviewCount 6 and interval 120', () => {
      const result = calculateNextReview(6, 'remembered');

      expect(result.reviewCount).toBe(6); // 不再增加
      expect(result.interval).toBe(120);  // 保持最大间隔
    });
  });

  describe('forgotten', () => {
    it('should reset to reviewCount 0 and interval 1', () => {
      const result = calculateNextReview(5, 'forgotten');

      expect(result.reviewCount).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.nextReviewAt).toBe(Date.now() + 1 * DAY_MS);
    });

    it('should reset from max reviewCount to 0', () => {
      const result = calculateNextReview(6, 'forgotten');

      expect(result.reviewCount).toBe(0);
      expect(result.interval).toBe(1);
    });
  });
});

// src/background/handlers/wordHandlers.test.ts
describe('handleReviewWord', () => {
  it('should update word and trigger badge update on remembered', async () => {
    // Mock dependencies
    const mockWord = { id: '1', reviewCount: 2, interval: 7 };
    jest.spyOn(db, 'getWordById').mockResolvedValue(mockWord);
    jest.spyOn(db, 'updateWord').mockResolvedValue({ ...mockWord, reviewCount: 3, interval: 15 });
    const badgeSpy = jest.spyOn(badge, 'checkAndUpdateBadge').mockResolvedValue();

    const result = await handleReviewWord({ wordId: '1', result: 'remembered' });

    expect(result.success).toBe(true);
    expect(db.updateWord).toHaveBeenCalledWith('1', expect.objectContaining({
      reviewCount: 3,
      interval: 15,
    }));
    expect(badgeSpy).toHaveBeenCalled();
  });
});
```

### 复习间隔速查表

| reviewCount | interval (天) | 累计天数 |
|-------------|---------------|----------|
| 0 | 1 | 1 |
| 1 | 3 | 4 |
| 2 | 7 | 11 |
| 3 | 15 | 26 |
| 4 | 30 | 56 |
| 5 | 60 | 116 |
| 6 | 120 | 236 |

### 边界情况处理

1. **词汇不存在:** 返回 NOT_FOUND 错误
2. **并发复习:** IndexedDB 事务保证原子性
3. **Badge 更新失败:** 不影响复习结果保存，静默失败
4. **时间戳溢出:** JavaScript Date 支持到公元 275760 年，无需担心

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` - Decision 5.2: 艾宾浩斯复习调度
- Epics: `_bmad-output/planning-artifacts/epics.md` - Story 3.4: 复习结果反馈
- Project Context: `_bmad-output/planning-artifacts/project-context.md` - 复习间隔常量
- SM-2 算法参考: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method

### Dependencies

- Story 3.1 (复习时间自动计算) 必须完成
- Story 3.2 (待复习词汇提醒) 必须完成
- Story 3.3 (复习卡片界面) 必须完成（用于触发复习结果）

### Estimated Effort

- 开发: 3-4 小时
- 测试: 2 小时

## Dev Agent Record

### Implementation Plan

1. 修改 `calculateNextReview` 函数，实现 AC3 最大间隔限制（reviewCount 不超过 6）
2. 添加 `REVIEW_WORD` 消息类型及 Payload/Response 定义
3. 创建 `handleReviewWord` 处理器函数
4. 在 Service Worker 中注册 REVIEW_WORD 处理器
5. 集成 Badge 更新（异步调用，不阻塞响应）
6. 编写单元测试覆盖所有 AC 场景

### Debug Log

无重大问题。

### Completion Notes

✅ **Story 3.4 实现完成 (2026-01-11)**

**主要变更：**
- 修复了 `calculateNextReview` 函数的最大间隔限制逻辑（AC3）
- 添加了 `MAX_REVIEW_COUNT` 常量导出
- 新建 `handleReviewWord` 处理器处理复习结果
- 添加 `REVIEW_WORD` 消息类型及类型定义
- Badge 更新采用异步调用，确保不阻塞用户响应

**测试覆盖：**
- 单元测试：17 个 ebbinghaus 测试
- 集成测试：12 个 wordHandlers 测试
- 全套测试：194 个测试全部通过

## File List

### 新增文件
- `src/background/handlers/wordHandlers.ts` - 复习词汇处理器
- `src/background/handlers/wordHandlers.test.ts` - 处理器单元测试

### 修改文件
- `src/shared/utils/ebbinghaus.ts` - 添加 MAX_REVIEW_COUNT，修复最大间隔限制
- `src/shared/utils/ebbinghaus.test.ts` - 更新测试用例符合 AC3
- `src/shared/messaging/types.ts` - 添加 REVIEW_WORD 消息类型
- `src/background/index.ts` - 注册 REVIEW_WORD 处理器

## Change Log

| 日期 | 变更内容 | AC 覆盖 |
|------|----------|---------|
| 2026-01-11 | 修复 calculateNextReview 最大间隔限制 | AC3 |
| 2026-01-11 | 添加 MAX_REVIEW_COUNT 常量 | AC3 |
| 2026-01-11 | 添加 REVIEW_WORD 消息类型及类型定义 | AC1, AC2 |
| 2026-01-11 | 创建 handleReviewWord 处理器 | AC1, AC2, AC3 |
| 2026-01-11 | 在 Service Worker 注册处理器 | AC1, AC2 |
| 2026-01-11 | 集成异步 Badge 更新 | AC1, AC2 |
| 2026-01-11 | 编写单元测试和集成测试 | AC1, AC2, AC3 |
