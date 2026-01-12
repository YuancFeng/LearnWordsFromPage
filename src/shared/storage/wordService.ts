/**
 * LingoRecall AI - Word Service
 * Story 2.1 实现 - AC1: 保存词汇, AC2: 重复检测
 *
 * 提供词汇的 CRUD 操作
 *
 * @module shared/storage/wordService
 */

import { getDatabase, STORES, INDEXES } from './db';
import type { Response } from '../messaging/types';
import type { WordRecord, SaveWordPayload } from '../messaging/types';
import { ErrorCode } from '../types/errors';
import { initializeReviewParams } from '../utils/ebbinghaus';

// ============================================================
// Constants
// ============================================================

/** 默认 SM-2 难度因子 */
const DEFAULT_EASE_FACTOR = 2.5;

// ============================================================
// Word Record Operations
// ============================================================

/**
 * 保存词汇到数据库
 * Story 2.1 - AC1 实现
 *
 * @param wordData 词汇数据（不包含自动生成的字段）
 * @returns Promise<Response<{ id: string }>> 保存结果
 */
export async function saveWord(
  wordData: SaveWordPayload
): Promise<Response<{ id: string }>> {
  try {
    const db = await getDatabase();

    // 生成完整的词汇记录
    // Story 3.1 - 使用艾宾浩斯算法初始化复习参数
    const reviewParams = initializeReviewParams();
    const word: WordRecord = {
      ...wordData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      nextReviewAt: reviewParams.nextReviewAt,
      reviewCount: reviewParams.reviewCount,
      easeFactor: DEFAULT_EASE_FACTOR,
      interval: reviewParams.interval,
      tagIds: [], // 初始化为空数组
    };

    return new Promise((resolve) => {
      let resolved = false;
      const finalize = (response: Response<{ id: string }>) => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve(response);
      };

      const tx = db.transaction(STORES.words, 'readwrite');
      const store = tx.objectStore(STORES.words);
      const index = store.index(INDEXES.bySourceUrl);

      const cursorRequest = index.openCursor(IDBKeyRange.only(wordData.sourceUrl));

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const existing = cursor.value as WordRecord;
          if (existing.text === wordData.text && existing.xpath === wordData.xpath) {
            finalize({
              success: false,
              error: {
                code: ErrorCode.DUPLICATE_WORD,
                message: '该词汇已保存',
              },
            });
            return;
          }

          cursor.continue();
          return;
        }

        const request = store.add(word);

        request.onsuccess = () => {
          console.log('[LingoRecall] Word saved successfully:', word.id);
          finalize({
            success: true,
            data: { id: word.id },
          });
        };

        request.onerror = () => {
          console.error('[LingoRecall] Failed to save word:', request.error);
          finalize({
            success: false,
            error: {
              code: ErrorCode.STORAGE_ERROR,
              message: request.error?.message || '保存失败',
            },
          });
        };
      };

      cursorRequest.onerror = () => {
        console.error('[LingoRecall] findDuplicateWord error:', cursorRequest.error);
        finalize({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: cursorRequest.error?.message || '保存失败',
          },
        });
      };

      tx.onerror = () => {
        if (resolved) {
          return;
        }
        console.error('[LingoRecall] Transaction error:', tx.error);
        finalize({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: tx.error?.message || '事务失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] saveWord error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
}

/**
 * 查找重复词汇
 * Story 2.1 - AC2 实现
 *
 * 判断依据: 相同 text + 相同 sourceUrl + 相同 xpath
 *
 * @param text 词汇文本
 * @param sourceUrl 来源 URL
 * @param xpath XPath 定位
 * @returns Promise<WordRecord | null> 找到的重复词汇或 null
 */
export async function findDuplicateWord(
  text: string,
  sourceUrl: string,
  xpath: string
): Promise<WordRecord | null> {
  try {
    const db = await getDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.words, 'readonly');
      const store = tx.objectStore(STORES.words);
      const index = store.index(INDEXES.bySourceUrl);

      // 先通过 sourceUrl 索引缩小范围
      const request = index.openCursor(IDBKeyRange.only(sourceUrl));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const word = cursor.value as WordRecord;

          // 检查是否完全匹配
          if (word.text === text && word.xpath === xpath) {
            resolve(word);
            return;
          }

          cursor.continue();
        } else {
          // 遍历完成，没有找到重复
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[LingoRecall] findDuplicateWord error:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[LingoRecall] findDuplicateWord error:', error);
    return null;
  }
}

/**
 * 获取所有词汇
 * Story 2.2 会用到
 *
 * @param options 查询选项
 * @returns Promise<Response<WordRecord[]>> 词汇列表
 */
export async function getAllWords(options?: {
  sortBy?: 'createdAt' | 'text' | 'nextReviewAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<Response<WordRecord[]>> {
  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.words, 'readonly');
      const store = tx.objectStore(STORES.words);

      // 根据排序字段选择索引
      const sortBy = options?.sortBy || 'createdAt';
      const sortOrder = options?.sortOrder || 'desc';
      const direction: IDBCursorDirection = sortOrder === 'asc' ? 'next' : 'prev';

      let source: IDBObjectStore | IDBIndex = store;
      if (sortBy === 'createdAt') {
        source = store.index(INDEXES.byCreatedAt);
      } else if (sortBy === 'nextReviewAt') {
        source = store.index(INDEXES.byNextReviewAt);
      }

      const words: WordRecord[] = [];
      const offset = options?.offset || 0;
      const limit = options?.limit;
      let skipped = 0;

      const request = source.openCursor(null, direction);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          // 跳过 offset 条记录
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }

          words.push(cursor.value as WordRecord);

          // 检查是否达到 limit
          if (limit && words.length >= limit) {
            resolve({ success: true, data: words });
            return;
          }

          cursor.continue();
        } else {
          // 遍历完成
          resolve({ success: true, data: words });
        }
      };

      request.onerror = () => {
        console.error('[LingoRecall] getAllWords error:', request.error);
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: request.error?.message || '查询失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] getAllWords error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
}

