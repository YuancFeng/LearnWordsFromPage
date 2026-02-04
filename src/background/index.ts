/**
 * LingoRecall AI - Service Worker Entry Point
 *
 * This service worker handles:
 * - Message routing from Content Script and Popup
 * - AI API calls (Gemini integration)
 * - IndexedDB storage operations
 * - Ebbinghaus review scheduling via chrome.alarms
 * - Badge updates for pending reviews
 *
 * @module background
 */

import {
  MessageTypes,
  registerHandler,
  initMessageRouter,
  type Response,
  type SaveWordPayload,
  type GetWordsPayload,
  type UpdateWordPayload,
  type DeleteWordPayload,
  type WordRecord,
  type JumpToSourcePayload,
  type JumpToSourceResult,
  type ReviewWordPayload,
  type ReviewWordResult,
  type TranslatePageSegmentPayload,
  type TranslatePageSegmentResult,
  type TestLocalConnectionPayload,
  type TestLocalConnectionResult,
  type GetLocalModelsPayload,
  type GetLocalModelsResult,
  type TestApiConnectionPayload,
  type TestApiConnectionResult,
} from '../shared/messaging';

import { LOCAL_TOOLS } from '../services/localModelService';

// Story 2.3: Navigation handlers
import { handleJumpToSource } from './handlers/navigationHandlers';

// Story 3.4: Review word handlers
import { handleReviewWord } from './handlers/wordHandlers';

// Story 3.1: Ebbinghaus review scheduling
import { setupReviewAlarm, handleReviewAlarm, checkAndUpdateBadge } from './alarms';

import {
  analyzeWordUnified,
  translateBatchUnified,
  buildAIConfig,
  type AnalyzeWordRequest,
  type AIAnalysisResult,
} from '../services/aiService';
import { validateApiKey as validateGeminiApiKey } from '../services/geminiService';

import { ErrorCode } from '../shared/types/errors';
import { matchesBlacklist } from '../shared/utils/urlMatcher';
import { DEFAULT_SETTINGS, mergeWithDefaults, type Settings } from '../shared/types/settings';
import { STORAGE_KEYS, getSettings, getApiKey } from '../shared/storage/config';

import {
  getDatabase,
  saveWord,
  getAllWords,
  updateWord as updateWordService,
  deleteWord as deleteWordService,
  searchWords,
  getDueWords,
  countDueWords,
} from '../shared/storage';

console.log('[LingoRecall] Service worker started');

// ============================================================
// Performance Optimization: Config Cache
// 配置缓存，避免每次请求都读取 storage
// ============================================================

interface ConfigCache {
  settings: Settings | null;
  apiKey: string | null;
  lastUpdate: number;
}

const configCache: ConfigCache = {
  settings: null,
  apiKey: null,
  lastUpdate: 0,
};

/** 配置缓存 TTL (5分钟) */
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 获取缓存的配置（带自动刷新）
 */
async function getCachedConfig(): Promise<{ settings: Settings; apiKey: string }> {
  const now = Date.now();

  // 如果缓存有效，直接返回
  if (
    configCache.settings !== null &&
    configCache.apiKey !== null &&
    now - configCache.lastUpdate < CONFIG_CACHE_TTL_MS
  ) {
    return {
      settings: configCache.settings,
      apiKey: configCache.apiKey,
    };
  }

  // 并行加载配置
  const [settingsResult, apiKeyResult] = await Promise.all([
    getSettings(),
    getApiKey(),
  ]);

  const settings = settingsResult.success && settingsResult.data
    ? settingsResult.data
    : mergeWithDefaults(null);

  const apiKey = apiKeyResult.success ? apiKeyResult.data || '' : '';

  // 更新缓存
  configCache.settings = settings;
  configCache.apiKey = apiKey;
  configCache.lastUpdate = now;

  console.log('[LingoRecall] Config cache refreshed');

  return { settings, apiKey };
}

