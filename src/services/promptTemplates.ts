/**
 * LingoRecall AI - AI Prompt Templates
 *
 * 动态生成 AI 提示词，支持多语言翻译
 * 根据目标语言自动调整提示词内容
 *
 * @module services/promptTemplates
 */

import type { TargetLanguage } from '../shared/types/settings';

// ============================================================
// Language Information
// ============================================================

/**
 * 语言信息接口
 */
interface LanguageInfo {
  /** 英文名称 */
  name: string;
  /** 本地名称 */
  nativeName: string;
  /** 学习者描述 */
  learnerDescription: string;
}

/**
 * 所有支持语言的信息映射
 */
const LANGUAGE_INFO: Record<TargetLanguage, LanguageInfo> = {
  'en': {
    name: 'English',
    nativeName: 'English',
    learnerDescription: 'English speakers',
  },
  'zh-CN': {
    name: 'Simplified Chinese',
    nativeName: '简体中文',
    learnerDescription: 'Chinese speakers learning English',
  },
  'zh-TW': {
    name: 'Traditional Chinese',
    nativeName: '繁體中文',
    learnerDescription: 'Chinese speakers learning English',
  },
  'ja': {
    name: 'Japanese',
    nativeName: '日本語',
    learnerDescription: 'Japanese speakers learning English',
  },
  'ko': {
    name: 'Korean',
    nativeName: '한국어',
    learnerDescription: 'Korean speakers learning English',
  },
  'de': {
    name: 'German',
    nativeName: 'Deutsch',
    learnerDescription: 'German speakers learning English',
  },
  'es': {
    name: 'Spanish',
    nativeName: 'Español',
    learnerDescription: 'Spanish speakers learning English',
  },
  'ru': {
    name: 'Russian',
    nativeName: 'Русский',
    learnerDescription: 'Russian speakers learning English',
  },
  'az': {
    name: 'Azerbaijani',
    nativeName: 'Azərbaycan',
    learnerDescription: 'Azerbaijani speakers learning English',
  },
  'tr': {
    name: 'Turkish',
    nativeName: 'Türkçe',
    learnerDescription: 'Turkish speakers learning English',
  },
  'fr': {
    name: 'French',
    nativeName: 'Français',
    learnerDescription: 'French speakers learning English',
  },
  'it': {
    name: 'Italian',
    nativeName: 'Italiano',
    learnerDescription: 'Italian speakers learning English',
  },
  'pt': {
    name: 'Portuguese',
    nativeName: 'Português',
    learnerDescription: 'Portuguese speakers learning English',
  },
  'pl': {
    name: 'Polish',
    nativeName: 'Polski',
    learnerDescription: 'Polish speakers learning English',
  },
  'vi': {
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    learnerDescription: 'Vietnamese speakers learning English',
  },
  'th': {
    name: 'Thai',
    nativeName: 'ไทย',
    learnerDescription: 'Thai speakers learning English',
  },
  'ar': {
    name: 'Arabic',
    nativeName: 'العربية',
    learnerDescription: 'Arabic speakers learning English',
  },
  'hi': {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    learnerDescription: 'Hindi speakers learning English',
  },
  'nl': {
    name: 'Dutch',
    nativeName: 'Nederlands',
    learnerDescription: 'Dutch speakers learning English',
  },
  'uk': {
    name: 'Ukrainian',
    nativeName: 'Українська',
    learnerDescription: 'Ukrainian speakers learning English',
  },
  'id': {
    name: 'Indonesian',
    nativeName: 'Indonesia',
    learnerDescription: 'Indonesian speakers learning English',
  },
};

/**
 * 获取语言信息
 * @param lang - 目标语言代码
 * @returns 语言信息对象
 */
export function getLanguageInfo(lang: TargetLanguage): LanguageInfo {
  return LANGUAGE_INFO[lang];
}

// ============================================================
// Gemini Service Prompts (Detailed)
// ============================================================

/**
 * 构建单词分析提示词（Gemini 服务使用）
 *
 * @param text - 选中的单词或短语
 * @param context - 上下文
 * @param targetLanguage - 目标翻译语言
 * @returns 完整的分析提示词
 */
export function buildWordAnalysisPrompt(
  text: string,
  context: string,
  targetLanguage: TargetLanguage
): string {
  const langInfo = LANGUAGE_INFO[targetLanguage];

  return `You are a professional English vocabulary teacher helping ${langInfo.learnerDescription}.

A user selected a word or phrase while reading an English article. Provide an accurate explanation based on context.

**Selected word/phrase**: "${text}"

**Context**: "${context}"

Please provide the following information (JSON format):
1. meaning: The accurate meaning in this context (in ${langInfo.name}, concise and clear)
2. pronunciation: IPA phonetic transcription (omit for phrases)
3. partOfSpeech: Part of speech (noun, verb, adjective, etc.)
4. usage: A brief usage note or example sentence (bilingual: English and ${langInfo.name})

**Important requirements**:
- Must provide context-specific meaning, not generic definitions
- Response must be valid JSON format
- Do not add any extra explanatory text

**Response format**:
{
  "meaning": "meaning in ${langInfo.name}",
  "pronunciation": "/pronunciation/",
  "partOfSpeech": "part of speech",
  "usage": "usage note"
}`;
}

