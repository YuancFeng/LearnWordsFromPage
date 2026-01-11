# Story 3.1: 复习时间自动计算

Status: done

## Story

**As a** 语言学习者,
**I want to** 系统自动为我保存的词汇计算下次复习时间,
**So that** 我不需要手动记录，能按科学的记忆曲线进行复习。

## Acceptance Criteria

### AC1: 新词汇初始化复习参数
**Given** 用户保存了一个新词汇
**When** 词汇成功存入数据库
**Then** 系统自动设置:
- `nextReviewAt` 为当前时间 + 1 天 (86400000ms)
- `reviewCount` 初始化为 0
- `interval` 设置为 1

### AC2: 定时检查待复习词汇
**Given** 后台 Service Worker 正在运行
**When** 每小时触发一次定时检查 (chrome.alarms)
**Then** 系统查询所有 `nextReviewAt <= 当前时间` 的词汇
**And** 更新 Badge 显示待复习数量

### AC3: 复习间隔配置
**Given** 系统使用的复习间隔配置
**When** 查看间隔配置
**Then** 间隔序列为 `[1, 3, 7, 15, 30, 60, 120]` 天

## Tasks / Subtasks

### Task 1: 定义艾宾浩斯常量和类型 (AC: #3)
- [x] 1.1 在 `src/shared/utils/ebbinghaus.ts` 创建文件
- [x] 1.2 定义复习间隔常量 `REVIEW_INTERVALS`
- [x] 1.3 定义 `ReviewResult` 类型 ('remembered' | 'forgotten')
- [x] 1.4 导出常量供其他模块使用

### Task 2: 实现复习时间计算函数 (AC: #1, #3)
- [x] 2.1 实现 `initializeReviewParams()` 函数 - 新词汇初始化
- [x] 2.2 实现 `calculateNextReview(reviewCount, quality)` 函数
- [x] 2.3 确保最大间隔限制为 120 天
- [x] 2.4 编写单元测试覆盖所有计算场景

### Task 3: 更新词汇保存逻辑 (AC: #1)
- [x] 3.1 修改 `src/shared/storage/wordService.ts` 的 `saveWord` 函数（实际保存位置）
- [x] 3.2 在保存时调用 `initializeReviewParams()` 设置复习字段
- [x] 3.3 确保 `createdAt`, `nextReviewAt`, `reviewCount`, `interval` 正确初始化

### Task 4: 实现 chrome.alarms 定时检查 (AC: #2)
- [x] 4.1 在 `src/background/alarms.ts` 创建 Alarm 注册函数
- [x] 4.2 创建 `REVIEW_CHECK_ALARM` 名称，间隔 60 分钟
- [x] 4.3 实现 `onAlarm` 监听器
- [x] 4.4 在 `src/background/index.ts` 注册 Alarm

### Task 5: 实现待复习词汇查询 (AC: #2)
- [x] 5.1 在 `src/shared/storage/db.ts` 添加 `countDueWords()` 函数
- [x] 5.2 使用 `byNextReviewAt` 索引查询 `nextReviewAt <= Date.now()` 的记录
- [x] 5.3 返回待复习词汇数量

### Task 6: 集成测试 (AC: #1, #2, #3)
- [x] 6.1 测试新词汇保存后复习参数正确初始化
- [x] 6.2 测试 Alarm 触发后正确查询待复习数量
- [x] 6.3 测试边界情况：无词汇、大量词汇

## Dev Notes

### 技术要求

**艾宾浩斯间隔常量:**
```typescript
// src/shared/utils/ebbinghaus.ts
export const REVIEW_INTERVALS = [1, 3, 7, 15, 30, 60, 120]; // 天数

// 一天的毫秒数
export const DAY_MS = 24 * 60 * 60 * 1000; // 86400000
```

**chrome.alarms API 规范:**
- Manifest V3 中 Service Worker 会被挂起，使用 `chrome.alarms` 保持定时任务
- 最小间隔：1 分钟（开发环境）/ 生产环境建议 60 分钟
- Alarm 名称必须唯一，使用常量定义

**IndexedDB 索引查询:**
```typescript
// 使用 byNextReviewAt 索引进行范围查询
const range = IDBKeyRange.upperBound(Date.now());
const cursor = store.index('byNextReviewAt').openCursor(range);
```

### 文件结构

**需要创建的文件:**
```
src/shared/utils/ebbinghaus.ts      # 艾宾浩斯算法
src/background/alarms.ts            # Alarm 管理
```

**需要修改的文件:**
```
src/background/index.ts             # 注册 Alarm 监听
src/background/handlers/wordHandlers.ts  # 保存时初始化复习参数
src/shared/storage/db.ts            # 添加 countDueWords 函数
```

### 关键代码模式

**复习参数初始化:**
```typescript
export function initializeReviewParams(): Pick<WordRecord, 'nextReviewAt' | 'reviewCount' | 'interval'> {
  return {
    nextReviewAt: Date.now() + REVIEW_INTERVALS[0] * DAY_MS,
    reviewCount: 0,
    interval: REVIEW_INTERVALS[0],
  };
}
```