/**
 * 根据 ID 获取词汇
 *
 * @param id 词汇 ID
 * @returns Promise<Response<WordRecord | null>> 词汇记录
 */
export async function getWordById(id: string): Promise<Response<WordRecord | null>> {
  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.words, 'readonly');
      const store = tx.objectStore(STORES.words);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve({
          success: true,
          data: request.result as WordRecord | null,
        });
      };

      request.onerror = () => {
        console.error('[LingoRecall] getWordById error:', request.error);
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: request.error?.message || '查询失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] getWordById error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
}

/**
 * 更新词汇
 *
 * @param id 词汇 ID
 * @param updates 更新字段
 * @returns Promise<Response<void>> 更新结果
 */
export async function updateWord(
  id: string,
  updates: Partial<Omit<WordRecord, 'id' | 'createdAt'>>
): Promise<Response<void>> {
  try {
    const db = await getDatabase();

    // 先获取现有记录
    const existing = await getWordById(id);
    if (!existing.success || !existing.data) {
      return {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: '词汇不存在',
        },
      };
    }

    // 合并更新
    const updated: WordRecord = {
      ...existing.data,
      ...updates,
      id: existing.data.id, // 确保 id 不被覆盖
      createdAt: existing.data.createdAt, // 确保 createdAt 不被覆盖
    };

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.words, 'readwrite');
      const store = tx.objectStore(STORES.words);
      const request = store.put(updated);

      request.onsuccess = () => {
        console.log('[LingoRecall] Word updated:', id);
        resolve({ success: true });
      };

      request.onerror = () => {
        console.error('[LingoRecall] updateWord error:', request.error);
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: request.error?.message || '更新失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] updateWord error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
}

/**
 * 删除词汇
 * Story 2.2 - AC4 会用到
 *
 * @param id 词汇 ID
 * @returns Promise<Response<void>> 删除结果
 */
export async function deleteWord(id: string): Promise<Response<void>> {
  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.words, 'readwrite');
      const store = tx.objectStore(STORES.words);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[LingoRecall] Word deleted:', id);
        resolve({ success: true });
      };

      request.onerror = () => {
        console.error('[LingoRecall] deleteWord error:', request.error);
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: request.error?.message || '删除失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] deleteWord error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
}

/**
 * 获取词汇总数
 *
 * @returns Promise<Response<number>> 词汇总数
 */
export async function getWordCount(): Promise<Response<number>> {
  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.words, 'readonly');
      const store = tx.objectStore(STORES.words);
      const request = store.count();

      request.onsuccess = () => {
        resolve({
          success: true,
          data: request.result,
        });
      };

      request.onerror = () => {
        console.error('[LingoRecall] getWordCount error:', request.error);
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: request.error?.message || '查询失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] getWordCount error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
}

/**
 * 搜索词汇
 * Story 2.5 会用到
 *
 * @param query 搜索关键词
 * @param options 搜索选项
 * @returns Promise<Response<{ words: WordRecord[]; matchCount: number; totalCount: number }>>
 */
export async function searchWords(
  query: string,
  options?: {
    sortBy?: 'createdAt' | 'text';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<Response<{ words: WordRecord[]; matchCount: number; totalCount: number }>> {
  try {
    // 获取所有词汇
    const result = await getAllWords();
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
      };
    }

    const allWords = result.data;
    const totalCount = allWords.length;

    // 过滤匹配的词汇
    const normalizedQuery = query.toLowerCase().trim();
    const matchingWords = normalizedQuery
      ? allWords.filter(
          (word) =>
            word.text.toLowerCase().includes(normalizedQuery) ||
            word.meaning.toLowerCase().includes(normalizedQuery)
        )
      : allWords;

    // 排序
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';

    matchingWords.sort((a, b) => {
      if (sortBy === 'text') {
        return sortOrder === 'asc'
          ? a.text.localeCompare(b.text)
          : b.text.localeCompare(a.text);
      }
      // createdAt
      return sortOrder === 'asc'
        ? a.createdAt - b.createdAt
        : b.createdAt - a.createdAt;
    });

    return {
      success: true,
      data: {
        words: matchingWords,
        matchCount: matchingWords.length,
        totalCount,
      },
    };
  } catch (error) {
    console.error('[LingoRecall] searchWords error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
}