/**
 * 构建段落翻译提示词（Gemini 服务使用）
 *
 * @param text - 选中的文本段落
 * @param targetLanguage - 目标翻译语言
 * @returns 完整的翻译提示词
 */
export function buildTranslationPrompt(
  text: string,
  targetLanguage: TargetLanguage
): string {
  const langInfo = LANGUAGE_INFO[targetLanguage];

  return `You are a professional English to ${langInfo.name} translator.

A user selected a passage while reading an English article. Provide an accurate, fluent ${langInfo.name} translation.

**Selected text**:
"${text}"

Please provide the following information (JSON format):
1. meaning: Complete ${langInfo.name} translation (maintain original tone and style, natural and fluent)

**Important requirements**:
- Translation must accurately convey the original meaning
- Maintain original tone and style
- Translation should be natural and idiomatic in ${langInfo.name}
- Response must be valid JSON format
- Do not add any extra explanatory text

**Response format**:
{
  "meaning": "translation result"
}`;
}

// ============================================================
// OpenAI Compatible Service Prompts (Compact)
// ============================================================

/**
 * 构建单词分析系统提示词（OpenAI 兼容服务使用）
 * 针对本地模型优化，更简洁
 *
 * @param targetLanguage - 目标翻译语言
 * @returns 系统提示词
 */
export function buildWordSystemPromptCompact(targetLanguage: TargetLanguage): string {
  const langInfo = LANGUAGE_INFO[targetLanguage];

  return `English vocabulary analyzer for ${langInfo.learnerDescription}. Explain based on context.

Return JSON:
{"meaning":"meaning in ${langInfo.name}","pronunciation":"/IPA/","partOfSpeech":"pos","usage":"example"}

Requirements: context-based, concise, JSON only`;
}

/**
 * 构建段落翻译系统提示词（OpenAI 兼容服务使用）
 * 针对本地模型优化，更简洁
 *
 * @param targetLanguage - 目标翻译语言
 * @returns 系统提示词
 */
export function buildTranslateSystemPromptCompact(targetLanguage: TargetLanguage): string {
  const langInfo = LANGUAGE_INFO[targetLanguage];

  return `English to ${langInfo.name} translator. Return JSON: {"meaning":"${langInfo.name} translation"}
Requirements: accurate, fluent, JSON only`;
}

/**
 * 构建单词分析用户消息（OpenAI 兼容服务使用）
 *
 * @param text - 选中的单词
 * @param context - 上下文
 * @returns 用户消息
 */
export function buildWordUserMessage(text: string, context: string): string {
  const trimmedContext = context.length > 200 ? context.slice(0, 200) + '...' : context;
  return `Word: "${text}"
Context: "${trimmedContext}"`;
}

/**
 * 构建翻译用户消息（OpenAI 兼容服务使用）
 *
 * @param text - 选中的文本
 * @returns 用户消息
 */
export function buildTranslateUserMessage(text: string): string {
  return `Translate: "${text}"`;
}

// ============================================================
// Fallback Messages
// ============================================================

/**
 * 获取解析失败的回退消息
 *
 * @param targetLanguage - 目标语言
 * @returns 本地化的错误消息
 */
export function getFallbackMeaningMessage(targetLanguage: TargetLanguage): string {
  const messages: Record<TargetLanguage, string> = {
    'en': '(Unable to get meaning)',
    'zh-CN': '(无法获取含义)',
    'zh-TW': '(無法取得含義)',
    'ja': '(意味を取得できません)',
    'ko': '(의미를 가져올 수 없습니다)',
    'de': '(Bedeutung konnte nicht abgerufen werden)',
    'es': '(No se pudo obtener el significado)',
    'ru': '(Не удалось получить значение)',
    'az': '(Məna əldə edilə bilmir)',
    'tr': '(Anlam alınamadı)',
    'fr': '(Impossible d\'obtenir la signification)',
    'it': '(Impossibile ottenere il significato)',
    'pt': '(Não foi possível obter o significado)',
    'pl': '(Nie można uzyskać znaczenia)',
    'vi': '(Không thể lấy nghĩa)',
    'th': '(ไม่สามารถรับความหมายได้)',
    'ar': '(تعذر الحصول على المعنى)',
    'hi': '(अर्थ प्राप्त करने में असमर्थ)',
    'nl': '(Kon de betekenis niet ophalen)',
    'uk': '(Не вдалося отримати значення)',
    'id': '(Tidak dapat memperoleh arti)',
  };

  return messages[targetLanguage] || messages['en'];
}