**Alarm 注册:**
```typescript
// src/background/alarms.ts
export const REVIEW_CHECK_ALARM = 'reviewCheck';

export async function setupReviewAlarm(): Promise<void> {
  // 清除旧 Alarm（如果存在）
  await chrome.alarms.clear(REVIEW_CHECK_ALARM);

  // 创建新 Alarm，每 60 分钟触发
  chrome.alarms.create(REVIEW_CHECK_ALARM, {
    periodInMinutes: 60,
    delayInMinutes: 1  // 首次延迟 1 分钟触发
  });
}

export function handleReviewAlarm(alarm: chrome.alarms.Alarm): void {
  if (alarm.name === REVIEW_CHECK_ALARM) {
    checkAndUpdateBadge();
  }
}
```

**待复习词汇计数:**
```typescript
// src/shared/storage/db.ts
export async function countDueWords(): Promise<number> {
  const db = await openDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readonly');
    const store = tx.objectStore('words');
    const index = store.index('byNextReviewAt');
    const range = IDBKeyRange.upperBound(now);

    let count = 0;
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        count++;
        cursor.continue();
      } else {
        resolve(count);
      }
    };

    request.onerror = () => reject(request.error);
  });
}
```

### 测试用例

```typescript
// src/shared/utils/ebbinghaus.test.ts
describe('ebbinghaus', () => {
  describe('initializeReviewParams', () => {
    it('should set nextReviewAt to 1 day from now', () => {
      const now = Date.now();
      const params = initializeReviewParams();
      expect(params.nextReviewAt).toBeCloseTo(now + DAY_MS, -3);
    });

    it('should initialize reviewCount to 0', () => {
      const params = initializeReviewParams();
      expect(params.reviewCount).toBe(0);
    });

    it('should set interval to 1', () => {
      const params = initializeReviewParams();
      expect(params.interval).toBe(1);
    });
  });
});
```

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` - Decision 5.2: 艾宾浩斯复习调度
- PRD: `_bmad-output/planning-artifacts/prd.md` - Section 3.3 Epic 3: 艾宾浩斯复习
- Project Context: `_bmad-output/planning-artifacts/project-context.md` - 复习间隔常量和计算公式
- Chrome Alarms API: https://developer.chrome.com/docs/extensions/reference/api/alarms

### Dependencies

- Story 2.1 (保存词汇到本地数据库) 必须完成
- IndexedDB `byNextReviewAt` 索引必须已创建

### Estimated Effort

- 开发: 3-4 小时
- 测试: 1-2 小时

## Dev Agent Record

### Implementation Plan

实现艾宾浩斯复习时间自动计算功能：
1. 创建 `ebbinghaus.ts` 定义复习间隔常量和计算函数
2. 修改 `wordService.ts` 使用 `initializeReviewParams()` 初始化新词汇
3. 创建 `alarms.ts` 实现 chrome.alarms 定时检查
4. 在 `db.ts` 添加 `countDueWords()` 查询待复习词汇
5. 在 `background/index.ts` 注册 Alarm 监听器

### Debug Log

无重大问题。所有测试按预期通过。

### Completion Notes

✅ Story 3.1 实现完成

**实现内容:**
- 艾宾浩斯复习间隔序列: `[1, 3, 7, 15, 30, 60, 120]` 天
- 新词汇自动初始化 `nextReviewAt` = 当前时间 + 1 天
- `reviewCount` 初始化为 0, `interval` 设置为 1
- chrome.alarms 每 60 分钟触发检查
- Badge 显示待复习词汇数量 (最大 99+)
- `countDueWords()` 使用 `byNextReviewAt` 索引高效查询

**测试覆盖:**
- 单元测试: 16 tests (ebbinghaus.test.ts)
- Alarms 测试: 13 tests (alarms.test.ts)
- WordService 测试: 11 tests (wordService.test.ts)
- 集成测试: 12 tests (ebbinghaus.integration.test.ts)
- 总计: **52 tests**, 全部通过 ✅

## File List

### 新增文件
- `src/shared/utils/ebbinghaus.ts` - 艾宾浩斯算法常量和函数
- `src/shared/utils/ebbinghaus.test.ts` - 艾宾浩斯算法单元测试
- `src/shared/utils/ebbinghaus.integration.test.ts` - 集成测试
- `src/background/alarms.ts` - chrome.alarms 定时检查
- `src/background/alarms.test.ts` - Alarms 单元测试

### 修改文件
- `src/shared/storage/wordService.ts` - 使用 initializeReviewParams() 初始化复习参数
- `src/shared/storage/db.ts` - 添加 countDueWords() 函数
- `src/background/index.ts` - 注册 Alarm 监听器和 Badge 更新

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Story 3.1 实现完成 - 艾宾浩斯复习时间自动计算 | Dev Agent (Amelia) |