/**
 * 监听配置变更，及时更新缓存
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  if (STORAGE_KEYS.SETTINGS in changes || STORAGE_KEYS.API_KEY in changes) {
    // 清除缓存，下次请求时重新加载
    configCache.settings = null;
    configCache.apiKey = null;
    configCache.lastUpdate = 0;
    console.log('[LingoRecall] Config cache invalidated due to storage change');
  }
});

// ============================================================
// Register Message Handlers
// ============================================================

/**
 * ANALYZE_WORD handler
 * 分析选中的词汇，调用 AI API 获取语境分析结果
 * Story 1.6 实现
 * 支持 Gemini 和 OpenAI 兼容 API
 */
registerHandler(MessageTypes.ANALYZE_WORD, async (message): Promise<Response<AIAnalysisResult>> => {
  const payload = message.payload as AnalyzeWordRequest;
  const startTime = performance.now();
  console.log('[LingoRecall] ANALYZE_WORD:', payload.text);

  try {
    // 使用缓存的配置（性能优化：避免每次请求都读取 storage）
    const { settings, apiKey } = await getCachedConfig();
    const configTime = performance.now() - startTime;
    console.log(`[LingoRecall] Config loaded in ${configTime.toFixed(1)}ms`);

    // 对于 Gemini provider，API Key 必须存在
    if (settings.aiProvider === 'gemini' && !apiKey) {
      return {
        success: false,
        error: {
          code: ErrorCode.AI_INVALID_KEY,
          message: '请先在设置中配置 Gemini API Key',
        },
      };
    }

    // 对于 OpenAI 兼容 API，需要配置端点
    if (settings.aiProvider === 'openai-compatible' && !settings.customApiEndpoint) {
      return {
        success: false,
        error: {
          code: ErrorCode.AI_INVALID_KEY,
          message: '请先在设置中配置自定义 API 端点',
        },
      };
    }

    // 构建 AI 配置
    const aiConfig = buildAIConfig(settings, apiKey);

    // 调用统一 AI 服务
    const result = await analyzeWordUnified(payload, aiConfig);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // 使用更健壮的错误消息提取
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      // 优先使用已知字段
      if (typeof errObj.message === 'string' && errObj.message) {
        errorMessage = errObj.message;
      } else if (typeof errObj.error === 'string' && errObj.error) {
        errorMessage = errObj.error;
      } else if (typeof errObj.details === 'string' && errObj.details) {
        errorMessage = errObj.details;
      } else if (errObj.error && typeof errObj.error === 'object') {
        // 处理嵌套的 error 对象
        const nestedError = errObj.error as Record<string, unknown>;
        errorMessage = typeof nestedError.message === 'string' ? nestedError.message : 'Unknown error';
      } else {
        // 最后尝试 JSON 序列化
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'Unknown error';
        }
      }
    } else {
      errorMessage = String(error) || 'Unknown error';
    }

    console.error('[LingoRecall] ANALYZE_WORD error:', errorMessage);
    console.error('[LingoRecall] Full error:', error);

    // 解析错误类型 - 使用规范化的大写消息进行匹配
    const normalizedMessage = errorMessage.toUpperCase();
    let errorCode = ErrorCode.AI_API_ERROR;
    let userMessage = 'AI 分析失败，请重试';

    if (normalizedMessage.includes('API_KEY') || normalizedMessage.includes('INVALID_API_KEY')) {
      errorCode = ErrorCode.AI_INVALID_KEY;
      userMessage = 'API Key 无效，请检查设置';
    } else if (normalizedMessage.includes('RATE_LIMIT') || normalizedMessage.includes('429') || normalizedMessage.includes('RESOURCE_EXHAUSTED') || normalizedMessage.includes('QUOTA_EXCEEDED')) {
      errorCode = ErrorCode.AI_RATE_LIMIT;
      userMessage = '请求过于频繁，请稍后再试';
    } else if (normalizedMessage.includes('TIMEOUT')) {
      errorCode = ErrorCode.TIMEOUT;
      userMessage = '请求超时，请检查网络连接';
    } else if (normalizedMessage.includes('NETWORK') || normalizedMessage.includes('FETCH')) {
      errorCode = ErrorCode.NETWORK_ERROR;
      userMessage = '网络错误，请检查网络连接';
    } else if (normalizedMessage.includes('ENDPOINT_NOT_FOUND')) {
      errorCode = ErrorCode.AI_API_ERROR;
      userMessage = 'API 端点无效，请检查配置';
    } else if (normalizedMessage.includes('INVALID_CONFIG')) {
      errorCode = ErrorCode.INVALID_INPUT;
      userMessage = '配置无效，请检查设置';
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: userMessage,
      },
    };
  }
});

