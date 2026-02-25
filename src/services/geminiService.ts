/**
 * LingoRecall AI - Gemini AI Service
 * 提供与 Google Gemini API 的交互功能
 *
 * @module services/geminiService
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import type { TargetLanguage } from '../shared/types/settings';
import {
  buildWordAnalysisPrompt as buildWordPrompt,
  buildTranslationPrompt as buildTranslatePrompt,
  getFallbackMeaningMessage,
  buildBatchTranslationPrompt,
  parseBatchTranslationResponse,
} from './promptTemplates';
import { trackUsage } from './usageService';
import {
  checkRateLimit,
  onRequestStart,
  onRequestSuccess,
  onRateLimitError,
  onRequestError,
  is429Error,
} from './rateLimiter';

/**
 * 分析模式类型
 * 'word' - 单词/短语分析模式（默认）
 * 'translate' - 段落翻译模式
 */
export type AnalysisMode = 'word' | 'translate';

/**
 * AI 分析结果接口
 * 对应 Story 1.6 的 AC-2 要求
 */
export interface AIAnalysisResult {
  /** 词汇含义（中文）或翻译结果 */
  meaning: string;
  /** IPA 音标（翻译模式为空） */
  pronunciation: string;
  /** 词性（翻译模式为空） */
  partOfSpeech: string;
  /** 语境用法说明（翻译模式为空） */
  usage: string;
  /** 使用的分析模式 */
  mode?: AnalysisMode;
}

/**
 * 分析请求负载
 */
export interface AnalyzeWordRequest {
  /** 选中的单词/短语 */
  text: string;
  /** 上下文文本 */
  context: string;
  /** 来源 URL */
  url: string;
  /** XPath 定位 */
  xpath: string;
  /** 分析模式（可选） */
  mode?: AnalysisMode;
  /** 目标翻译语言（可选，默认 'zh-CN'） */
  targetLanguage?: TargetLanguage;
}

/** 默认模型 - 使用配额更高的稳定版 */
const DEFAULT_MODEL = 'gemini-2.0-flash';

/** 响应时间上限（毫秒）- Story 1.6 AC-3
 * 从 8s 提升至 15s：解决 Service Worker 冷启动后首次请求超时问题。
 * 冷启动耗时包括：SW 初始化 + DNS 解析 + TLS 握手 + Gemini 服务端冷启动 + AI 生成，
 * 实测合计 ~3.5-9.5s，8s 限制在冷启动场景下经常不够用。
 */
const RESPONSE_TIMEOUT_MS = 15000;

/** 批量翻译最大重试次数（从 3 降至 2，减少用户等待） */
const MAX_RETRIES = 2;

/** 单词分析最大重试次数（从 3 降至 2，减少用户等待） */
const ANALYZE_MAX_RETRIES = 2;

/** 初始重试延迟（毫秒）— 从 1000 增至 2000，更温和的重试 */
const INITIAL_RETRY_DELAY_MS = 2000;

/** 最大重试延迟（毫秒）— 从 8000 增至 15000，给限流窗口更多恢复时间 */
const MAX_RETRY_DELAY_MS = 15000;

/** API Key 验证超时（毫秒）— 使用轻量级 REST 端点，不需要太长 */
const VALIDATE_TIMEOUT_MS = 8000;

/** API Key 验证最大重试次数 */
const VALIDATE_MAX_RETRIES = 1;

/** Google AI REST API 基础 URL（用于轻量级验证） */
const GOOGLE_AI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * 模型实例缓存
 * 复用 GoogleGenerativeAI 和 GenerativeModel 实例，
 * 避免每次请求都创建新实例，减少连接建立开销。
 * Service Worker 重启后缓存自然清空。
 */
const modelCache = new Map<string, { genAI: GoogleGenerativeAI; model: GenerativeModel }>();

/**
 * 获取 Gemini 模型实例（带缓存）
 *
 * @param apiKey - Google AI API Key
 * @param modelName - 模型名称，默认 gemini-2.0-flash
 * @returns GenerativeModel 实例
 */
