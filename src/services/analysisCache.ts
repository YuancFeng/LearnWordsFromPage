/**
 * LingoRecall AI - Analysis Cache Service
 * 高性能内存缓存，用于减少重复 AI API 调用
 *
 * 优化策略：
 * 1. 内存缓存 - 单词级别的 LRU 缓存
 * 2. 模糊匹配 - 相同单词不同上下文可复用
 * 3. TTL 过期 - 自动清理过期条目
 *
 * @module services/analysisCache
 */

import type { AIAnalysisResult, AnalysisMode } from './geminiService';

/** 缓存条目接口 */
interface CacheEntry {
  result: AIAnalysisResult;
  timestamp: number;
  hitCount: number;
}

/** 缓存配置 */
const CACHE_CONFIG = {
  /** 最大缓存条目数 */
  MAX_ENTRIES: 500,
  /** 缓存过期时间（毫秒）- 24小时 */
  TTL_MS: 24 * 60 * 60 * 1000,
  /** 短文本阈值（字符数）- 短文本更适合缓存 */
  SHORT_TEXT_THRESHOLD: 50,
  /** 短文本更长的 TTL - 7天 */
  SHORT_TEXT_TTL_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

/** 内存缓存 Map */
const cache = new Map<string, CacheEntry>();

/** 缓存统计 */
const stats = {
  hits: 0,
  misses: 0,
  evictions: 0,
};

/**
 * 生成缓存键
 * 对于单词模式，只使用文本作为键（忽略上下文）
 * 对于翻译模式，使用文本+上下文hash
 *
 * @param text - 待分析文本
 * @param mode - 分析模式
 * @returns 缓存键
 */
function generateCacheKey(text: string, mode: AnalysisMode = 'word'): string {
  const normalizedText = text.trim().toLowerCase();

  if (mode === 'translate') {
    // 翻译模式：文本完全相同才能复用
    return `translate:${normalizedText}`;
  }

  // 单词模式：只用单词本身作为键，可跨上下文复用
  return `word:${normalizedText}`;
}

/**
 * 获取缓存的分析结果
 *
 * @param text - 待分析文本
 * @param mode - 分析模式
 * @returns 缓存的结果或 null
 */
export function getCachedAnalysis(
  text: string,
  mode: AnalysisMode = 'word'
): AIAnalysisResult | null {
  const key = generateCacheKey(text, mode);
  const entry = cache.get(key);

  if (!entry) {
    stats.misses++;
    return null;
  }

  // 检查是否过期
  const ttl = text.length <= CACHE_CONFIG.SHORT_TEXT_THRESHOLD
    ? CACHE_CONFIG.SHORT_TEXT_TTL_MS
    : CACHE_CONFIG.TTL_MS;

  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    stats.misses++;
    return null;
  }

  // 更新命中计数
  entry.hitCount++;
  stats.hits++;

  console.log(`[LingoRecall Cache] HIT: "${text}" (hits: ${entry.hitCount})`);
  return entry.result;
}

/**
 * 缓存分析结果
 *
 * @param text - 分析的文本
 * @param result - AI 分析结果
 * @param mode - 分析模式
 */
export function setCachedAnalysis(
  text: string,
  result: AIAnalysisResult,
  mode: AnalysisMode = 'word'
): void {
  const key = generateCacheKey(text, mode);

  // 如果缓存已满，移除最旧的条目
  if (cache.size >= CACHE_CONFIG.MAX_ENTRIES) {
    evictOldestEntries(Math.floor(CACHE_CONFIG.MAX_ENTRIES * 0.1)); // 移除 10%
  }

  cache.set(key, {
    result,
    timestamp: Date.now(),
    hitCount: 0,
  });

  console.log(`[LingoRecall Cache] SET: "${text}" (size: ${cache.size})`);
}

/**
 * 移除最旧的缓存条目
 *
 * @param count - 移除数量
 */
function evictOldestEntries(count: number): void {
  // 按时间戳排序，优先移除命中次数低的旧条目
  const entries = Array.from(cache.entries())
    .sort((a, b) => {
      // 先按命中次数排序（低的优先移除）
      if (a[1].hitCount !== b[1].hitCount) {
        return a[1].hitCount - b[1].hitCount;
      }
      // 再按时间戳排序（旧的优先移除）
      return a[1].timestamp - b[1].timestamp;
    });

  for (let i = 0; i < count && i < entries.length; i++) {
    cache.delete(entries[i][0]);
    stats.evictions++;
  }

  console.log(`[LingoRecall Cache] Evicted ${count} entries`);
}

/**
 * 清空缓存
 */
export function clearCache(): void {
  cache.clear();
  stats.hits = 0;
  stats.misses = 0;
  stats.evictions = 0;
  console.log('[LingoRecall Cache] Cleared');
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
} {
  const total = stats.hits + stats.misses;
  return {
    size: cache.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: total > 0 ? stats.hits / total : 0,
    evictions: stats.evictions,
  };
}

/**
 * 预热缓存（从 IndexedDB 加载常用词汇）
 * 可选功能，在 Service Worker 启动时调用
 */
export async function warmupCache(): Promise<void> {
  // 这里可以从 IndexedDB 加载用户保存过的词汇
  // 预先缓存这些词汇的分析结果
  console.log('[LingoRecall Cache] Warmup started');
  // 实现略，需要额外的存储逻辑
}