/**
 * SAVE_WORD handler
 * 保存词汇到 IndexedDB
 * Story 2.1 实现 - AC1: 保存词汇, AC2: 重复检测
 */
registerHandler(MessageTypes.SAVE_WORD, async (message): Promise<Response<{ id: string }>> => {
  const payload = message.payload as SaveWordPayload;
  console.log('[LingoRecall] SAVE_WORD:', payload.text);

  try {
    const result = await saveWord(payload);
    return result;
  } catch (error) {
    console.error('[LingoRecall] SAVE_WORD error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '保存失败',
      },
    };
  }
});

/**
 * GET_WORDS handler
 * 获取词汇列表
 * Story 2.2 使用 - 返回所有词汇
 */
registerHandler(MessageTypes.GET_WORDS, async (message): Promise<Response<WordRecord[]>> => {
  const payload = message.payload as GetWordsPayload;
  console.log('[LingoRecall] GET_WORDS:', payload);

  try {
    // 如果有搜索查询，使用 searchWords
    if (payload?.searchQuery) {
      const result = await searchWords(payload.searchQuery);
      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.words,
        };
      }
      return {
        success: false,
        error: result.error,
      };
    }

    // 否则获取所有词汇
    const result = await getAllWords({
      limit: payload?.limit,
      offset: payload?.offset,
    });

    return result;
  } catch (error) {
    console.error('[LingoRecall] GET_WORDS error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '查询失败',
      },
    };
  }
});

/**
 * GET_DUE_WORDS handler
 * 获取待复习词汇
 * Story 3.3 - AC1: 获取待复习词汇列表
 */
registerHandler(MessageTypes.GET_DUE_WORDS, async (): Promise<Response<WordRecord[]>> => {
  console.log('[LingoRecall] GET_DUE_WORDS');

  try {
    const words = await getDueWords();
    return {
      success: true,
      data: words,
    };
  } catch (error) {
    console.error('[LingoRecall] GET_DUE_WORDS error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '获取待复习词汇失败',
      },
    };
  }
});

/**
 * GET_DUE_COUNT handler
 * 获取待复习词汇数量
 * Story 3.3 - 用于 Badge 数量展示
 */
registerHandler(MessageTypes.GET_DUE_COUNT, async (): Promise<Response<number>> => {
  console.log('[LingoRecall] GET_DUE_COUNT');

  try {
    const count = await countDueWords();
    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error('[LingoRecall] GET_DUE_COUNT error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '获取待复习数量失败',
      },
    };
  }
});

/**
 * UPDATE_WORD handler
 * 更新词汇记录
 * Story 2.1 实现
 * Story 3.2 - AC#4: 复习完成后实时更新 Badge
 */
registerHandler(MessageTypes.UPDATE_WORD, async (message): Promise<Response<void>> => {
  const payload = message.payload as UpdateWordPayload;
  console.log('[LingoRecall] UPDATE_WORD:', payload.id);

  try {
    const result = await updateWordService(payload.id, payload.updates);

    // Story 3.2 - AC#4: 复习完成后实时更新 Badge
    // 异步更新 Badge，不阻塞响应返回
    if (result.success && payload.updates.nextReviewAt !== undefined) {
      checkAndUpdateBadge().catch((error) => {
        console.error('[LingoRecall] Failed to update badge after word update:', error);
      });
    }

    return result;
  } catch (error) {
    console.error('[LingoRecall] UPDATE_WORD error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '更新失败',
      },
    };
  }
});

/**
 * DELETE_WORD handler
 * 删除词汇记录
 * Story 2.2 - AC4 使用
 */
