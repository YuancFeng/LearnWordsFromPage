/**
 * LingoRecall AI - Unified AI Service
 * 统一的 AI 服务接口，支持多种 Provider
 *
 * @module services/aiService
 */

import type { Settings, AIProviderType } from '../shared/types/settings';
import { analyzeWord as analyzeWordGemini, type AIAnalysisResult, type AnalyzeWordRequest, type AnalysisMode } from './geminiService';
import { analyzeWordOpenAI } from './openaiCompatibleService';

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
}

/**
 * 从 Settings 和 API Key 构建 AI 配置
 */
export function buildAIConfig(settings: Settings, apiKey: string): AIServiceConfig {
  return {
    provider: settings.aiProvider,
    apiKey,
    customEndpoint: settings.customApiEndpoint,
    customModel: settings.customModelName,
  };
}

/**
 * 统一的单词分析接口
 *
 * @param request - 分析请求
 * @param config - AI 配置
 * @returns AI 分析结果
 */
export async function analyzeWordUnified(
  request: AnalyzeWordRequest,
  config: AIServiceConfig
): Promise<AIAnalysisResult> {
  switch (config.provider) {
    case 'gemini':
      return analyzeWordGemini(request, config.apiKey, config.geminiModel);

    case 'openai-compatible':
      if (!config.customEndpoint) {
        throw new Error('INVALID_CONFIG: Custom API endpoint is required for OpenAI-compatible provider.');
      }
      return analyzeWordOpenAI(
        request,
        config.apiKey,
        config.customEndpoint,
        config.customModel || 'gpt-4'
      );

    default:
      throw new Error(`INVALID_PROVIDER: Unknown AI provider: ${config.provider}`);
  }
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
    if (!config.apiKey && config.provider !== 'openai-compatible') {
      return { valid: false, error: 'API Key is required' };
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
