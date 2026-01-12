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
 * 构建单词分析系统提示词
 */
function buildWordSystemPrompt(): string {
  return `你是一个专业的英语词汇教师，帮助中国学生学习英语。
用户在阅读英文文章时选中了一个单词或短语，需要你根据上下文提供准确的解释。

请以 JSON 格式返回以下信息：
1. meaning: 在当前语境中的准确含义（中文，简洁明了）
2. pronunciation: IPA 音标（如果是短语则省略）
3. partOfSpeech: 词性（名词、动词、形容词等）
4. usage: 一句简短的用法说明或例句（中英对照）

重要要求：
- 必须根据上下文语境给出准确含义，而非通用释义
- 回复必须是有效的 JSON 格式
- 不要添加任何额外的说明文字

回复格式：
{
  "meaning": "含义",
  "pronunciation": "/发音/",
  "partOfSpeech": "词性",
  "usage": "用法说明"
}`;
}

/**
 * 构建翻译模式系统提示词
 */
function buildTranslateSystemPrompt(): string {
  return `你是一个专业的英汉翻译专家，帮助中国用户理解英文内容。
用户在阅读英文文章时选中了一段文字，需要你提供准确、流畅的中文翻译。

请以 JSON 格式返回以下信息：
1. meaning: 完整的中文翻译（保持原文的语气和风格，流畅自然）

重要要求：
- 翻译要准确传达原文意思
- 保持原文的语气和文风
- 翻译要流畅自然，符合中文表达习惯
- 回复必须是有效的 JSON 格式
- 不要添加任何额外的说明文字

回复格式：
{
  "meaning": "翻译结果"
}`;
}

/**
 * 根据模式构建系统提示词
 */
function buildSystemPrompt(mode: AnalysisMode = 'word'): string {
  return mode === 'translate' ? buildTranslateSystemPrompt() : buildWordSystemPrompt();
}

/**
 * 构建单词分析用户消息
 */
function buildWordUserMessage(text: string, context: string): string {
  return `选中的单词/短语: "${text}"

上下文: "${context}"

请分析这个词在上下文中的含义。`;
}

/**
 * 构建翻译模式用户消息
 */
function buildTranslateUserMessage(text: string): string {
  return `请翻译以下英文段落：

"${text}"`;
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

  // 翻译模式需要更多 tokens
  const maxTokens = mode === 'translate' ? 2000 : 500;

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
