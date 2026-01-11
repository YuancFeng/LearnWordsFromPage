/**
 * LingoRecall AI - Storage Module
 * 存储模块导出
 *
 * @module shared/storage
 */

// Database
export {
  DB_NAME,
  DB_VERSION,
  STORES,
  INDEXES,
  getDatabase,
  closeDatabase,
  deleteDatabase,
  isDatabaseInitialized,
  withTransaction,
  withCursor,
  countDueWords,
  getDueWords,
} from './db';

// Word Service
export {
  saveWord,
  findDuplicateWord,
  getAllWords,
  getWordById,
  updateWord,
  deleteWord,
  getWordCount,
  searchWords,
} from './wordService';

// Tag Store - Story 4.4
export {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
  getTagsByIds,
} from './tagStore';
