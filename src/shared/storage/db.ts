/**
 * LingoRecall AI - IndexedDB Database Layer
 * Story 2.1 实现 - AC3: 自动创建数据库
 *
 * 数据库名称: LingoRecallDB
 * 版本: 1
 * Object Stores: words, tags
 *
 * @module shared/storage/db
 */

// ============================================================
// Database Configuration
// ============================================================

export const DB_NAME = 'LingoRecallDB';
export const DB_VERSION = 1;

export const STORES = {
  words: 'words',
  tags: 'tags',
} as const;

export const INDEXES = {
  byCreatedAt: 'byCreatedAt',
  byNextReviewAt: 'byNextReviewAt',
  byTagId: 'byTagId',
  bySourceUrl: 'bySourceUrl',
} as const;

// ============================================================
// Database Singleton
// ============================================================

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * 获取数据库实例（单例模式）
 * 首次调用时自动创建数据库和 Object Stores
 *
 * @returns Promise<IDBDatabase> 数据库实例
 */
export async function getDatabase(): Promise<IDBDatabase> {
  // 如果已有实例，直接返回
  if (dbInstance && dbInstance.name) {
    return dbInstance;
  }

  // 如果正在初始化，等待初始化完成
  if (dbInitPromise) {
    return dbInitPromise;
  }

  // 开始初始化
  dbInitPromise = initDatabase();

  try {
    dbInstance = await dbInitPromise;
    return dbInstance;
  } catch (error) {
    dbInitPromise = null;
    throw error;
  }
}

/**
 * 初始化数据库
 * 创建 IndexedDB 数据库和所有必需的 Object Stores
 *
 * @returns Promise<IDBDatabase> 数据库实例
 */
