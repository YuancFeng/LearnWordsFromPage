/**
 * LingoRecall AI - Usage Tracking Hook
 * 用量追踪状态管理 Hook
 *
 * @module hooks/useUsage
 */

import { useState, useEffect, useCallback } from 'react';
import { getSettings } from '../shared/storage/config';
import { getUsageStats, type UsageStats } from '../shared/storage/usageStore';
import {
  detectProviderType,
  fetchOpenRouterBalance,
  formatCurrency,
  formatTokens,
  calculateBalancePercentage,
  isBalanceLow,
  type OpenRouterBalance,
  type ProviderType,
} from '../services/usageService';

/**
 * 用量数据接口
 */
export interface UsageData {
  /** Provider 类型 */
  providerType: ProviderType;
  /** 是否支持远程余额查询 */
  supportsRemoteBalance: boolean;
  /** 远程余额信息 (仅 OpenRouter) */
  remoteBalance: OpenRouterBalance | null;
  /** 本地用量统计 */
  localStats: UsageStats;
  /** 余额百分比 (0-100) */
  balancePercentage: number;
  /** 是否低余额警告 */
  isLowBalance: boolean;
  /** 格式化的剩余额度 */
  formattedRemaining: string;
  /** 格式化的总额度 */
  formattedLimit: string;
  /** 格式化的今日使用 tokens */
  formattedDailyTokens: string;
  /** 格式化的今日费用 */
  formattedDailyCost: string;
  /** 格式化的总费用 */
  formattedTotalCost: string;
}

/**
 * useUsage Hook 返回值
 */
export interface UseUsageResult {
  /** 用量数据 */
  data: UsageData | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 上次更新时间 */
  lastUpdated: Date | null;
}

/**
 * 默认本地统计数据
 */
const defaultLocalStats: UsageStats = {
  totalTokens: 0,
  totalCost: 0,
  dailyTokens: 0,
  dailyCost: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  history: [],
};

/**
 * 用量追踪 Hook
 *
 * @param autoRefreshInterval - 自动刷新间隔 (毫秒)，0 表示不自动刷新
 * @returns 用量数据和控制函数
 */
export function useUsage(autoRefreshInterval: number = 0): UseUsageResult {
  const [data, setData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * 加载用量数据
   */
  const loadUsageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 获取设置以确定 provider 类型
      const settingsResult = await getSettings();
      const settings = settingsResult.success ? settingsResult.data : null;

      // 获取本地统计
      const localStats = await getUsageStats();

      // 确定 provider 类型
      let providerType: ProviderType = 'gemini';
      let endpoint = '';

      if (settings?.aiProvider === 'openai-compatible' && settings.customApiEndpoint) {
        endpoint = settings.customApiEndpoint;
        providerType = detectProviderType(endpoint);
      }

      // 检查是否支持远程余额查询
      const supportsRemoteBalance = providerType === 'openrouter';

      // 获取 API Key
      const apiKeyResult = await chrome.storage.local.get('lingorecall_api_key');
      const apiKey = apiKeyResult['lingorecall_api_key'] as string | undefined;

      // 获取远程余额 (仅 OpenRouter)
      let remoteBalance: OpenRouterBalance | null = null;
      if (supportsRemoteBalance && apiKey) {
        remoteBalance = await fetchOpenRouterBalance(apiKey);
      }

      // 计算余额相关数据
      const remaining = remoteBalance?.limitRemaining ?? null;
      const limit = remoteBalance?.limit ?? null;
      const balancePercentage = calculateBalancePercentage(remaining, limit);
      const lowBalance = isBalanceLow(remaining, limit);

      // 格式化显示数据
      const formattedRemaining = remaining !== null ? formatCurrency(remaining) : '--';
      const formattedLimit = limit !== null ? formatCurrency(limit) : 'Unlimited';
      const formattedDailyTokens = formatTokens(localStats.dailyTokens);
      const formattedDailyCost = formatCurrency(localStats.dailyCost, 4);
      const formattedTotalCost = formatCurrency(localStats.totalCost, 4);

      setData({
        providerType,
        supportsRemoteBalance,
        remoteBalance,
        localStats,
        balancePercentage,
        isLowBalance: lowBalance,
        formattedRemaining,
        formattedLimit,
        formattedDailyTokens,
        formattedDailyCost,
        formattedTotalCost,
      });

      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load usage data';
      setError(message);
      console.error('[LingoRecall Usage] Failed to load usage data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 刷新数据
   */
  const refresh = useCallback(async () => {
    await loadUsageData();
  }, [loadUsageData]);

  // 初始加载
  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  // 自动刷新
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(loadUsageData, autoRefreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, loadUsageData]);

  return {
    data,
    isLoading,
    error,
    refresh,
    lastUpdated,
  };
}

export default useUsage;
