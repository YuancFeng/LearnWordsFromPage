/**
 * LingoRecall AI - Unified AI Service
 * 统一的 AI 服务接口，支持多种 Provider
 *
 * 性能优化：
 * 1. 内存缓存 - 减少重复 API 调用
 * 2. 配置缓存 - 避免每次请求读取 storage
 *
 * @module services/aiService
 */

import type { Settings, AIProviderType, TargetLanguage, LocalModelConfig } from '../shared/types/settings';
import { analyzeWord as analyzeWordGemini, type AIAnalysisResult, type AnalyzeWordRequest, type AnalysisMode } from './geminiService';
import { analyzeWordOpenAI, translateBatchOpenAI } from './openaiCompatibleService';
import { getCachedAnalysis, setCachedAnalysis, getCacheStats } from './analysisCache';
import { translateBatchGemini } from './geminiService';

export type { AIAnalysisResult, AnalyzeWordRequest, AnalysisMode };

/**
 * AI 配置接口
 */
export interface AIServiceConfig {
  provider: AIProviderType;
  apiKey: string;
  /** Gemini 模型名称 */
  geminiModel?: string;
  /** 自定义 API 端点 (OpenAI 兼容) */
  customEndpoint?: string;
  /** 自定义模型名称 (OpenAI 兼容) */
  customModel?: string;
  /** 本地模型配置 */
  localModelConfig?: LocalModelConfig;
}

/**
 * 从 Settings 和 API Key 构建 AI 配置
 */
export function buildAIConfig(settings: Settings, apiKey: string): AIServiceConfig {
  return {
    provider: settings.aiProvider,
    apiKey,
    geminiModel: settings.providerConfigs?.gemini?.modelName,
    customEndpoint: settings.customApiEndpoint,
    customModel: settings.customModelName,
    localModelConfig: settings.localModelConfig,
  };
}

/**
 * 统一的单词分析接口（带缓存）
 *
 * @param request - 分析请求
 * @param config - AI 配置
 * @returns AI 分析结果
 */
export async function analyzeWordUnified(
  request: AnalyzeWordRequest,
  config: AIServiceConfig
): Promise<AIAnalysisResult> {
  const startTime = performance.now();
  const mode = request.mode || 'word';

  // 1. 检查缓存
  const cached = getCachedAnalysis(request.text, mode);
  if (cached) {
    const elapsed = performance.now() - startTime;
    console.log(`[LingoRecall AI] Cache hit in ${elapsed.toFixed(1)}ms`);
    return cached;
  }

  // 2. 调用 AI API
  let result: AIAnalysisResult;

  switch (config.provider) {
    case 'gemini':
      result = await analyzeWordGemini(request, config.apiKey, config.geminiModel);
      break;

    case 'localhost':
      // 本地模型使用 OpenAI 兼容 API 格式
      if (!config.localModelConfig?.endpoint) {
        throw new Error('INVALID_CONFIG: Local model endpoint is required.');
      }
      result = await analyzeWordOpenAI(
        request,
        '', // 本地模型不需要 API Key
        config.localModelConfig.endpoint,
        config.localModelConfig.modelName || 'llama3.2'
      );
      break;

    case 'openai-compatible':
      if (!config.customEndpoint) {
        throw new Error('INVALID_CONFIG: Custom API endpoint is required for OpenAI-compatible provider.');
      }
      result = await analyzeWordOpenAI(
        request,
        config.apiKey,
        config.customEndpoint,
        config.customModel || 'gpt-4'
      );
      break;

    default:
      throw new Error(`INVALID_PROVIDER: Unknown AI provider: ${config.provider}`);
  }

  // 3. 缓存结果
  setCachedAnalysis(request.text, result, mode);

  const elapsed = performance.now() - startTime;
  const stats = getCacheStats();
  console.log(`[LingoRecall AI] API call in ${elapsed.toFixed(1)}ms (cache: ${stats.size} items, ${(stats.hitRate * 100).toFixed(1)}% hit rate)`);

  return result;
}

/**
 * 统一的批量翻译接口
 * 用于全页翻译功能
 *
 * @param texts - 待翻译的文本数组
 * @param targetLanguage - 目标翻译语言
 * @param config - AI 配置
 * @returns 翻译后的文本数组
 */
export async function translateBatchUnified(
  texts: string[],
  targetLanguage: TargetLanguage,
  config: AIServiceConfig
): Promise<string[]> {
  const startTime = performance.now();

  if (texts.length === 0) {
    return [];
  }

  let translations: string[];

  switch (config.provider) {
    case 'gemini':
      translations = await translateBatchGemini(texts, targetLanguage, config.apiKey, config.geminiModel);
      break;

    case 'localhost':
      // 本地模型使用 OpenAI 兼容 API 格式
      if (!config.localModelConfig?.endpoint) {
        throw new Error('INVALID_CONFIG: Local model endpoint is required.');
      }
      translations = await translateBatchOpenAI(
        texts,
        targetLanguage,
        '', // 本地模型不需要 API Key
        config.localModelConfig.endpoint,
        config.localModelConfig.modelName || 'llama3.2'
      );
      break;

    case 'openai-compatible':
      if (!config.customEndpoint) {
        throw new Error('INVALID_CONFIG: Custom API endpoint is required for OpenAI-compatible provider.');
      }
      translations = await translateBatchOpenAI(
        texts,
        targetLanguage,
        config.apiKey,
        config.customEndpoint,
        config.customModel || 'gpt-4'
      );
      break;

    default:
      throw new Error(`INVALID_PROVIDER: Unknown AI provider: ${config.provider}`);
  }

  const elapsed = performance.now() - startTime;
  console.log(`[LingoRecall AI] Batch translation (${texts.length} texts) in ${elapsed.toFixed(1)}ms`);

  return translations;
}

/**
 * 验证 AI 配置是否有效
 *
 * @param config - AI 配置
 * @returns 验证结果
 */
export async function validateAIConfig(config: AIServiceConfig): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // 基础验证
    if (!config.apiKey && config.provider === 'gemini') {
      return { valid: false, error: 'API Key is required' };
    }

    if (config.provider === 'localhost') {
      if (!config.localModelConfig?.endpoint) {
        return { valid: false, error: 'Local model endpoint is required' };
      }
      // URL 格式验证
      try {
        new URL(config.localModelConfig.endpoint);
      } catch {
        return { valid: false, error: 'Invalid local model endpoint URL' };
      }
    }

    if (config.provider === 'openai-compatible') {
      if (!config.customEndpoint) {
        return { valid: false, error: 'Custom API endpoint is required' };
      }
      // URL 格式验证
      try {
        new URL(config.customEndpoint);
      } catch {
        return { valid: false, error: 'Invalid API endpoint URL' };
      }
    }

    // 实际调用测试
    const testRequest: AnalyzeWordRequest = {
      text: 'hello',
      context: 'Hello world.',
      url: '',
      xpath: '',
    };

    await analyzeWordUnified(testRequest, config);
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: message };
  }
}
