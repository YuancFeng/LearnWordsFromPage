import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { getDatabase, deleteDatabase, closeDatabase, STORES, INDEXES } from './db';
import { saveWord, getWordById, getWordCount, searchWords, getAllWords } from './wordService';
import { ErrorCode } from '../types/errors';
import type { SaveWordPayload } from '../messaging/types';

const BASE_PAYLOAD: SaveWordPayload = {
  text: 'context',
  meaning: '语境',
  pronunciation: '/ˈkɒn.tekst/',
  partOfSpeech: 'noun',
  exampleSentence: 'This is a context example sentence.',
  sourceUrl: 'https://example.com/article',
  sourceTitle: 'Example Article',
  xpath: '/html/body/div[1]/p[2]',
  textOffset: 15,
  contextBefore: 'This is a ',
  contextAfter: ' example sentence.',
};

describe('wordService', () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  afterEach(() => {
    closeDatabase();
    vi.restoreAllMocks();
  });

  it('creates required object stores and indexes', async () => {
    const db = await getDatabase();
    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining([STORES.words, STORES.tags])
    );

    const tx = db.transaction(STORES.words, 'readonly');
    const store = tx.objectStore(STORES.words);

    expect(Array.from(store.indexNames)).toEqual(
      expect.arrayContaining([
        INDEXES.byCreatedAt,
        INDEXES.byNextReviewAt,
        INDEXES.byTagId,
        INDEXES.bySourceUrl,
      ])
    );

    tx.abort();
    db.close();
  });

  it('saves word with default review fields', async () => {
    const now = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const result = await saveWord(BASE_PAYLOAD);
    expect(result.success).toBe(true);
    expect(result.data?.id).toBeTypeOf('string');

    const record = await getWordById(result.data!.id);
    expect(record.success).toBe(true);
    expect(record.data?.meaning).toBe(BASE_PAYLOAD.meaning);
    expect(record.data?.createdAt).toBe(now);
    expect(record.data?.nextReviewAt).toBe(now + 24 * 60 * 60 * 1000);
    expect(record.data?.reviewCount).toBe(0);
    expect(record.data?.interval).toBe(1);
    expect(record.data?.tagIds).toEqual([]);
    expect(record.data?.easeFactor).toBe(2.5);
  });

  it('rejects duplicate word by text + sourceUrl + xpath', async () => {
    const first = await saveWord(BASE_PAYLOAD);
    expect(first.success).toBe(true);

    const second = await saveWord(BASE_PAYLOAD);
    expect(second.success).toBe(false);
    expect(second.error?.code).toBe(ErrorCode.DUPLICATE_WORD);

    const count = await getWordCount();
    expect(count.success).toBe(true);
    expect(count.data).toBe(1);
  });

  describe('searchWords - Story 2.5', () => {
    const WORD_APPLE: SaveWordPayload = {
      ...BASE_PAYLOAD,
      text: 'apple',
      meaning: '苹果，一种水果',
      xpath: '/html/body/div[1]/p[1]',
    };

    const WORD_BANANA: SaveWordPayload = {
      ...BASE_PAYLOAD,
      text: 'banana',
      meaning: '香蕉，热带水果',
      xpath: '/html/body/div[1]/p[2]',
    };

    const WORD_CHERRY: SaveWordPayload = {
      ...BASE_PAYLOAD,
      text: 'cherry',
      meaning: '樱桃',
      xpath: '/html/body/div[1]/p[3]',
    };

    beforeEach(async () => {
      // 按特定顺序保存以测试排序
      await saveWord(WORD_APPLE);
      await saveWord(WORD_BANANA);
      await saveWord(WORD_CHERRY);
    });

    it('returns all words when query is empty', async () => {
      const result = await searchWords('');
      expect(result.success).toBe(true);
      expect(result.data?.words.length).toBe(3);
      expect(result.data?.matchCount).toBe(3);
      expect(result.data?.totalCount).toBe(3);
    });

    it('searches in word text (case insensitive)', async () => {
      const result = await searchWords('APPLE');
      expect(result.success).toBe(true);
      expect(result.data?.words.length).toBe(1);
      expect(result.data?.words[0].text).toBe('apple');
      expect(result.data?.matchCount).toBe(1);
      expect(result.data?.totalCount).toBe(3);
    });

    it('searches in word meaning', async () => {
      const result = await searchWords('水果');
      expect(result.success).toBe(true);
      expect(result.data?.words.length).toBe(2);
      expect(result.data?.matchCount).toBe(2);
    });

    it('returns empty results for non-matching query', async () => {
      const result = await searchWords('xyz123');
      expect(result.success).toBe(true);
      expect(result.data?.words.length).toBe(0);
      expect(result.data?.matchCount).toBe(0);
      expect(result.data?.totalCount).toBe(3);
    });

    it('sorts by text alphabetically (asc)', async () => {
      const result = await searchWords('', { sortBy: 'text', sortOrder: 'asc' });
      expect(result.success).toBe(true);
      expect(result.data?.words.map(w => w.text)).toEqual(['apple', 'banana', 'cherry']);
    });

    it('sorts by text alphabetically (desc)', async () => {
      const result = await searchWords('', { sortBy: 'text', sortOrder: 'desc' });
      expect(result.success).toBe(true);
      expect(result.data?.words.map(w => w.text)).toEqual(['cherry', 'banana', 'apple']);
    });

    it('handles whitespace in query', async () => {
      const result = await searchWords('  apple  ');
      expect(result.success).toBe(true);
      expect(result.data?.words.length).toBe(1);
    });

    it('handles partial matches', async () => {
      const result = await searchWords('an');
      expect(result.success).toBe(true);
      // "banana" contains "an"
      expect(result.data?.words.some(w => w.text === 'banana')).toBe(true);
    });
  });
});