registerHandler(MessageTypes.DELETE_WORD, async (message): Promise<Response<void>> => {
  const payload = message.payload as DeleteWordPayload;
  console.log('[LingoRecall] DELETE_WORD:', payload.id);

  try {
    const result = await deleteWordService(payload.id);
    return result;
  } catch (error) {
    console.error('[LingoRecall] DELETE_WORD error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '删除失败',
      },
    };
  }
});

/**
 * JUMP_TO_SOURCE handler
 * 跳转到词汇原文页面
 * Story 2.3 - AC1, AC2, AC3 实现
 */
registerHandler(MessageTypes.JUMP_TO_SOURCE, async (message): Promise<Response<JumpToSourceResult>> => {
  const payload = message.payload as JumpToSourcePayload;
  console.log('[LingoRecall] JUMP_TO_SOURCE:', payload.sourceUrl);

  return handleJumpToSource(payload);
});

/**
 * REVIEW_WORD handler
 * 处理复习结果反馈
 * Story 3.4 - AC1, AC2, AC3 实现
 */
registerHandler(MessageTypes.REVIEW_WORD, async (message): Promise<Response<ReviewWordResult>> => {
  const payload = message.payload as ReviewWordPayload;
  return handleReviewWord(payload);
});

/**
 * TRANSLATE_PAGE_SEGMENT handler
 * 批量翻译页面文本段落
 * 用于全页翻译功能
 */
registerHandler(MessageTypes.TRANSLATE_PAGE_SEGMENT, async (message): Promise<Response<TranslatePageSegmentResult>> => {
  const payload = message.payload as TranslatePageSegmentPayload;
  console.log('[LingoRecall] TRANSLATE_PAGE_SEGMENT:', payload.texts.length, 'texts');

  try {
    // 使用缓存的配置
    const { settings, apiKey } = await getCachedConfig();

    // 验证 API 配置
    if (settings.aiProvider === 'gemini' && !apiKey) {
      return {
        success: false,
        error: {
          code: ErrorCode.AI_INVALID_KEY,
          message: '请先在设置中配置 Gemini API Key',
        },
      };
    }

    if (settings.aiProvider === 'openai-compatible' && !settings.customApiEndpoint) {
      console.error('[LingoRecall] TRANSLATE_PAGE_SEGMENT: No custom API endpoint configured');
      return {
        success: false,
        error: {
          code: ErrorCode.AI_API_ERROR,
          message: '请先在设置中配置自定义 API 端点',
        },
      };
    }

    // 构建 AI 配置
    const aiConfig = buildAIConfig(settings, apiKey);

    // 调试日志：打印配置信息
    console.log('[LingoRecall] TRANSLATE_PAGE_SEGMENT config:', {
      provider: aiConfig.provider,
      hasApiKey: !!aiConfig.apiKey,
      customEndpoint: aiConfig.customEndpoint,
      customModel: aiConfig.customModel,
    });

    // 确定目标语言
    const targetLanguage = (payload.targetLanguage || settings.targetLanguage || 'zh-CN') as import('../shared/types/settings').TargetLanguage;

    console.log('[LingoRecall] TRANSLATE_PAGE_SEGMENT: Starting translation to', targetLanguage, 'with', payload.texts.length, 'texts');

    // 调用批量翻译服务
    const translations = await translateBatchUnified(payload.texts, targetLanguage, aiConfig);

    console.log('[LingoRecall] TRANSLATE_PAGE_SEGMENT: Translation completed, got', translations.length, 'results');

    return {
      success: true,
      data: { translations },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LingoRecall] TRANSLATE_PAGE_SEGMENT error:', errorMessage);

    return {
      success: false,
      error: {
        code: ErrorCode.AI_API_ERROR,
        message: '批量翻译失败，请重试',
      },
    };
  }
});

// ============================================================
// API Connection Test Handlers
// ============================================================

/**
 * 检测是否为 CLI Proxy 的 API Key 格式
 * CLI Proxy 的 Key 格式: sk-cliproxy-*
 */