function getModel(apiKey: string, modelName: string = DEFAULT_MODEL): GenerativeModel {
  const cacheKey = `${apiKey}:${modelName}`;
  const cached = modelCache.get(cacheKey);
  if (cached) {
    return cached.model;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  modelCache.set(cacheKey, { genAI, model });
  return model;
}

/** 默认目标语言 */
const DEFAULT_TARGET_LANGUAGE: TargetLanguage = 'zh-CN';

/**
 * 根据分析模式和目标语言选择合适的 prompt
 *
 * @param text - 选中的文本
 * @param context - 上下文
 * @param mode - 分析模式
 * @param targetLanguage - 目标翻译语言
 * @returns 格式化的 prompt
 */
function buildAnalysisPrompt(
  text: string,
  context: string,
  mode: AnalysisMode = 'word',
  targetLanguage: TargetLanguage = DEFAULT_TARGET_LANGUAGE
): string {
  if (mode === 'translate') {
    return buildTranslatePrompt(text, targetLanguage);
  }
  return buildWordPrompt(text, context, targetLanguage);
}

/**
 * 解析 AI 响应
 * 尝试解析 JSON，失败则使用原始文本
 *
 * @param response - AI 响应文本
 * @param mode - 分析模式
 * @param targetLanguage - 目标语言（用于生成本地化的回退消息）
 * @returns 解析后的结果
 */
function parseAIResponse(
  response: string,
  mode: AnalysisMode = 'word',
  targetLanguage: TargetLanguage = DEFAULT_TARGET_LANGUAGE
): AIAnalysisResult {
  const fallbackMessage = getFallbackMeaningMessage(targetLanguage);

  // 尝试提取 JSON 部分（可能被 markdown 包裹）
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        meaning: parsed.meaning || fallbackMessage,
        pronunciation: mode === 'word' ? (parsed.pronunciation || '') : '',
        partOfSpeech: mode === 'word' ? (parsed.partOfSpeech || '') : '',
        usage: mode === 'word' ? (parsed.usage || '') : '',
        mode,
      };
    } catch {
      // JSON 解析失败
    }
  }

  // 回退：使用原始响应作为含义
  return {
    meaning: response.trim() || fallbackMessage,
    pronunciation: '',
    partOfSpeech: '',
    usage: '',
    mode,
  };
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 计算指数退避延迟（带抖动）
 */
function getRetryDelay(retryCount: number): number {
  const delay = Math.min(
    INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
    MAX_RETRY_DELAY_MS
  );
  // 添加 ±20% 的随机抖动，避免多个请求同时重试
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}

/**
 * 错误信息接口
 * 用于统一处理各种格式的错误对象
 */
interface ErrorInfo {
  message: string;
  status?: number;
  code?: string;
  isRetryable: boolean;
}

/**
 * 从各种错误格式中提取标准化的错误信息
 * 支持 Error 实例、Google API 错误对象、以及其他对象格式
 *
 * 可重试的错误类型：
 * - 速率限制 (429 / RATE_LIMIT / RESOURCE_EXHAUSTED / QUOTA_EXCEEDED)
 * - 超时 (TIMEOUT) - 冷启动场景下首次请求超时，重试通常能成功
 * - 网络错误 (FETCH / NETWORK / ECONNRESET) - 瞬时网络波动
 *
 * @param error - 任意类型的错误
 * @returns 标准化的错误信息
 */
