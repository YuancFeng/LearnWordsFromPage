/**
 * LingoRecall AI - Usage Monitor Component
 * 用量监控 UI 组件
 *
 * @module popup/components/UsageMonitor
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, RefreshCw, AlertTriangle, Coins, Zap, Clock } from 'lucide-react';
import { useUsage } from '../../hooks/useUsage';

/**
 * UsageMonitor 属性
 */
export interface UsageMonitorProps {
  /** 是否折叠显示 */
  collapsed?: boolean;
  /** 点击刷新回调 */
  onRefresh?: () => void;
}

/**
 * 用量监控组件
 * 显示 API 用量统计和余额信息
 */
export function UsageMonitor({ collapsed = false, onRefresh }: UsageMonitorProps): React.ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, error, refresh, lastUpdated } = useUsage();

  /**
   * 处理刷新
   */
  const handleRefresh = useCallback(async () => {
    await refresh();
    onRefresh?.();
  }, [refresh, onRefresh]);

  // 加载状态
  if (isLoading && !data) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  // 错误状态
  if (error && !data) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!data) return <></>;

  const {
    providerType,
    supportsRemoteBalance,
    remoteBalance,
    balancePercentage,
    isLowBalance,
    formattedRemaining,
    formattedLimit,
    formattedDailyTokens,
    formattedDailyCost,
    formattedTotalCost,
  } = data;

  // 获取 provider 显示名称
  const getProviderName = (): string => {
    switch (providerType) {
      case 'openrouter':
        return 'OpenRouter';
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic';
      case 'gemini':
        return 'Gemini';
      case 'local':
        return t('usage.localProvider');
      default:
        return t('usage.unknownProvider');
    }
  };

  // 进度条颜色
  const getProgressColor = (): string => {
    if (balancePercentage <= 10) return 'bg-red-500';
    if (balancePercentage <= 25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 折叠模式下只显示简要信息
  if (collapsed) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Coins className="w-3 h-3" />
        <span>
          {supportsRemoteBalance && remoteBalance
            ? `${formattedRemaining} / ${formattedLimit}`
            : `${formattedDailyTokens} tokens`}
        </span>
        {isLowBalance && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <BarChart3 className="w-4 h-4" />
          <span className="text-sm font-medium">{t('usage.title')}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({getProviderName()})</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          title={t('usage.refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 远程余额 (仅 OpenRouter) */}
      {supportsRemoteBalance && remoteBalance && (
        <div className="space-y-2">
          {/* 进度条 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">{t('usage.remaining')}</span>
              <span className={`font-medium ${isLowBalance ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                {formattedRemaining} / {formattedLimit}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${balancePercentage}%` }}
              />
            </div>
          </div>

          {/* 低余额警告 */}
          {isLowBalance && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-yellow-700 dark:text-yellow-400">
                {t('usage.lowBalanceWarning')}
              </span>
            </div>
          )}

          {/* OpenRouter 详细用量 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{t('usage.todayUsage')}:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                ${remoteBalance.usageDaily.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span>{remoteBalance.isFreeTier ? t('usage.freeTier') : t('usage.paidTier')}</span>
            </div>
          </div>
        </div>
      )}

      {/* 本地追踪数据 (始终显示) */}
      <div className="space-y-2">
        {!supportsRemoteBalance && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t('usage.localTrackingNote')}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* 今日 Tokens */}
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded-md border border-gray-100 dark:border-gray-700">
            <Zap className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('usage.todayTokens')}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {formattedDailyTokens}
              </p>
            </div>
          </div>

          {/* 今日费用 */}
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded-md border border-gray-100 dark:border-gray-700">
            <Coins className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('usage.todayCost')}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                ~{formattedDailyCost}
              </p>
            </div>
          </div>
        </div>

        {/* 累计费用 */}
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
          <span>{t('usage.totalCost')}</span>
          <span className="font-medium">~{formattedTotalCost}</span>
        </div>
      </div>

      {/* 上次更新时间 */}
      {lastUpdated && (
        <div className="text-xs text-gray-400 dark:text-gray-500 text-right">
          {t('usage.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

export default UsageMonitor;