function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    console.log(`[LingoRecall] Opening database: ${DB_NAME} v${DB_VERSION}`);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // 数据库打开错误
    request.onerror = () => {
      console.error('[LingoRecall] Database open error:', request.error);
      reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`));
    };

    // 数据库打开成功
    request.onsuccess = () => {
      console.log('[LingoRecall] Database opened successfully');
      const db = request.result;

      // 监听数据库关闭事件
      db.onclose = () => {
        console.log('[LingoRecall] Database connection closed');
        dbInstance = null;
        dbInitPromise = null;
      };

      // 监听版本变更事件
      db.onversionchange = () => {
        console.log('[LingoRecall] Database version change detected, closing connection');
        db.close();
        dbInstance = null;
        dbInitPromise = null;
      };

      resolve(db);
    };

    // 数据库升级（首次创建或版本升级）
    request.onupgradeneeded = (event) => {
      console.log('[LingoRecall] Database upgrade needed');
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建 words Object Store
      if (!db.objectStoreNames.contains(STORES.words)) {
        console.log('[LingoRecall] Creating words Object Store');
        const wordsStore = db.createObjectStore(STORES.words, { keyPath: 'id' });

        // 创建索引
        // byCreatedAt: 按创建时间查询，用于列表排序
        wordsStore.createIndex(INDEXES.byCreatedAt, 'createdAt', { unique: false });

        // byNextReviewAt: 按下次复习时间查询，用于复习调度
        wordsStore.createIndex(INDEXES.byNextReviewAt, 'nextReviewAt', { unique: false });

        // byTagId: 按标签查询，multiEntry 支持数组中每个元素都作为索引键
        wordsStore.createIndex(INDEXES.byTagId, 'tagIds', { unique: false, multiEntry: true });

        // bySourceUrl: 按来源 URL 查询，用于重复检测和跳回原文
        wordsStore.createIndex(INDEXES.bySourceUrl, 'sourceUrl', { unique: false });

        console.log('[LingoRecall] Words Object Store created with indexes');
      }

      // 创建 tags Object Store
      if (!db.objectStoreNames.contains(STORES.tags)) {
        console.log('[LingoRecall] Creating tags Object Store');
        db.createObjectStore(STORES.tags, { keyPath: 'id' });
        console.log('[LingoRecall] Tags Object Store created');
      }
    };

    // 阻塞事件（其他标签页正在使用旧版本）
    request.onblocked = () => {
      console.warn('[LingoRecall] Database upgrade blocked by another connection');
      reject(new Error('Database upgrade blocked. Please close other tabs using this extension.'));
    };
  });
}

/**
 * 关闭数据库连接
 * 主要用于测试清理
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbInitPromise = null;
    console.log('[LingoRecall] Database connection closed manually');
  }
}

/**
 * 删除数据库
 * 仅用于测试或重置
 *
 * @returns Promise<void>
 */
export function deleteDatabase(): Promise<void> {
  closeDatabase();

  return new Promise((resolve, reject) => {
    console.log('[LingoRecall] Deleting database:', DB_NAME);
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onerror = () => {
      console.error('[LingoRecall] Database deletion error:', request.error);
      reject(new Error(`Failed to delete database: ${request.error?.message || 'Unknown error'}`));
    };

    request.onsuccess = () => {
      console.log('[LingoRecall] Database deleted successfully');
      resolve();
    };

    request.onblocked = () => {
      console.warn('[LingoRecall] Database deletion blocked');
      reject(new Error('Database deletion blocked. Please close all tabs using this extension.'));
    };
  });
}

/**
 * 检查数据库是否已初始化
 *
 * @returns boolean
 */
export function isDatabaseInitialized(): boolean {
  return dbInstance !== null;
}

/**
 * 执行事务操作的辅助函数
 *
 * @param storeName Object Store 名称
 * @param mode 事务模式
 * @param operation 操作函数
 * @returns Promise<T> 操作结果
 */
export async function withTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 执行游标遍历操作
 *
 * @param storeName Object Store 名称
 * @param indexName 索引名称（可选）
 * @param direction 游标方向
 * @param callback 每条记录的回调
 * @returns Promise<void>
 */
export async function withCursor<T>(
  storeName: string,
  indexName: string | null,
  direction: IDBCursorDirection,
  callback: (value: T, cursor: IDBCursorWithValue) => boolean | void
): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const source = indexName ? store.index(indexName) : store;

    const request = source.openCursor(null, direction);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const shouldContinue = callback(cursor.value as T, cursor);
        if (shouldContinue !== false) {
          cursor.continue();
        }
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================
// Story 3.1: 待复习词汇查询
// ============================================================

/**
 * 统计待复习词汇数量
 * Story 3.1 - AC2: 查询所有 `nextReviewAt <= 当前时间` 的词汇
 *
 * 使用 byNextReviewAt 索引进行范围查询
 *
 * @returns Promise<number> 待复习词汇数量
 */
export async function countDueWords(): Promise<number> {
  const db = await getDatabase();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.words, 'readonly');
    const store = tx.objectStore(STORES.words);
    const index = store.index(INDEXES.byNextReviewAt);

    // 使用 upperBound 查询所有 nextReviewAt <= now 的记录
    const range = IDBKeyRange.upperBound(now);

    let count = 0;
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        count++;
        cursor.continue();
      } else {
        resolve(count);
      }
    };

    request.onerror = () => {
      console.error('[LingoRecall] countDueWords error:', request.error);
      reject(request.error);
    };

    tx.onerror = () => {
      console.error('[LingoRecall] countDueWords transaction error:', tx.error);
      reject(tx.error);
    };
  });
}

// ============================================================
// Story 3.3: 获取待复习词汇列表
// ============================================================

/**
 * 获取待复习词汇列表
 * Story 3.3 - AC1: 获取所有 `nextReviewAt <= 当前时间` 的词汇记录
 *
 * 使用 byNextReviewAt 索引进行范围查询，按 nextReviewAt 升序排列
 *
 * @param limit 可选的数量限制
 * @returns Promise<WordRecord[]> 待复习词汇列表
 */
export async function getDueWords(limit?: number): Promise<import('../messaging/types').WordRecord[]> {
  const db = await getDatabase();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.words, 'readonly');
    const store = tx.objectStore(STORES.words);
    const index = store.index(INDEXES.byNextReviewAt);

    // 使用 upperBound 查询所有 nextReviewAt <= now 的记录
    const range = IDBKeyRange.upperBound(now);
    const words: import('../messaging/types').WordRecord[] = [];

    // 按 nextReviewAt 升序（最先到期的排在前面）
    const request = index.openCursor(range, 'next');

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        words.push(cursor.value as import('../messaging/types').WordRecord);

        // 检查是否达到限制
        if (limit && words.length >= limit) {
          resolve(words);
          return;
        }

        cursor.continue();
      } else {
        resolve(words);
      }
    };

    request.onerror = () => {
      console.error('[LingoRecall] getDueWords error:', request.error);
      reject(request.error);
    };

    tx.onerror = () => {
      console.error('[LingoRecall] getDueWords transaction error:', tx.error);
      reject(tx.error);
    };
  });
}