function extractErrorInfo(error: unknown): ErrorInfo {
  // 处理 Error 实例
  if (error instanceof Error) {
    const message = error.message.toUpperCase();
    const isRetryable =
      message.includes('429') ||
      message.includes('RATE_LIMIT') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('QUOTA_EXCEEDED') ||
      message.includes('TIMEOUT') ||
      message.includes('FAILED TO FETCH') ||
      message.includes('NETWORK') ||
      message.includes('ECONNRESET');

    return {
      message: error.message,
      isRetryable,
    };
  }

  // 处理对象形式的错误 (Google API 可能返回这种格式)
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;

    // 提取 status code
    const status = typeof errObj.status === 'number' ? errObj.status : undefined;
    const code = typeof errObj.code === 'string' ? errObj.code : undefined;

    // 提取消息 - 尝试多种可能的字段
    let message = 'Unknown error';
    if (typeof errObj.message === 'string' && errObj.message) {
      message = errObj.message;
    } else if (typeof errObj.error === 'string' && errObj.error) {
      message = errObj.error;
    } else if (typeof errObj.details === 'string' && errObj.details) {
      message = errObj.details;
    } else if (errObj.error && typeof errObj.error === 'object') {
      // 处理嵌套的 error 对象 (如 { error: { message: '...' } })
      const nestedError = errObj.error as Record<string, unknown>;
      if (typeof nestedError.message === 'string') {
        message = nestedError.message;
      }
    }

    // 检查是否可重试（包含超时和网络错误）
    const normalizedMessage = message.toUpperCase();
    const isRetryable =
      status === 429 ||
      status === 503 ||
      code === 'RESOURCE_EXHAUSTED' ||
      code === 'RATE_LIMIT_EXCEEDED' ||
      normalizedMessage.includes('429') ||
      normalizedMessage.includes('RATE_LIMIT') ||
      normalizedMessage.includes('QUOTA_EXCEEDED') ||
      normalizedMessage.includes('RESOURCE_EXHAUSTED') ||
      normalizedMessage.includes('TIMEOUT') ||
      normalizedMessage.includes('FAILED TO FETCH') ||
      normalizedMessage.includes('NETWORK') ||
      normalizedMessage.includes('ECONNRESET');

    return { message, status, code, isRetryable };
  }

  // 处理字符串错误
  if (typeof error === 'string') {
    const normalizedMessage = error.toUpperCase();
    const isRetryable =
      normalizedMessage.includes('429') ||
      normalizedMessage.includes('RATE_LIMIT') ||
      normalizedMessage.includes('QUOTA_EXCEEDED') ||
      normalizedMessage.includes('TIMEOUT') ||
      normalizedMessage.includes('NETWORK');
    return { message: error, isRetryable };
  }

  return { message: String(error), isRetryable: false };
}

/**
 * 检查错误是否可重试（如速率限制）
 * 使用 extractErrorInfo 统一处理各种错误格式
 */
function isRetryableError(error: unknown): boolean {
  const info = extractErrorInfo(error);
  return info.isRetryable;
}

/**
 * 为异步请求添加超时控制
 * 超时后抛出带标识的错误，避免无响应等待
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let didTimeout = false;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    if (didTimeout) {
      promise.catch(() => undefined);
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * 分析单词/短语
 * 调用 Gemini API 获取语境分析结果
 *
 * @param request - 分析请求
 * @param apiKey - Google AI API Key
 * @param modelName - 可选模型名称
 * @returns AI 分析结果
 * @throws Error 如果 API 调用失败
 *
 * @example
 * const result = await analyzeWord({
 *   text: 'eloquent',
 *   context: 'She gave an eloquent speech about climate change.',
 *   url: 'https://example.com',
 *   xpath: '/html/body/p[1]'
 * }, 'your-api-key');
 */