function isCliProxyApiKey(apiKey: string): boolean {
  return apiKey.startsWith('sk-cliproxy-');
}

/**
 * CLI Proxy 的默认端点
 */
const CLI_PROXY_ENDPOINT = 'http://localhost:8317/v1/chat/completions';

/**
 * 测试 OpenAI 兼容 API 连接
 * 提取为独立函数以便复用
 */
async function testOpenAICompatibleConnection(
  apiKey: string,
  endpoint: string,
  model: string,
  startTime: number
): Promise<TestApiConnectionResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'gpt-4',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 10,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: 'API Key 无效或权限不足',
          errorCode: 'API_KEY_INVALID',
        };
      }
      if (response.status === 429) {
        return {
          success: false,
          error: '请求过于频繁，请稍后再试',
          errorCode: 'RATE_LIMIT',
        };
      }
      if (response.status === 404) {
        return {
          success: false,
          error: 'API 端点不存在，请检查配置',
          errorCode: 'ENDPOINT_ERROR',
        };
      }
      return {
        success: false,
        error: `API 错误: ${response.status} ${errorText.slice(0, 100)}`,
        errorCode: 'ENDPOINT_ERROR',
      };
    }

    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: true,
      latencyMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: '连接超时，请检查网络和端点配置',
        errorCode: 'TIMEOUT',
      };
    }
    if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      return {
        success: false,
        error: '无法连接到 API 端点',
        errorCode: 'NETWORK_ERROR',
      };
    }
    throw error;
  }
}

/**
 * TEST_API_CONNECTION handler
 * 测试 Gemini 或 OpenAI 兼容 API 的连接
 *
 * 智能检测: 如果用户选择 Gemini 但使用 CLI Proxy 格式的 Key (sk-cliproxy-*)，
 * 会自动使用 OpenAI 兼容 API 进行测试
 */
