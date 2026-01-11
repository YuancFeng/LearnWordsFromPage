/**
 * LingoRecall AI - Tag Storage Layer
 * Story 4.4 - Task 2: Tag CRUD 操作
 *
 * 提供标签的创建、读取、更新、删除功能
 * 删除标签时会级联更新关联的词汇
 *
 * @module shared/storage/tagStore
 */

import { getDatabase, STORES } from './db';
import type { Response } from '../messaging/types';
import type { Tag, CreateTagInput, UpdateTagInput } from '../types/tag';
import {
  isValidTagName,
  isValidHexColor,
  normalizeTagName,
  DEFAULT_TAG_COLOR,
} from '../types/tag';
import { ErrorCode } from '../types/errors';

// ============================================================
// Create Tag
// ============================================================

/**
 * 创建新标签
 * Story 4.4 - AC1: 创建标签并保存到 IndexedDB
 *
 * @param input - 标签输入（name, color）
 * @returns Promise<Response<Tag>> 创建的标签
 *
 * @example
 * const result = await createTag({ name: '学术', color: '#3B82F6' });
 * if (result.success) {
 *   console.log('Created tag:', result.data);
 * }
 */
export async function createTag(input: CreateTagInput): Promise<Response<Tag>> {
  // 验证输入
  const name = normalizeTagName(input.name);
  if (!isValidTagName(name)) {
    return {
      success: false,
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: '标签名称无效（1-20个字符）',
      },
    };
  }

  const color = input.color || DEFAULT_TAG_COLOR;
  if (!isValidHexColor(color)) {
    return {
      success: false,
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: '颜色格式无效（需要 HEX 格式）',
      },
    };
  }

  try {
    const db = await getDatabase();

    // 检查重复名称
    const existingTags = await getAllTagsInternal(db);
    const isDuplicate = existingTags.some(
      (tag) => tag.name.toLowerCase() === name.toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        error: {
          code: ErrorCode.DUPLICATE_TAG,
          message: '标签名称已存在',
        },
      };
    }

    // 创建新标签
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name,
      color,
      createdAt: Date.now(),
    };

    // 保存到 IndexedDB
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.tags, 'readwrite');
      const store = tx.objectStore(STORES.tags);
      const request = store.add(newTag);

      request.onsuccess = () => {
        console.log('[LingoRecall] Tag created:', newTag.name);
        resolve({ success: true, data: newTag });
      };

      request.onerror = () => {
        console.error('[LingoRecall] Failed to create tag:', request.error);
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: request.error?.message || '创建标签失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] createTag error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '创建标签失败',
      },
    };
  }
}

// ============================================================
// Read Tags
// ============================================================

/**
 * 内部方法：从数据库获取所有标签
 */
async function getAllTagsInternal(db: IDBDatabase): Promise<Tag[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.tags, 'readonly');
    const store = tx.objectStore(STORES.tags);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取所有标签
 * Story 4.4 - AC1: 获取标签列表
 *
 * @returns Promise<Response<Tag[]>> 标签列表（按创建时间降序）
 */
export async function getAllTags(): Promise<Response<Tag[]>> {
  try {
    const db = await getDatabase();
    const tags = await getAllTagsInternal(db);

    // 按创建时间降序排序（最新的在前）
    tags.sort((a, b) => b.createdAt - a.createdAt);

    return { success: true, data: tags };
  } catch (error) {
    console.error('[LingoRecall] getAllTags error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '获取标签失败',
      },
    };
  }
}

/**
 * 根据 ID 获取单个标签
 *
 * @param id - 标签 ID
 * @returns Promise<Response<Tag | null>> 标签或 null
 */
export async function getTagById(id: string): Promise<Response<Tag | null>> {
  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.tags, 'readonly');
      const store = tx.objectStore(STORES.tags);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve({ success: true, data: request.result || null });
      };

      request.onerror = () => {
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: request.error?.message || '获取标签失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] getTagById error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '获取标签失败',
      },
    };
  }
}

// ============================================================
// Update Tag
// ============================================================

/**
 * 更新标签
 * Story 4.4 - AC2: 编辑标签名称和颜色
 *
 * @param id - 标签 ID
 * @param updates - 要更新的字段
 * @returns Promise<Response<Tag>> 更新后的标签
 */
