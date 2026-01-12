/**
 * LingoRecall AI - Gemini AI Service
 * 提供与 Google Gemini API 的交互功能
 *
 * @module services/geminiService
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

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
}

/** 默认模型 */
const DEFAULT_MODEL = 'gemini-2.0-flash-exp';

/** 响应时间上限（毫秒）- Story 1.6 AC-3 */
const RESPONSE_TIMEOUT_MS = 3000;

/**
 * 获取 Gemini 模型实例
 *
 * @param apiKey - Google AI API Key
 * @param modelName - 模型名称，默认 gemini-2.0-flash-exp
 * @returns GenerativeModel 实例
 */
function getModel(apiKey: string, modelName: string = DEFAULT_MODEL): GenerativeModel {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * 构建单词/短语分析 prompt
 * 针对英语学习者优化，返回 JSON 格式
 *
 * @param text - 选中的单词/短语
 * @param context - 上下文
 * @returns 格式化的 prompt
 */
function buildWordAnalysisPrompt(text: string, context: string): string {
  return `你是一个专业的英语词汇教师，帮助中国学生学习英语。

用户在阅读英文文章时选中了一个单词或短语，需要你根据上下文提供准确的解释。

**选中的单词/短语**: "${text}"

**上下文**: "${context}"

请提供以下信息（JSON 格式）：
1. meaning: 在当前语境中的准确含义（中文，简洁明了）
2. pronunciation: IPA 音标（如果是短语则省略）
3. partOfSpeech: 词性（名词、动词、形容词等）
4. usage: 一句简短的用法说明或例句（中英对照）

**重要要求**：
- 必须根据上下文语境给出准确含义，而非通用释义
- 回复必须是有效的 JSON 格式
- 不要添加任何额外的说明文字

**回复格式**：
{
  "meaning": "含义",
  "pronunciation": "/发音/",
  "partOfSpeech": "词性",
  "usage": "用法说明"
}`;
}

/**
 * 构建段落翻译 prompt
 * 用于较长文本的翻译
 *
 * @param text - 选中的段落文本
 * @returns 格式化的 prompt
 */
function buildTranslationPrompt(text: string): string {
  return `你是一个专业的英汉翻译专家，帮助中国用户理解英文内容。

用户在阅读英文文章时选中了一段文字，需要你提供准确、流畅的中文翻译。

**选中的文字**:
"${text}"

请提供以下信息（JSON 格式）：
1. meaning: 完整的中文翻译（保持原文的语气和风格，流畅自然）

**重要要求**：
- 翻译要准确传达原文意思
- 保持原文的语气和文风
- 翻译要流畅自然，符合中文表达习惯
- 回复必须是有效的 JSON 格式
- 不要添加任何额外的说明文字

**回复格式**：
{
  "meaning": "翻译结果"
}`;
}

/**
 * 根据分析模式选择合适的 prompt
 *
 * @param text - 选中的文本
 * @param context - 上下文
 * @param mode - 分析模式
 * @returns 格式化的 prompt
 */
function buildAnalysisPrompt(text: string, context: string, mode: AnalysisMode = 'word'): string {
  if (mode === 'translate') {
    return buildTranslationPrompt(text);
  }
  return buildWordAnalysisPrompt(text, context);
}

/**
 * 解析 AI 响应
 * 尝试解析 JSON，失败则使用原始文本
 *
 * @param response - AI 响应文本
 * @param mode - 分析模式
 * @returns 解析后的结果
 */
function parseAIResponse(response: string, mode: AnalysisMode = 'word'): AIAnalysisResult {
  // 尝试提取 JSON 部分（可能被 markdown 包裹）
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        meaning: parsed.meaning || '(无法获取含义)',
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
    meaning: response.trim() || '(无法获取含义)',
    pronunciation: '',
    partOfSpeech: '',
    usage: '',
    mode,
  };
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

  try {
    const model = getModel(apiKey, modelName);
    const prompt = buildAnalysisPrompt(request.text, request.context, mode);

    // 翻译模式可能需要更长时间处理长文本
    const timeout = mode === 'translate' ? RESPONSE_TIMEOUT_MS * 3 : RESPONSE_TIMEOUT_MS;

    const result = await withTimeout(
      model.generateContent(prompt),
      timeout,
      `TIMEOUT: AI response exceeded ${timeout / 1000}s limit.`
    );

    const response = result.response;
    const text = response.text();

    const elapsed = Date.now() - startTime;
    console.log(`[LingoRecall] AI response in ${elapsed}ms (mode: ${mode})`);

    // Story 1.6 AC-3: 响应时间应 < 3 秒（翻译模式允许更长时间）
    const expectedTimeout = mode === 'translate' ? RESPONSE_TIMEOUT_MS * 3 : RESPONSE_TIMEOUT_MS;
    if (elapsed > expectedTimeout) {
      console.warn(`[LingoRecall] Slow AI response: ${elapsed}ms`);
    }

    return parseAIResponse(text, mode);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const normalizedMessage = errorMessage.toUpperCase();
    console.error('[LingoRecall] Gemini API error:', errorMessage);

    // 检测特定错误类型
    if (normalizedMessage.includes('API_KEY')) {
      throw new Error('API_KEY_INVALID: Please check your API key configuration.');
    }
    if (normalizedMessage.includes('RATE_LIMIT') || normalizedMessage.includes('429')) {
      throw new Error('RATE_LIMIT: Too many requests. Please try again later.');
    }
    if (normalizedMessage.includes('TIMEOUT')) {
      throw new Error('TIMEOUT: Request timed out. Please try again.');
    }
    if (normalizedMessage.includes('FETCH') || normalizedMessage.includes('NETWORK')) {
      throw new Error('NETWORK_ERROR: Please check your internet connection.');
    }

    throw error;
  }
}

/**
 * 验证 API Key 是否有效
 * 通过发送简单请求测试
 *
 * @param apiKey - 要验证的 API Key
 * @returns 是否有效
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim() === '') {
    return false;
  }

  try {
    const model = getModel(apiKey);
    // 发送简单测试请求
    const result = await model.generateContent('Say "OK" if you can hear me.');
    const text = result.response.text();
    return text.toLowerCase().includes('ok');
  } catch {
    return false;
  }
}

/**
 * 测试辅助导出
 */
export const __test__ = {
  buildAnalysisPrompt,
  parseAIResponse,
  withTimeout,
};