registerHandler(MessageTypes.TEST_API_CONNECTION, async (message): Promise<Response<TestApiConnectionResult>> => {
  const payload = message.payload as TestApiConnectionPayload;
  const { provider, customEndpoint, customModel } = payload;
  let { apiKey } = payload;
  const startTime = performance.now();

  // 如果没有提供 API Key，尝试从存储中读取
  // 支持 gemini 和 openai-compatible 两种 provider
  if (!apiKey && (provider === 'gemini' || provider === 'openai-compatible')) {
    const apiKeyResult = await getApiKey();
    if (apiKeyResult.success && apiKeyResult.data) {
      apiKey = apiKeyResult.data;
    }
  }

  console.log('[LingoRecall] TEST_API_CONNECTION:', { provider, hasApiKey: !!apiKey, customEndpoint });

  try {
    if (provider === 'gemini') {
      // Gemini API 测试
      if (!apiKey) {
        return {
          success: true,
          data: {
            success: false,
            error: '请先输入 API Key',
            errorCode: 'API_KEY_INVALID',
          },
        };
      }

      // 智能检测: 如果是 CLI Proxy 格式的 Key，自动使用 OpenAI 兼容 API 测试
      if (isCliProxyApiKey(apiKey)) {
        console.log('[LingoRecall] Detected CLI Proxy API Key, using OpenAI-compatible test method');
        const result = await testOpenAICompatibleConnection(
          apiKey,
          CLI_PROXY_ENDPOINT,
          'gemini-2.0-flash-lite', // CLI Proxy 支持 Gemini 模型
          startTime
        );
        return { success: true, data: result };
      }

      try {
        // 使用 Gemini SDK 进行测试（原生 Google API Key）
        // validateGeminiApiKey 现在包含超时和重试机制
        const isValid = await validateGeminiApiKey(apiKey);
        const latencyMs = Math.round(performance.now() - startTime);

        if (isValid) {
          return {
            success: true,
            data: {
              success: true,
              latencyMs,
            },
          };
        } else {
          return {
            success: true,
            data: {
              success: false,
              error: 'API Key 无效或服务不可用',
              errorCode: 'API_KEY_INVALID',
            },
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const normalizedMessage = errorMessage.toUpperCase();
        console.error('[LingoRecall] Gemini API test error:', errorMessage);

        // 超时错误 - 提供友好的中文提示
        if (normalizedMessage.includes('TIMEOUT')) {
          return {
            success: true,
            data: {
              success: false,
              error: '连接超时，请检查网络或稍后重试',
              errorCode: 'TIMEOUT',
            },
          };
        }

        // 速率限制错误
        if (
          normalizedMessage.includes('RATE_LIMIT') ||
          normalizedMessage.includes('429') ||
          normalizedMessage.includes('RESOURCE_EXHAUSTED')
        ) {
          return {
            success: true,
            data: {
              success: false,
              error: '请求过于频繁，请稍后再试',
              errorCode: 'RATE_LIMIT',
            },
          };
        }

        // API Key 无效
        if (normalizedMessage.includes('API_KEY') || normalizedMessage.includes('INVALID')) {
          return {
            success: true,
            data: {
              success: false,
              error: 'API Key 无效',
              errorCode: 'API_KEY_INVALID',
            },
          };
        }

        // 网络错误
        if (normalizedMessage.includes('NETWORK') || normalizedMessage.includes('FETCH')) {
          return {
            success: true,
            data: {
              success: false,
              error: '网络连接失败，请检查网络',
              errorCode: 'NETWORK_ERROR',
            },
          };
        }

        return {
          success: true,
          data: {
            success: false,
            error: `测试失败: ${errorMessage}`,
            errorCode: 'UNKNOWN',
          },
        };
      }
    } else if (provider === 'openai-compatible') {
      // OpenAI 兼容 API 测试
      if (!customEndpoint) {
        return {
          success: true,
          data: {
            success: false,
            error: '请先配置 API 端点',
            errorCode: 'ENDPOINT_ERROR',
          },
        };
      }

      const result = await testOpenAICompatibleConnection(
        apiKey || '',
        customEndpoint,
        customModel || 'gpt-4',
        startTime
      );
      return { success: true, data: result };
    }

    // 不支持的 provider
    return {
      success: true,
      data: {
        success: false,
        error: '不支持测试此 Provider',
        errorCode: 'UNKNOWN',
      },
    };
  } catch (error) {
    console.error('[LingoRecall] TEST_API_CONNECTION error:', error);
    return {
      success: true,
      data: {
        success: false,
        error: error instanceof Error ? error.message : '发生未知错误',
        errorCode: 'UNKNOWN',
      },
    };
  }
});

// ============================================================
// Local Model Connection Handlers
// ============================================================

/**
 * TEST_LOCAL_CONNECTION handler
 * 测试本地模型服务连接
 * 通过 background service worker 转发请求，绕过 CORS 限制
 */
registerHandler(MessageTypes.TEST_LOCAL_CONNECTION, async (message): Promise<Response<TestLocalConnectionResult>> => {
  const payload = message.payload as TestLocalConnectionPayload;
  const { endpoint, modelName, tool } = payload;
  const toolConfig = LOCAL_TOOLS[tool];
  const startTime = performance.now();

  console.log('[LingoRecall] TEST_LOCAL_CONNECTION:', { endpoint, modelName, tool });

  try {
    // 1. 首先检查服务是否在运行
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: true,
          data: {
            success: false,
            error: `连接超时，请检查 ${toolConfig.name} 是否正在运行`,
            errorCode: 'TIMEOUT',
          },
        };
      }
      return {
        success: true,
        data: {
          success: false,
          error: `无法连接到 ${toolConfig.name}，请确保服务正在运行`,
          errorCode: 'CONNECTION_REFUSED',
        },
      };
    }

    // 2. 获取可用模型列表 (Ollama specific)
    let availableModels: string[] = [];
    if (tool === 'ollama' && toolConfig.modelListEndpoint) {
      try {
        const modelsResponse = await fetch(`${endpoint}${toolConfig.modelListEndpoint}`);
        const modelsData = await modelsResponse.json();
        availableModels = modelsData.models?.map((m: { name: string }) => m.name) || [];
      } catch {
        // Model list fetch failed, continue without it
      }
    }

    // 3. 发送测试请求
    const testEndpoint =
      tool === 'ollama' ? `${endpoint}/api/chat` : `${endpoint}${toolConfig.chatEndpoint}`;

    const testRequest =
      tool === 'ollama'
        ? {
            model: modelName,
            messages: [{ role: 'user', content: 'Say OK' }],
            stream: false,
          }
        : {
            model: modelName,
            messages: [{ role: 'user', content: 'Say OK' }],
            max_tokens: 10,
          };

    const testController = new AbortController();
    const testTimeoutId = setTimeout(() => testController.abort(), 30000);

    try {
      const response = await fetch(testEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testRequest),
        signal: testController.signal,
      });
      clearTimeout(testTimeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404 || errorText.includes('not found')) {
          return {
            success: true,
            data: {
              success: false,
              error: `未找到模型 "${modelName}"，请先下载该模型`,
              errorCode: 'MODEL_NOT_FOUND',
              availableModels,
            },
          };
        }
        return {
          success: true,
          data: {
            success: false,
            error: `服务器错误: ${response.status}`,
            errorCode: 'INVALID_RESPONSE',
            availableModels,
          },
        };
      }

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        success: true,
        data: {
          success: true,
          latencyMs,
          availableModels,
        },
      };
    } catch (error) {
      clearTimeout(testTimeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: true,
          data: {
            success: false,
            error: '模型响应超时，可能正在加载中，请稍后重试',
            errorCode: 'TIMEOUT',
            availableModels,
          },
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('[LingoRecall] TEST_LOCAL_CONNECTION error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          success: true,
          data: {
            success: false,
            error: `无法连接到 ${toolConfig.name}`,
            errorCode: 'CONNECTION_REFUSED',
          },
        };
      }
    }
    return {
      success: true,
      data: {
        success: false,
        error: '发生未知错误',
        errorCode: 'INVALID_RESPONSE',
      },
    };
  }
});