export async function analyzeWord(
  request: AnalyzeWordRequest,
  apiKey: string,
  modelName?: string
): Promise<AIAnalysisResult> {
  const startTime = Date.now();
  const mode = request.mode || 'word';
  const targetLanguage = request.targetLanguage || DEFAULT_TARGET_LANGUAGE;

  const model = getModel(apiKey, modelName);
  const prompt = buildAnalysisPrompt(request.text, request.context, mode, targetLanguage);

  // 翻译模式可能需要更长时间处理长文本
  const timeout = mode === 'translate' ? RESPONSE_TIMEOUT_MS * 3 : RESPONSE_TIMEOUT_MS;

  // 速率限制器预检查：熔断器打开时立即拒绝
  const rateLimitCheck = checkRateLimit();
  if (!rateLimitCheck.allowed) {
    console.warn(`[LingoRecall] analyzeWord blocked by rate limiter: ${rateLimitCheck.reason}`);
    throw new Error(`${rateLimitCheck.reason}: Too many requests. Please try again later.`);
  }

  let lastError: Error | null = null;

  // 使用指数退避重试（处理速率限制 429 错误）
  for (let retryCount = 0; retryCount <= ANALYZE_MAX_RETRIES; retryCount++) {
    try {
      // 每次 API 调用前检查速率限制间隔
      const preCheck = checkRateLimit();
      if (!preCheck.allowed) {
        throw new Error(`${preCheck.reason}: Too many requests. Please try again later.`);
      }
      if (preCheck.waitMs > 0) {
        console.log(`[LingoRecall] Waiting ${preCheck.waitMs}ms before API call (rate limit spacing)`);
        await sleep(preCheck.waitMs);
      }

      onRequestStart();

      const result = await withTimeout(
        model.generateContent(prompt),
        timeout,
        `TIMEOUT: AI response exceeded ${timeout / 1000}s limit.`
      );

      const response = result.response;
      const text = response.text();

      // 标记请求成功
      onRequestSuccess();

      // 追踪 token 使用量 (Gemini API 提供 usageMetadata)
      const usageMetadata = response.usageMetadata;
      if (usageMetadata) {
        const inputTokens = usageMetadata.promptTokenCount || 0;
        const outputTokens = usageMetadata.candidatesTokenCount || 0;
        const actualModelName = modelName || DEFAULT_MODEL;
        // 异步追踪，不阻塞主流程
        trackUsage(inputTokens, outputTokens, actualModelName).catch((err) => {
          console.warn('[LingoRecall Usage] Failed to track Gemini usage:', err);
        });
      }

      const elapsed = Date.now() - startTime;
      console.log(`[LingoRecall] AI response in ${elapsed}ms (mode: ${mode}, lang: ${targetLanguage})`);

      // Story 1.6 AC-3: 响应时间监控（翻译模式允许更长时间）
      const expectedTimeout = mode === 'translate' ? RESPONSE_TIMEOUT_MS * 3 : RESPONSE_TIMEOUT_MS;
      if (elapsed > expectedTimeout) {
        console.warn(`[LingoRecall] Slow AI response: ${elapsed}ms`);
      }

      return parseAIResponse(text, mode, targetLanguage);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 通知速率限制器
      if (is429Error(error)) {
        onRateLimitError();
      } else {
        onRequestError();
      }

      // 检测是否为可重试的错误（超时、速率限制、网络波动）
      if (isRetryableError(error) && retryCount < ANALYZE_MAX_RETRIES) {
        // 429 错误且熔断器已打开，不再重试
        const circuitCheck = checkRateLimit();
        if (!circuitCheck.allowed) {
          throw new Error(`${circuitCheck.reason}: Too many requests. Please try again later.`);
        }

        const delay = getRetryDelay(retryCount);
        const errorInfo = extractErrorInfo(error);
        const reason = errorInfo.message.toUpperCase().includes('TIMEOUT') ? 'timeout' :
                       errorInfo.message.toUpperCase().includes('429') ? 'rate_limit' : 'network';
        console.warn(
          `[LingoRecall] Retryable error (${reason}) in analyzeWord, retrying in ${delay}ms (attempt ${retryCount + 1}/${ANALYZE_MAX_RETRIES})`
        );
        await sleep(delay);
        continue;
      }

      // 不可重试的错误或已达最大重试次数
      const errorInfo = extractErrorInfo(error);
      console.error('[LingoRecall] Gemini API error:', errorInfo.message);
      console.error('[LingoRecall] Full error details:', error);

      const normalizedMessage = errorInfo.message.toUpperCase();

      // 检测特定错误类型并抛出标准 Error
      if (normalizedMessage.includes('API_KEY') || normalizedMessage.includes('INVALID_API_KEY')) {
        throw new Error('API_KEY_INVALID: Please check your API key configuration.');
      }
      if (normalizedMessage.includes('CIRCUIT_OPEN')) {
        throw new Error('CIRCUIT_OPEN: Too many requests. Please try again later.');
      }
      // 注意：TIMEOUT 和 NETWORK 必须先于 isRetryable 检查，
      // 因为 isRetryable 包含这些类型，但它们有不同的错误码
      if (normalizedMessage.includes('TIMEOUT')) {
        throw new Error('TIMEOUT: Request timed out. Please try again.');
      }
      if (normalizedMessage.includes('FETCH') || normalizedMessage.includes('NETWORK')) {
        throw new Error('NETWORK_ERROR: Please check your internet connection.');
      }
      if (errorInfo.isRetryable || normalizedMessage.includes('RATE_LIMIT') || normalizedMessage.includes('429') || errorInfo.status === 429) {
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.');
      }

      // 确保抛出 Error 实例，包含提取的消息
      throw new Error(errorInfo.message);
    }
  }

  // 重试耗尽，抛出最后的错误
  if (lastError) {
    const errorInfo = extractErrorInfo(lastError);
    if (errorInfo.isRetryable) {
      throw new Error('RATE_LIMIT: Too many requests. Please try again later.');
    }
    throw lastError;
  }

  // 理论上不会到达这里，但 TypeScript 需要返回值
  throw new Error('Unexpected error in analyzeWord');
}

