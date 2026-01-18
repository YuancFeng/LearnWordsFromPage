/**
 * LingoRecall AI - Usage Tracking Service
 * 用量追踪服务 - 支持 OpenRouter 远程查询和本地追踪
 *
 * @module services/usageService
 */

import { getUsageStats, updateUsageStats, type UsageStats } from '../shared/storage/usageStore';

/**
 * API Provider 类型
 */
export type ProviderType = 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'local' | 'unknown';

/**
 * OpenRouter 余额信息
 */
export interface OpenRouterBalance {
  /** 总额度限制 (null 表示无限制) */
  limit: number | null;
  /** 剩余额度 */
  limitRemaining: number | null;
  /** 总使用量 (所有时间) */
  usage: number;
  /** 今日使用量 */
  usageDaily: number;
  /** 本周使用量 */
  usageWeekly: number;
  /** 本月使用量 */
  usageMonthly: number;
  /** 是否为免费层 */
  isFreeTier: boolean;
}

/**
 * 用量追踪结果
 */
export interface UsageTrackingResult {
  /** 本次使用的 tokens */
  tokens: number;
  /** 估算成本 (USD) */
  estimatedCost: number;
  /** 模型名称 */
  model: string;
}

/**
 * 模型定价表 (每百万 tokens 的价格，单位 USD)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenRouter / Anthropic Claude 模型
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-sonnet-20240229': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },

  // OpenAI GPT 模型
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4-turbo-preview': { input: 10, output: 30 },
  'gpt-4o': { input: 5, output: 15 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // Google Gemini 模型 (免费或非常便宜)
  'gemini-2.0-flash-exp': { input: 0, output: 0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },

  // 开源模型 (本地部署通常免费)
  'llama3': { input: 0, output: 0 },
  'llama3.1': { input: 0, output: 0 },
  'llama3.2': { input: 0, output: 0 },
  'mistral': { input: 0, output: 0 },
  'mixtral': { input: 0, output: 0 },
  'qwen': { input: 0, output: 0 },
  'qwen2': { input: 0, output: 0 },

  // 默认定价 (用于未知模型)
  'default': { input: 1, output: 3 },
};

/**
 * 检测 API Provider 类型
 *
 * @param endpoint - API 端点 URL
 * @returns Provider 类型
 */
export function detectProviderType(endpoint: string): ProviderType {
  if (!endpoint) return 'unknown';

  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();

    // OpenRouter
    if (host.includes('openrouter.ai')) {
      return 'openrouter';
    }

    // OpenAI
    if (host.includes('api.openai.com')) {
      return 'openai';
    }

    // Anthropic
    if (host.includes('api.anthropic.com')) {
      return 'anthropic';
    }

    // 本地服务 (Ollama, LM Studio, etc.)
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return 'local';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 检测端点是否为 OpenRouter
 *
 * @param endpoint - API 端点 URL
 * @returns 是否为 OpenRouter
 */
export function isOpenRouter(endpoint: string): boolean {
  return detectProviderType(endpoint) === 'openrouter';
}

/**
 * 获取 OpenRouter 余额信息
 *
 * @param apiKey - OpenRouter API Key
 * @returns 余额信息或 null (如果获取失败)
 */
export async function fetchOpenRouterBalance(apiKey: string): Promise<OpenRouterBalance | null> {
  if (!apiKey) {
    console.warn('[LingoRecall Usage] No API key provided for OpenRouter balance check');
    return null;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`[LingoRecall Usage] OpenRouter balance check failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      limit: data.limit ?? null,
      limitRemaining: data.limit_remaining ?? null,
      usage: data.usage ?? 0,
      usageDaily: data.usage_daily ?? 0,
      usageWeekly: data.usage_weekly ?? 0,
      usageMonthly: data.usage_monthly ?? 0,
      isFreeTier: data.is_free_tier ?? false,
    };
  } catch (error) {
    console.error('[LingoRecall Usage] Failed to fetch OpenRouter balance:', error);
    return null;
  }
}

/**
 * 根据模型名称获取定价
 *
 * @param modelName - 模型名称
 * @returns 定价信息 { input, output } (每百万 tokens)
 */
export function getModelPricing(modelName: string): { input: number; output: number } {
  const normalizedName = modelName.toLowerCase();

  // 精确匹配
  if (MODEL_PRICING[normalizedName]) {
    return MODEL_PRICING[normalizedName];
  }

  // 模糊匹配
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return pricing;
    }
  }

  // 默认定价
  return MODEL_PRICING['default'];
}

/**
 * 估算 API 调用成本
 *
 * @param inputTokens - 输入 tokens 数量
 * @param outputTokens - 输出 tokens 数量
 * @param modelName - 模型名称
 * @returns 估算成本 (USD)
 */
export function estimateTokenCost(
  inputTokens: number,
  outputTokens: number,
  modelName: string
): number {
  const pricing = getModelPricing(modelName);

  // 计算成本 (价格是每百万 tokens)
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * 追踪 API 使用量
 * 记录到本地存储
 *
 * @param inputTokens - 输入 tokens
 * @param outputTokens - 输出 tokens
 * @param modelName - 模型名称
 * @returns 追踪结果
 */
export async function trackUsage(
  inputTokens: number,
  outputTokens: number,
  modelName: string
): Promise<UsageTrackingResult> {
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = estimateTokenCost(inputTokens, outputTokens, modelName);

  // 更新存储
  await updateUsageStats(totalTokens, estimatedCost, modelName);

  console.log(
    `[LingoRecall Usage] Tracked: ${totalTokens} tokens, ~$${estimatedCost.toFixed(6)} (${modelName})`
  );

  return {
    tokens: totalTokens,
    estimatedCost,
    model: modelName,
  };
}

/**
 * 获取当前用量统计
 *
 * @returns 用量统计数据
 */
export async function getCurrentUsageStats(): Promise<UsageStats> {
  return getUsageStats();
}

/**
 * 格式化货币显示
 *
 * @param amount - 金额 (USD)
 * @param digits - 小数位数
 * @returns 格式化的字符串
 */
export function formatCurrency(amount: number, digits: number = 2): string {
  if (amount < 0.01 && amount > 0) {
    return `<$0.01`;
  }
  return `$${amount.toFixed(digits)}`;
}

/**
 * 格式化 token 数量显示
 *
 * @param tokens - token 数量
 * @returns 格式化的字符串
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * 计算余额百分比
 *
 * @param remaining - 剩余金额
 * @param total - 总金额
 * @returns 百分比 (0-100)
 */
export function calculateBalancePercentage(remaining: number | null, total: number | null): number {
  if (remaining === null || total === null || total === 0) {
    return 100; // 无限额度
  }
  return Math.max(0, Math.min(100, (remaining / total) * 100));
}

/**
 * 检查余额是否低于警告阈值
 *
 * @param remaining - 剩余金额
 * @param total - 总金额
 * @param threshold - 警告阈值 (百分比，默认 10%)
 * @returns 是否低于阈值
 */
export function isBalanceLow(
  remaining: number | null,
  total: number | null,
  threshold: number = 10
): boolean {
  const percentage = calculateBalancePercentage(remaining, total);
  return percentage < threshold;
}