/**
 * GET_LOCAL_MODELS handler
 * 获取本地模型列表
 * 通过 background service worker 转发请求，绕过 CORS 限制
 */
registerHandler(MessageTypes.GET_LOCAL_MODELS, async (message): Promise<Response<GetLocalModelsResult>> => {
  const payload = message.payload as GetLocalModelsPayload;
  const { endpoint, tool } = payload;

  console.log('[LingoRecall] GET_LOCAL_MODELS:', { endpoint, tool });

  // 仅 Ollama 支持模型列表查询
  if (tool !== 'ollama') {
    return {
      success: true,
      data: { models: [] },
    };
  }

  try {
    const response = await fetch(`${endpoint}/api/tags`);
    if (!response.ok) {
      return {
        success: true,
        data: { models: [] },
      };
    }
    const data = await response.json();
    const models = data.models?.map((m: { name: string }) => m.name) || [];
    return {
      success: true,
      data: { models },
    };
  } catch (error) {
    console.error('[LingoRecall] GET_LOCAL_MODELS error:', error);
    return {
      success: true,
      data: { models: [] },
    };
  }
});

// ============================================================
// Initialize Message Router
// ============================================================

initMessageRouter();

// ============================================================
// Extension Lifecycle Events
// ============================================================

/**
 * Service Worker installation event
 * Story 2.1 - AC3: 首次使用时自动创建数据库
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[LingoRecall] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // First installation - initialize IndexedDB
    console.log('[LingoRecall] First installation, initializing database...');
    try {
      await getDatabase();
      console.log('[LingoRecall] Database initialized successfully');
    } catch (error) {
      console.error('[LingoRecall] Failed to initialize database:', error);
    }
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('[LingoRecall] Extension updated from', details.previousVersion);
    // Database migrations are handled automatically by IndexedDB version upgrade
    try {
      await getDatabase();
      console.log('[LingoRecall] Database ready after update');
    } catch (error) {
      console.error('[LingoRecall] Failed to open database after update:', error);
    }
  }

  // Story 3.1 - AC2: 设置复习检查 Alarm
  try {
    await setupReviewAlarm();
    console.log('[LingoRecall] Review alarm setup complete');
  } catch (error) {
    console.error('[LingoRecall] Failed to setup review alarm:', error);
  }

  // Story 3.2 - Task 6: 安装/更新后立即同步 Badge 状态
  try {
    await checkAndUpdateBadge();
    console.log('[LingoRecall] Badge updated on install/update');
  } catch (error) {
    console.error('[LingoRecall] Failed to update badge on install/update:', error);
  }
});

/**
 * Extension startup event
 * Story 3.1 - 浏览器启动时检查待复习词汇
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[LingoRecall] Extension started (browser opened)');

  // Story 3.1 - AC2: 检查待复习词汇并更新 Badge
  try {
    await checkAndUpdateBadge();
    console.log('[LingoRecall] Badge updated on startup');
  } catch (error) {
    console.error('[LingoRecall] Failed to update badge on startup:', error);
  }
});

// ============================================================
// Story 3.1: Alarm Listener
// ============================================================

/**
 * Alarm event listener
 * Story 3.1 - AC2: 处理定时检查事件
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[LingoRecall] Alarm triggered:', alarm.name);
  await handleReviewAlarm(alarm);
});

// ============================================================
// Story 4.3: Icon State Management for Blacklisted Sites
// ============================================================

/**
 * 从存储加载黑名单设置
 */
