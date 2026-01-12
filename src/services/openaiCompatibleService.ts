/**
 * LingoRecall AI - OpenAI Compatible Service
 * 支持 CLI Proxy、Ollama、LM Studio 等 OpenAI 兼容 API
 *
 * @module services/openaiCompatibleService
 */

import type { AIAnalysisResult, AnalyzeWordRequest, AnalysisMode } from './geminiService';

/** 响应时间上限（毫秒）*/
const RESPONSE_TIMEOUT_MS = 10000; // OpenAI 兼容 API 可能较慢，给 10s
/** 翻译模式响应时间上限（毫秒）*/
const TRANSLATE_TIMEOUT_MS = 30000; // 翻译长文本可能需要更长时间

/**
 * OpenAI Chat Completion 请求格式
 */
interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

/**
 * OpenAI Chat Completion 响应格式
 */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 构建单词分析系统提示词（优化版：减少 token 数量）
 */
function buildWordSystemPrompt(): string {
  return `英语词汇分析助手。根据上下文解释选中词汇。

返回 JSON:
{"meaning":"中文含义","pronunciation":"/IPA/","partOfSpeech":"词性","usage":"例句"}

要求：基于语境、简洁、仅返回JSON`;
}

/**
 * 构建翻译模式系统提示词（优化版：减少 token 数量）
 */
function buildTranslateSystemPrompt(): string {
  return `英汉翻译。返回JSON: {"meaning":"中文翻译"}
要求：准确、流畅、仅返回JSON`;
}

/**
 * 根据模式构建系统提示词
 */
function buildSystemPrompt(mode: AnalysisMode = 'word'): string {
  return mode === 'translate' ? buildTranslateSystemPrompt() : buildWordSystemPrompt();
}

/**
 * 构建单词分析用户消息（优化版：简洁）
 */
function buildWordUserMessage(text: string, context: string): string {
  // 限制上下文长度，避免 token 浪费
  const trimmedContext = context.length > 200 ? context.slice(0, 200) + '...' : context;
  return `词: "${text}"\n语境: "${trimmedContext}"`;
}

/**
 * 构建翻译模式用户消息（优化版：简洁）
 */
function buildTranslateUserMessage(text: string): string {
  return `翻译: "${text}"`;
}

/**
 * 根据模式构建用户消息
 */
function buildUserMessage(text: string, context: string, mode: AnalysisMode = 'word'): string {
  return mode === 'translate' ? buildTranslateUserMessage(text) : buildWordUserMessage(text, context);
}

/**
 * 解析 AI 响应
 */
function parseResponse(content: string, mode: AnalysisMode = 'word'): AIAnalysisResult {
  // 尝试提取 JSON 部分（可能被 markdown 包裹）
  const jsonMatch = content.match(/\{[\s\S]*\}/);
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
    meaning: content.trim() || '(无法获取含义)',
    pronunciation: '',
    partOfSpeech: '',
    usage: '',
    mode,
  };
}

/**
 * 使用 OpenAI 兼容 API 分析单词
 *
 * @param request - 分析请求
 * @param apiKey - API Key
 * @param endpoint - API 端点 URL (e.g., http://localhost:8080/v1/chat/completions)
 * @param modelName - 模型名称 (e.g., gpt-4, claude-3-opus, llama3)
 * @returns AI 分析结果
 */
export async function analyzeWordOpenAI(
  request: AnalyzeWordRequest,
  apiKey: string,
  endpoint: string,
  modelName: string = 'gpt-4'
): Promise<AIAnalysisResult> {
  const startTime = Date.now();
  const mode = request.mode || 'word';

  // 规范化端点 URL
  let normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint.endsWith('/chat/completions')) {
    // 移除尾部斜杠
    normalizedEndpoint = normalizedEndpoint.replace(/\/+$/, '');
    // 如果没有 /v1 前缀，添加它
    if (!normalizedEndpoint.includes('/v1')) {
      normalizedEndpoint += '/v1';
    }
    normalizedEndpoint += '/chat/completions';
  }

  // 单词分析只需要少量 tokens，翻译模式需要更多
  const maxTokens = mode === 'translate' ? 1500 : 200;

  const requestBody: ChatCompletionRequest = {
    model: modelName,
    messages: [
      { role: 'system', content: buildSystemPrompt(mode) },
      { role: 'user', content: buildUserMessage(request.text, request.context, mode) },
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
  };

  // 翻译模式使用更长的超时时间
  const timeout = mode === 'translate' ? TRANSLATE_TIMEOUT_MS : RESPONSE_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(normalizedEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const status = response.status;

      if (status === 401 || status === 403) {
        throw new Error('API_KEY_INVALID: Please check your API key configuration.');
      }
      if (status === 429) {
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.');
      }
      if (status === 404) {
        throw new Error('ENDPOINT_NOT_FOUND: Please check your API endpoint URL.');
      }

      throw new Error(`API_ERROR: ${status} - ${errorText}`);
    }

    const data: ChatCompletionResponse = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const elapsed = Date.now() - startTime;
    console.log(`[LingoRecall] OpenAI Compatible API response in ${elapsed}ms (mode: ${mode})`);

    return parseResponse(content, mode);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT: Request timed out. Please try again.');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('NETWORK_ERROR: Please check your internet connection and API endpoint.');
      }
      throw error;
    }

    throw new Error('Unknown error occurred');
  }
}

/**
 * 验证 OpenAI 兼容 API 配置
 *
 * @param apiKey - API Key
 * @param endpoint - API 端点
 * @param modelName - 模型名称
 * @returns 是否有效
 */
export async function validateOpenAIConfig(
  apiKey: string,
  endpoint: string,
  modelName: string
): Promise<boolean> {
  if (!endpoint || endpoint.trim() === '') {
    return false;
  }

  try {
    const result = await analyzeWordOpenAI(
      {
        text: 'test',
        context: 'This is a test.',
        url: '',
        xpath: '',
      },
      apiKey,
      endpoint,
      modelName
    );
    return !!result.meaning;
  } catch {
    return false;
  }
}