export async function updateTag(
  id: string,
  updates: UpdateTagInput
): Promise<Response<Tag>> {
  // 验证输入
  if (updates.name !== undefined) {
    const name = normalizeTagName(updates.name);
    if (!isValidTagName(name)) {
      return {
        success: false,
        error: {
          code: ErrorCode.INVALID_INPUT,
          message: '标签名称无效（1-20个字符）',
        },
      };
    }
    updates.name = name;
  }

  if (updates.color !== undefined && !isValidHexColor(updates.color)) {
    return {
      success: false,
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: '颜色格式无效（需要 HEX 格式）',
      },
    };
  }

  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.tags, 'readwrite');
      const store = tx.objectStore(STORES.tags);

      // 先获取现有标签
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result as Tag | undefined;

        if (!existing) {
          resolve({
            success: false,
            error: {
              code: ErrorCode.NOT_FOUND,
              message: '标签不存在',
            },
          });
          return;
        }

        // 检查名称重复（如果更新了名称）
        if (updates.name && updates.name.toLowerCase() !== existing.name.toLowerCase()) {
          const getAllRequest = store.getAll();

          getAllRequest.onsuccess = () => {
            const allTags = getAllRequest.result as Tag[];
            const isDuplicate = allTags.some(
              (tag) =>
                tag.id !== id &&
                tag.name.toLowerCase() === updates.name!.toLowerCase()
            );

            if (isDuplicate) {
              resolve({
                success: false,
                error: {
                  code: ErrorCode.DUPLICATE_TAG,
                  message: '标签名称已存在',
                },
              });
              return;
            }

            // 执行更新
            const updated: Tag = {
              ...existing,
              ...updates,
            };

            const putRequest = store.put(updated);

            putRequest.onsuccess = () => {
              console.log('[LingoRecall] Tag updated:', updated.name);
              resolve({ success: true, data: updated });
            };

            putRequest.onerror = () => {
              resolve({
                success: false,
                error: {
                  code: ErrorCode.STORAGE_ERROR,
                  message: putRequest.error?.message || '更新标签失败',
                },
              });
            };
          };
        } else {
          // 没有更新名称，直接更新
          const updated: Tag = {
            ...existing,
            ...updates,
          };

          const putRequest = store.put(updated);

          putRequest.onsuccess = () => {
            console.log('[LingoRecall] Tag updated:', updated.name);
            resolve({ success: true, data: updated });
          };

          putRequest.onerror = () => {
            resolve({
              success: false,
              error: {
                code: ErrorCode.STORAGE_ERROR,
                message: putRequest.error?.message || '更新标签失败',
              },
            });
          };
        }
      };

      getRequest.onerror = () => {
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: getRequest.error?.message || '获取标签失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] updateTag error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '更新标签失败',
      },
    };
  }
}

// ============================================================
// Delete Tag
// ============================================================

/**
 * 删除标签（带级联更新）
 * Story 4.4 - AC3: 删除标签时自动更新关联词汇的 tagIds
 *
 * 使用事务确保原子性：
 * 1. 删除 tags 表中的记录
 * 2. 更新所有关联词汇的 tagIds 数组
 *
 * @param id - 标签 ID
 * @returns Promise<Response<void>> 操作结果
 */
export async function deleteTag(id: string): Promise<Response<void>> {
  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      // 使用多表事务确保原子性
      const tx = db.transaction([STORES.tags, STORES.words], 'readwrite');
      const tagsStore = tx.objectStore(STORES.tags);
      const wordsStore = tx.objectStore(STORES.words);

      // 检查标签是否存在
      const getRequest = tagsStore.get(id);

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          resolve({
            success: false,
            error: {
              code: ErrorCode.NOT_FOUND,
              message: '标签不存在',
            },
          });
          return;
        }

        // 删除标签
        const deleteRequest = tagsStore.delete(id);

        deleteRequest.onsuccess = () => {
          // 级联更新：从所有词汇中移除此标签
          const tagIndex = wordsStore.index('byTagId');
          const cursorRequest = tagIndex.openCursor(IDBKeyRange.only(id));

          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const word = cursor.value;
              // 从 tagIds 数组中移除已删除的标签 ID
              word.tagIds = (word.tagIds || []).filter(
                (tagId: string) => tagId !== id
              );
              // 更新词汇记录
              wordsStore.put(word);
              cursor.continue();
            }
          };
        };

        deleteRequest.onerror = () => {
          resolve({
            success: false,
            error: {
              code: ErrorCode.STORAGE_ERROR,
              message: deleteRequest.error?.message || '删除标签失败',
            },
          });
        };
      };

      getRequest.onerror = () => {
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: getRequest.error?.message || '获取标签失败',
          },
        });
      };

      // 事务完成回调
      tx.oncomplete = () => {
        console.log('[LingoRecall] Tag deleted with cascade update:', id);
        resolve({ success: true });
      };

      tx.onerror = () => {
        console.error('[LingoRecall] Delete tag transaction error:', tx.error);
        resolve({
          success: false,
          error: {
            code: ErrorCode.STORAGE_ERROR,
            message: tx.error?.message || '删除标签事务失败',
          },
        });
      };
    });
  } catch (error) {
    console.error('[LingoRecall] deleteTag error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '删除标签失败',
      },
    };
  }
}

// ============================================================
// Batch Operations
// ============================================================

/**
 * 根据 ID 列表获取多个标签
 *
 * @param ids - 标签 ID 列表
 * @returns Promise<Response<Tag[]>> 标签列表
 */
export async function getTagsByIds(ids: string[]): Promise<Response<Tag[]>> {
  if (!ids || ids.length === 0) {
    return { success: true, data: [] };
  }

  try {
    const db = await getDatabase();
    const tags: Tag[] = [];

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.tags, 'readonly');
      const store = tx.objectStore(STORES.tags);

      let completed = 0;

      ids.forEach((id) => {
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result) {
            tags.push(request.result);
          }
          completed++;
          if (completed === ids.length) {
            resolve({ success: true, data: tags });
          }
        };

        request.onerror = () => {
          completed++;
          if (completed === ids.length) {
            resolve({ success: true, data: tags });
          }
        };
      });
    });
  } catch (error) {
    console.error('[LingoRecall] getTagsByIds error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '获取标签失败',
      },
    };
  }
}
