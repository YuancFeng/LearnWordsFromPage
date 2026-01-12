/**
 * LingoRecall AI - Tag Store Tests
 * Story 4.4 - Task 8: Tag CRUD 操作测试
 *
 * 测试标签的创建、读取、更新、删除功能
 * 包括级联删除逻辑
 *
 * @module shared/storage/tagStore.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
  getTagsByIds,
} from './tagStore';
import { getDatabase, deleteDatabase, STORES } from './db';
import { ErrorCode } from '../types/errors';
import type { Tag } from '../types/tag';

// ============================================================
// Test Setup
// ============================================================

describe('tagStore', () => {
  beforeEach(async () => {
    // 确保每个测试都有干净的数据库
    await deleteDatabase();
  });

  afterEach(async () => {
    // 清理测试后的数据库
    await deleteDatabase();
  });

  // ============================================================
  // createTag Tests - AC1
  // ============================================================

  describe('createTag - AC1', () => {
    it('应该成功创建标签', async () => {
      const result = await createTag({ name: '学术', color: '#3B82F6' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('学术');
      expect(result.data?.color).toBe('#3B82F6');
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeGreaterThan(0);
    });

    it('应该使用默认颜色当未提供颜色时', async () => {
      const result = await createTag({ name: 'Test', color: '' });

      expect(result.success).toBe(true);
      expect(result.data?.color).toBe('#3B82F6'); // DEFAULT_TAG_COLOR
    });

    it('应该规范化标签名称（去除首尾空白）', async () => {
      const result = await createTag({ name: '  测试  ', color: '#EF4444' });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('测试');
    });

    it('应该拒绝空标签名称', async () => {
      const result = await createTag({ name: '', color: '#3B82F6' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it('应该拒绝超长标签名称（>20字符）', async () => {
      const result = await createTag({
        name: 'a'.repeat(21),
        color: '#3B82F6',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it('应该拒绝无效的HEX颜色', async () => {
      const result = await createTag({ name: 'Test', color: 'red' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it('应该拒绝重复的标签名称（大小写不敏感）', async () => {
      await createTag({ name: 'Academic', color: '#3B82F6' });
      const result = await createTag({ name: 'ACADEMIC', color: '#EF4444' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.DUPLICATE_TAG);
    });

    it('应该生成唯一的UUID', async () => {
      const result1 = await createTag({ name: 'Tag1', color: '#3B82F6' });
      const result2 = await createTag({ name: 'Tag2', color: '#EF4444' });

      expect(result1.data?.id).not.toBe(result2.data?.id);
    });
  });

  // ============================================================
  // getAllTags Tests
  // ============================================================

  describe('getAllTags', () => {
    it('应该返回空数组当没有标签时', async () => {
      const result = await getAllTags();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('应该返回所有标签', async () => {
      await createTag({ name: 'Tag1', color: '#3B82F6' });
      await createTag({ name: 'Tag2', color: '#EF4444' });
      await createTag({ name: 'Tag3', color: '#22C55E' });

      const result = await getAllTags();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3);
    });

    it('应该按创建时间降序排序（最新的在前）', async () => {
      await createTag({ name: 'First', color: '#3B82F6' });
      await new Promise((resolve) => setTimeout(resolve, 10)); // 确保时间戳不同
      await createTag({ name: 'Second', color: '#EF4444' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createTag({ name: 'Third', color: '#22C55E' });

      const result = await getAllTags();

      expect(result.success).toBe(true);
      expect(result.data?.[0].name).toBe('Third');
      expect(result.data?.[1].name).toBe('Second');
      expect(result.data?.[2].name).toBe('First');
    });
  });

  // ============================================================
  // getTagById Tests
  // ============================================================

  describe('getTagById', () => {
    it('应该返回指定ID的标签', async () => {
      const created = await createTag({ name: 'Test', color: '#3B82F6' });
      const result = await getTagById(created.data!.id);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test');
    });

    it('应该返回null当标签不存在时', async () => {
      const result = await getTagById('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  // ============================================================
  // updateTag Tests - AC2
  // ============================================================

  describe('updateTag - AC2', () => {
    it('应该成功更新标签名称', async () => {
      const created = await createTag({ name: 'Old Name', color: '#3B82F6' });
      const result = await updateTag(created.data!.id, { name: 'New Name' });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('New Name');
      expect(result.data?.color).toBe('#3B82F6'); // 颜色不变
    });

    it('应该成功更新标签颜色', async () => {
      const created = await createTag({ name: 'Test', color: '#3B82F6' });
      const result = await updateTag(created.data!.id, { color: '#EF4444' });

      expect(result.success).toBe(true);
      expect(result.data?.color).toBe('#EF4444');
      expect(result.data?.name).toBe('Test'); // 名称不变
    });

    it('应该同时更新名称和颜色', async () => {
      const created = await createTag({ name: 'Old', color: '#3B82F6' });
      const result = await updateTag(created.data!.id, {
        name: 'New',
        color: '#EF4444',
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('New');
      expect(result.data?.color).toBe('#EF4444');
    });

    it('应该返回错误当标签不存在时', async () => {
      const result = await updateTag('non-existent-id', { name: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.NOT_FOUND);
    });

    it('应该拒绝无效的标签名称', async () => {
      const created = await createTag({ name: 'Test', color: '#3B82F6' });
      const result = await updateTag(created.data!.id, { name: '' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it('应该拒绝无效的颜色', async () => {
      const created = await createTag({ name: 'Test', color: '#3B82F6' });
      const result = await updateTag(created.data!.id, { color: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it('应该拒绝与其他标签重复的名称', async () => {
      await createTag({ name: 'Existing', color: '#3B82F6' });
      const created = await createTag({ name: 'Test', color: '#EF4444' });

      const result = await updateTag(created.data!.id, { name: 'Existing' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.DUPLICATE_TAG);
    });

    it('应该允许更新为相同的名称（自己）', async () => {
      const created = await createTag({ name: 'Test', color: '#3B82F6' });
      const result = await updateTag(created.data!.id, { name: 'Test' });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test');
    });
  });

  // ============================================================
  // deleteTag Tests - AC3
  // ============================================================

  describe('deleteTag - AC3', () => {
    it('应该成功删除标签', async () => {
      const created = await createTag({ name: 'Test', color: '#3B82F6' });
      const result = await deleteTag(created.data!.id);

      expect(result.success).toBe(true);

      // 验证标签已被删除
      const getResult = await getTagById(created.data!.id);
      expect(getResult.data).toBeNull();
    });

    it('应该返回错误当标签不存在时', async () => {
      const result = await deleteTag('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.NOT_FOUND);
    });

    it('应该级联更新关联词汇的tagIds', async () => {
      // 创建标签
      const tag = await createTag({ name: 'Test', color: '#3B82F6' });
      const tagId = tag.data!.id;

      // 创建关联此标签的词汇
      const db = await getDatabase();
      const word = {
        id: 'word-1',
        word: 'hello',
        context: 'Hello world',
        tagIds: [tagId, 'other-tag'],
        createdAt: Date.now(),
        nextReviewAt: Date.now() + 86400000,
        reviewCount: 0,
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.words, 'readwrite');
        const store = tx.objectStore(STORES.words);
        const request = store.add(word);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // 删除标签
      const result = await deleteTag(tagId);
      expect(result.success).toBe(true);

      // 验证词汇的 tagIds 已更新
      const updatedWord = await new Promise<typeof word>((resolve, reject) => {
        const tx = db.transaction(STORES.words, 'readonly');
        const store = tx.objectStore(STORES.words);
        const request = store.get('word-1');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      expect(updatedWord.tagIds).not.toContain(tagId);
      expect(updatedWord.tagIds).toContain('other-tag');
    });
  });

  // ============================================================
  // getTagsByIds Tests
  // ============================================================

  describe('getTagsByIds', () => {
    it('应该返回空数组当传入空ID列表时', async () => {
      const result = await getTagsByIds([]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('应该返回匹配的标签', async () => {
      const tag1 = await createTag({ name: 'Tag1', color: '#3B82F6' });
      const tag2 = await createTag({ name: 'Tag2', color: '#EF4444' });
      await createTag({ name: 'Tag3', color: '#22C55E' }); // 不请求此标签

      const result = await getTagsByIds([tag1.data!.id, tag2.data!.id]);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.map((t) => t.name)).toContain('Tag1');
      expect(result.data?.map((t) => t.name)).toContain('Tag2');
    });

    it('应该忽略不存在的ID', async () => {
      const tag = await createTag({ name: 'Test', color: '#3B82F6' });

      const result = await getTagsByIds([tag.data!.id, 'non-existent-id']);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].name).toBe('Test');
    });
  });
});