async function getBlacklistFromStorage(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const settings = result[STORAGE_KEYS.SETTINGS] as Partial<Settings> | undefined;
    return settings?.blacklistUrls || [...DEFAULT_SETTINGS.blacklistUrls];
  } catch {
    return [...DEFAULT_SETTINGS.blacklistUrls];
  }
}

/**
 * 更新标签页的图标状态
 * Story 4.3 - AC3: 扩展图标显示禁用状态
 *
 * @param tabId - 标签页 ID
 * @param disabled - 是否禁用
 */
async function updateIconState(tabId: number, disabled: boolean): Promise<void> {
  try {
    if (disabled) {
      // 设置为灰色图标和禁用提示
      // 注意：由于我们没有创建灰色图标，这里使用 setBadgeText 显示禁用状态
      await chrome.action.setBadgeText({ tabId, text: '×' });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#9CA3AF' }); // gray-400
      await chrome.action.setTitle({
        tabId,
        title: 'LingoRecall - 在此网站已禁用（黑名单）',
      });
    } else {
      // 恢复正常状态 - 清除禁用标记
      // Badge 会由复习提醒系统管理
      await chrome.action.setTitle({
        tabId,
        title: 'LingoRecall AI - 智能划词翻译与记忆助手',
      });
      // 重新检查待复习数量并更新 Badge
      await checkAndUpdateBadge();
    }
    console.log(`[LingoRecall] Icon state updated for tab ${tabId}: disabled=${disabled}`);
  } catch (error) {
    console.warn('[LingoRecall] Failed to update icon state:', error);
  }
}

/**
 * UPDATE_ICON_STATE 消息处理器
 * 接收来自 Content Script 的图标状态更新请求
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_ICON_STATE') {
    const tabId = sender.tab?.id;
    const disabled = message.payload?.disabled ?? false;

    if (tabId) {
      updateIconState(tabId, disabled)
        .then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }));
      return true; // 异步响应
    }

    sendResponse({ success: false, error: 'No tab ID' });
  }
});

/**
 * 标签页导航完成时检查黑名单
 * Story 4.3 - AC3: 页面导航时更新图标状态
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 只在页面加载完成时检查
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  // 跳过 chrome:// 和扩展页面
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  try {
    const blacklist = await getBlacklistFromStorage();
    const isBlacklisted = matchesBlacklist(tab.url, blacklist);

    if (isBlacklisted) {
      await updateIconState(tabId, true);
    }
    // 非黑名单状态由 Content Script 通知更新，或者保持当前状态
  } catch (error) {
    console.warn('[LingoRecall] Failed to check blacklist on tab update:', error);
  }
});

// Export for testing purposes
export {};
