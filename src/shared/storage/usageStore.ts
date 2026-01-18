/**
 * LingoRecall AI - Usage Statistics Storage
 * 用量统计数据存储
 *
 * @module shared/storage/usageStore
 */

/** 存储键 */
const STORAGE_KEY = 'lingorecall_usage_stats';

/** 历史记录最大条数 */
const MAX_HISTORY_RECORDS = 100;

/**
 * 单次使用记录
 */
export interface UsageRecord {
  /** 时间戳 */
  timestamp: number;
  /** 使用的 tokens */
  tokens: number;
  /** 估算成本 (USD) */
  cost: number;
  /** 模型名称 */
  model: string;
}

/**
 * 用量统计数据
 */
export interface UsageStats {
  /** 总 tokens 使用量 */
  totalTokens: number;
  /** 总成本 (USD) */
  totalCost: number;
  /** 今日 tokens 使用量 */
  dailyTokens: number;
  /** 今日成本 (USD) */
  dailyCost: number;
  /** 上次重置日期 (ISO 格式) */
  lastResetDate: string;
  /** 使用历史记录 */
  history: UsageRecord[];
}

/**
 * 获取今日日期 (ISO 格式，只取日期部分)
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 创建默认的用量统计数据
 */
function createDefaultStats(): UsageStats {
  return {
    totalTokens: 0,
    totalCost: 0,
    dailyTokens: 0,
    dailyCost: 0,
    lastResetDate: getTodayDate(),
    history: [],
  };
}

/**
 * 获取用量统计数据
 *
 * @returns 用量统计数据
 */
export async function getUsageStats(): Promise<UsageStats> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stats = result[STORAGE_KEY] as UsageStats | undefined;

    if (!stats) {
      return createDefaultStats();
    }

    // 检查是否需要重置每日统计
    const today = getTodayDate();
    if (stats.lastResetDate !== today) {
      // 新的一天，重置每日统计
      stats.dailyTokens = 0;
      stats.dailyCost = 0;
      stats.lastResetDate = today;

      // 保存重置后的数据
      await chrome.storage.local.set({ [STORAGE_KEY]: stats });
    }

    return stats;
  } catch (error) {
    console.error('[LingoRecall Usage] Failed to get usage stats:', error);
    return createDefaultStats();
  }
}

/**
 * 更新用量统计数据
 *
 * @param tokens - 使用的 tokens
 * @param cost - 估算成本 (USD)
 * @param model - 模型名称
 */
export async function updateUsageStats(
  tokens: number,
  cost: number,
  model: string
): Promise<void> {
  try {
    const stats = await getUsageStats();

    // 更新统计
    stats.totalTokens += tokens;
    stats.totalCost += cost;
    stats.dailyTokens += tokens;
    stats.dailyCost += cost;

    // 添加历史记录
    const record: UsageRecord = {
      timestamp: Date.now(),
      tokens,
      cost,
      model,
    };

    stats.history.unshift(record);

    // 限制历史记录数量
    if (stats.history.length > MAX_HISTORY_RECORDS) {
      stats.history = stats.history.slice(0, MAX_HISTORY_RECORDS);
    }

    // 保存
    await chrome.storage.local.set({ [STORAGE_KEY]: stats });
  } catch (error) {
    console.error('[LingoRecall Usage] Failed to update usage stats:', error);
  }
}

/**
 * 重置用量统计数据
 *
 * @param resetTotal - 是否同时重置总计数据 (默认只重置每日)
 */
export async function resetUsageStats(resetTotal: boolean = false): Promise<void> {
  try {
    if (resetTotal) {
      // 完全重置
      await chrome.storage.local.set({ [STORAGE_KEY]: createDefaultStats() });
    } else {
      // 只重置每日数据
      const stats = await getUsageStats();
      stats.dailyTokens = 0;
      stats.dailyCost = 0;
      stats.lastResetDate = getTodayDate();
      await chrome.storage.local.set({ [STORAGE_KEY]: stats });
    }
  } catch (error) {
    console.error('[LingoRecall Usage] Failed to reset usage stats:', error);
  }
}

/**
 * 清除所有用量数据
 */
export async function clearUsageStats(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error('[LingoRecall Usage] Failed to clear usage stats:', error);
  }
}

/**
 * 获取指定日期范围内的使用记录
 *
 * @param startDate - 开始日期 (时间戳)
 * @param endDate - 结束日期 (时间戳)
 * @returns 筛选后的记录
 */
export async function getUsageHistory(
  startDate?: number,
  endDate?: number
): Promise<UsageRecord[]> {
  const stats = await getUsageStats();
  let records = stats.history;

  if (startDate !== undefined) {
    records = records.filter((r) => r.timestamp >= startDate);
  }

  if (endDate !== undefined) {
    records = records.filter((r) => r.timestamp <= endDate);
  }

  return records;
}

/**
 * 获取按模型分组的使用统计
 *
 * @returns 按模型分组的统计 { model: { tokens, cost, count } }
 */
export async function getUsageByModel(): Promise<
  Record<string, { tokens: number; cost: number; count: number }>
> {
  const stats = await getUsageStats();
  const byModel: Record<string, { tokens: number; cost: number; count: number }> = {};

  for (const record of stats.history) {
    if (!byModel[record.model]) {
      byModel[record.model] = { tokens: 0, cost: 0, count: 0 };
    }
    byModel[record.model].tokens += record.tokens;
    byModel[record.model].cost += record.cost;
    byModel[record.model].count += 1;
  }

  return byModel;
}