/**
 * 批量翻译文本
 * 用于全页翻译功能
 * 支持指数退避重试机制处理速率限制
 *
 * @param texts - 待翻译的文本数组
 * @param targetLanguage - 目标翻译语言
 * @param apiKey - Google AI API Key
 * @param modelName - 可选模型名称
 * @returns 翻译后的文本数组
 */
export async function translateBatchGemini(
  texts: string[],
  targetLanguage: TargetLanguage,
  apiKey: string,
  modelName?: string
): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  const model = getModel(apiKey, modelName);
  const prompt = buildBatchTranslationPrompt(texts, targetLanguage);
  const timeout = RESPONSE_TIMEOUT_MS * 6; // 批量翻译允许更长时间（90秒）

  // 速率限制器预检查
  const rateLimitCheck = checkRateLimit();
  if (!rateLimitCheck.allowed) {
    console.warn(`[LingoRecall] translateBatchGemini blocked by rate limiter: ${rateLimitCheck.reason}`);
    throw new Error(`${rateLimitCheck.reason}: Too many requests. Please try again later.`);
  }

  let lastError: Error | null = null;

  // 使用指数退避重试
  for (let retryCount = 0; retryCount <= MAX_RETRIES; retryCount++) {
    try {
      // 每次 API 调用前检查速率限制间隔
      const preCheck = checkRateLimit();
      if (!preCheck.allowed) {
        throw new Error(`${preCheck.reason}: Too many requests. Please try again later.`);
      }
      if (preCheck.waitMs > 0) {
        console.log(`[LingoRecall] Waiting ${preCheck.waitMs}ms before batch API call (rate limit spacing)`);
        await sleep(preCheck.waitMs);
      }

      onRequestStart();

      const result = await withTimeout(
        model.generateContent(prompt),
        timeout,
        `TIMEOUT: Batch translation exceeded ${timeout / 1000}s limit.`
      );

      const response = result.response;
      const text = response.text();

      // 标记请求成功
      onRequestSuccess();

      // 追踪 token 使用量
      const usageMetadata = response.usageMetadata;
      if (usageMetadata) {
        const inputTokens = usageMetadata.promptTokenCount || 0;
        const outputTokens = usageMetadata.candidatesTokenCount || 0;
        const actualModelName = modelName || DEFAULT_MODEL;
        trackUsage(inputTokens, outputTokens, actualModelName).catch((err) => {
          console.warn('[LingoRecall Usage] Failed to track Gemini batch usage:', err);
        });
      }

      return parseBatchTranslationResponse(text, texts);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;

      // 通知速率限制器
      if (is429Error(error)) {
        onRateLimitError();
      } else {
        onRequestError();
      }

      // 检测是否为可重试的错误（超时、速率限制、网络波动）
      if (isRetryableError(error) && retryCount < MAX_RETRIES) {
        // 429 错误且熔断器已打开，不再重试
        const circuitCheck = checkRateLimit();
        if (!circuitCheck.allowed) {
          throw new Error(`${circuitCheck.reason}: Too many requests. Please try again later.`);
        }

        const delay = getRetryDelay(retryCount);
        const reason = lastError.message.toUpperCase().includes('TIMEOUT') ? 'timeout' :
                       lastError.message.toUpperCase().includes('429') ? 'rate_limit' : 'network';
        console.warn(
          `[LingoRecall] Retryable error (${reason}) in batch translation, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
        );
        await sleep(delay);
        continue;
      }

      // 不可重试的错误或已达最大重试次数
      console.error('[LingoRecall] Gemini batch translation error:', errorMessage);

      // 检测特定错误类型
      if (errorMessage.toUpperCase().includes('API_KEY')) {
        throw new Error('API_KEY_INVALID: Please check your API key configuration.');
      }
      if (errorMessage.toUpperCase().includes('CIRCUIT_OPEN')) {
        throw new Error('CIRCUIT_OPEN: Too many requests. Please try again later.');
      }
      if (errorMessage.toUpperCase().includes('RATE_LIMIT') || errorMessage.includes('429')) {
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.');
      }
      if (errorMessage.toUpperCase().includes('TIMEOUT')) {
        throw new Error('TIMEOUT: Request timed out. Please try again.');
      }

      // 其他错误，返回原文
      return texts;
    }
  }

  // 重试耗尽，抛出最后的错误
  if (lastError) {
    throw lastError;
  }
  return texts;
}

/**
 * 验证 API Key 是否有效
 * 通过发送简单请求测试
 * 包含超时控制和重试机制，避免无限等待
 *
 * @param apiKey - 要验证的 API Key
 * @returns 是否有效
 * @throws Error 如果发生超时或其他可识别的错误
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim() === '') {
    return false;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= VALIDATE_MAX_RETRIES; attempt++) {
    try {
      // 使用轻量级 REST API（列出模型）验证 Key，避免完整的 AI 生成
      // models.list 只检查 Key 有效性，不消耗 token，延迟 ~300-800ms
      const response = await withTimeout(
        fetch(`${GOOGLE_AI_API_BASE}/models?key=${apiKey}&pageSize=1`),
        VALIDATE_TIMEOUT_MS,
        'TIMEOUT: API validation timed out.'
      );

      if (response.ok) {
        return true;
      }

      // HTTP 错误处理
      const status = response.status;
      if (status === 400 || status === 401 || status === 403) {
        // Key 无效或无权限
        console.error(`[LingoRecall] API validation failed: HTTP ${status}`);
        return false;
      }
      if (status === 429) {
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.');
      }

      // 其他 HTTP 错误
      console.error(`[LingoRecall] API validation unexpected status: ${status}`);
      return false;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message.toUpperCase();

      // 检查是否为可重试错误（超时、速率限制、网络波动等）
      if (isRetryableError(error) && attempt < VALIDATE_MAX_RETRIES) {
        const delay = getRetryDelay(attempt);
        const reason = errorMessage.includes('TIMEOUT') ? 'timeout' :
                       errorMessage.includes('429') ? 'rate_limit' : 'network';
        console.log(
          `[LingoRecall] API validation retry (${reason}) ${attempt + 1}/${VALIDATE_MAX_RETRIES} in ${delay}ms`
        );
        await sleep(delay);
        continue;
      }

      // 超时错误（已耗尽重试）- 抛出以便上层处理
      if (errorMessage.includes('TIMEOUT')) {
        console.error('[LingoRecall] API validation timed out after retries:', lastError.message);
        throw lastError;
      }

      // 速率限制错误 - 抛出以便上层显示友好消息
      if (
        errorMessage.includes('429') ||
        errorMessage.includes('RATE_LIMIT') ||
        errorMessage.includes('RESOURCE_EXHAUSTED')
      ) {
        console.error('[LingoRecall] API validation rate limited:', lastError.message);
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.');
      }

      // API Key 无效 - 返回 false
      if (errorMessage.includes('API_KEY') || errorMessage.includes('INVALID')) {
        console.error('[LingoRecall] API validation failed - invalid key:', lastError.message);
        return false;
      }

      // 其他错误 - 记录并返回 false
      console.error('[LingoRecall] API validation failed:', lastError.message);
      return false;
    }
  }

  // 重试耗尽
  console.error('[LingoRecall] API validation failed after retries:', lastError?.message);
  return false;
}

/**
 * 测试辅助导出
 */
export const __test__ = {
  buildAnalysisPrompt,
  parseAIResponse,
  withTimeout,
};
