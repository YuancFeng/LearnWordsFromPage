/**
 * LingoRecall AI - Settings Types
 * Story 4.2 - Task 1: Settings 接口和默认值定义
 *
 * 定义用户偏好设置的类型和默认值
 *
 * @module shared/types/settings
 */

// ============================================================
// Theme Type
// ============================================================

/**
 * 主题类型
 * - light: 浅色主题
 * - dark: 深色主题
 * - system: 跟随系统设置
 */
export type ThemeType = 'light' | 'dark' | 'system';

/**
 * AI Provider 类型
 * - gemini: Google Gemini API (默认)
 * - openai-compatible: OpenAI 兼容 API (CLI Proxy, 自定义端点等)
 * - localhost: 本地模型 (Ollama, LM Studio, llama.cpp)
 */
export type AIProviderType = 'gemini' | 'openai-compatible' | 'localhost';

/**
 * 本地模型工具类型
 * - ollama: Ollama (推荐，最易用)
 * - lm-studio: LM Studio (图形界面)
 * - llama-cpp: llama.cpp (高级用户)
 * - other: 其他兼容工具
 */
export type LocalModelTool = 'ollama' | 'lm-studio' | 'llama-cpp' | 'other';

/**
 * 本地模型配置接口
 */
export interface LocalModelConfig {
  /** 使用的本地模型工具 */
  tool: LocalModelTool;
  /** API 端点 URL */
  endpoint: string;
  /** 模型名称 */
  modelName: string;
}

/**
 * OpenAI 兼容 API 配置接口
 * 用于保存 OpenAI 兼容模式的配置（切换 Provider 时不会丢失）
 */
export interface OpenAICompatibleConfig {
  /** API 端点 URL */
  endpoint: string;
  /** 模型名称 */
  modelName: string;
}

/**
 * Gemini API 配置接口
 * 用于保存 Gemini 模式的配置（切换 Provider 时不会丢失）
 */
export interface GeminiConfig {
  /** 模型名称（可选，用于指定特定模型版本） */
  modelName: string;
}

/**
 * 各 Provider 的配置存储
 * 切换 Provider 时保留之前的配置，方便用户切换回来时恢复
 */
export interface ProviderConfigs {
  /** Gemini 配置 */
  gemini: GeminiConfig;
  /** OpenAI 兼容 API 配置 */
  openaiCompatible: OpenAICompatibleConfig;
  /** 本地模型配置 */
  localhost: LocalModelConfig;
}

/**
 * 默认 Gemini 配置
 */
export const DEFAULT_GEMINI_CONFIG: Readonly<GeminiConfig> = Object.freeze({
  modelName: 'gemini-2.0-flash-lite',
});

/**
 * 默认 OpenAI 兼容配置
 */
export const DEFAULT_OPENAI_COMPATIBLE_CONFIG: Readonly<OpenAICompatibleConfig> = Object.freeze({
  endpoint: '',
  modelName: '',
});

// ============================================================
// Language Types (i18n)
// ============================================================

/**
 * 支持的 UI 界面语言
 * 包含 21 种语言支持
 */
export type UILanguage =
  | 'en'      // English
  | 'zh-CN'   // 简体中文
  | 'zh-TW'   // 繁體中文
  | 'ja'      // 日本語
  | 'ko'      // 한국어
  | 'de'      // Deutsch
  | 'es'      // Español
  | 'ru'      // Русский
  | 'az'      // Azərbaycan
  | 'tr'      // Türkçe
  | 'fr'      // Français
  | 'it'      // Italiano
  | 'pt'      // Português
  | 'pl'      // Polski
  | 'vi'      // Tiếng Việt
  | 'th'      // ไทย
  | 'ar'      // العربية
  | 'hi'      // हिन्दी
  | 'nl'      // Nederlands
  | 'uk'      // Українська
  | 'id';     // Indonesia

/**
 * 目标翻译语言（与 UILanguage 相同）
 */
export type TargetLanguage = UILanguage;

/**
 * UI 语言选项列表（用于下拉菜单）
 * 每种语言包含本地名称和英文名称
 */
export const UI_LANGUAGE_OPTIONS: ReadonlyArray<{
  value: UILanguage;
  label: string;      // 本地名称
  labelEn: string;    // 英文名称
}> = Object.freeze([
  { value: 'en', label: 'English', labelEn: 'English' },
  { value: 'zh-CN', label: '简体中文', labelEn: 'Simplified Chinese' },
  { value: 'zh-TW', label: '繁體中文', labelEn: 'Traditional Chinese' },
  { value: 'ja', label: '日本語', labelEn: 'Japanese' },
  { value: 'ko', label: '한국어', labelEn: 'Korean' },
  { value: 'de', label: 'Deutsch', labelEn: 'German' },
  { value: 'es', label: 'Español', labelEn: 'Spanish' },
  { value: 'ru', label: 'Русский', labelEn: 'Russian' },
  { value: 'az', label: 'Azərbaycan', labelEn: 'Azerbaijani' },
  { value: 'tr', label: 'Türkçe', labelEn: 'Turkish' },
  { value: 'fr', label: 'Français', labelEn: 'French' },
  { value: 'it', label: 'Italiano', labelEn: 'Italian' },
  { value: 'pt', label: 'Português', labelEn: 'Portuguese' },
  { value: 'pl', label: 'Polski', labelEn: 'Polish' },
  { value: 'vi', label: 'Tiếng Việt', labelEn: 'Vietnamese' },
  { value: 'th', label: 'ไทย', labelEn: 'Thai' },
  { value: 'ar', label: 'العربية', labelEn: 'Arabic' },
  { value: 'hi', label: 'हिन्दी', labelEn: 'Hindi' },
  { value: 'nl', label: 'Nederlands', labelEn: 'Dutch' },
  { value: 'uk', label: 'Українська', labelEn: 'Ukrainian' },
  { value: 'id', label: 'Indonesia', labelEn: 'Indonesian' },
]);

/**
 * 主题选项列表（用于 UI 下拉菜单）
 */
export const THEME_OPTIONS: ReadonlyArray<{ value: ThemeType; label: string }> = Object.freeze([
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]);

/**
 * AI Provider 选项列表
 */
export const AI_PROVIDER_OPTIONS: ReadonlyArray<{ value: AIProviderType; label: string; description: string }> = Object.freeze([
  { value: 'gemini', label: 'Gemini', description: 'Google Gemini API' },
  { value: 'localhost', label: '本地模型', description: 'Ollama / LM Studio / llama.cpp' },
  { value: 'openai-compatible', label: 'OpenAI 兼容', description: '自定义 API 端点' },
]);

/**
 * 本地模型工具选项列表
 */
export const LOCAL_MODEL_TOOL_OPTIONS: ReadonlyArray<{ value: LocalModelTool; label: string; defaultEndpoint: string }> = Object.freeze([
  { value: 'ollama', label: 'Ollama（推荐）', defaultEndpoint: 'http://localhost:11434' },
  { value: 'lm-studio', label: 'LM Studio', defaultEndpoint: 'http://localhost:1234' },
  { value: 'llama-cpp', label: 'llama.cpp', defaultEndpoint: 'http://localhost:8080' },
  { value: 'other', label: '其他', defaultEndpoint: 'http://localhost:8000' },
]);

/**
 * 默认本地模型配置
 */
export const DEFAULT_LOCAL_MODEL_CONFIG: Readonly<LocalModelConfig> = Object.freeze({
  tool: 'ollama' as LocalModelTool,
  endpoint: 'http://localhost:11434',
  modelName: 'translategemma:12b', // 推荐：Google 翻译专用模型，速度快质量高
});

/**
 * 默认 Provider 配置集合
 * 注意：必须在 DEFAULT_LOCAL_MODEL_CONFIG 之后定义
 */
export const DEFAULT_PROVIDER_CONFIGS: Readonly<ProviderConfigs> = Object.freeze({
  gemini: { ...DEFAULT_GEMINI_CONFIG },
  openaiCompatible: { ...DEFAULT_OPENAI_COMPATIBLE_CONFIG },
  localhost: { ...DEFAULT_LOCAL_MODEL_CONFIG },
});

// ============================================================
// Settings Interface
// ============================================================

/**
 * 用户设置接口
 * Story 4.2 - AC4: 默认设置定义
 */
export interface Settings {
  /**
   * 启用双击查词
   * AC1: Toggle Double-Click Word Lookup
   * @default true
   */
  enableDoubleClick: boolean;

  /**
   * 启用悬浮图标
   * AC2: Toggle Hover Icon Display
   * @default true
   */
  enableHoverIcon: boolean;

  /**
   * 启用复习提醒
   * 显示待复习词汇数量 badge
   * @default true
   */
  reviewReminder: boolean;

  /**
   * 跳过中文文本
   * 选中中文内容时不显示翻译弹窗（用户默认会中文）
   * @default true
   */
  skipChineseText: boolean;

  /**
   * UI 主题设置
   * AC3: Theme Selection
   * @default 'system'
   */
  theme: ThemeType;

  /**
   * 黑名单 URL 列表
   * 支持通配符模式: *.paypal.com, *bank*
   * Story 4.3 实现
   * @default ['*.paypal.com', '*.alipay.com', '*bank*']
   */
  blacklistUrls: string[];

  /**
   * AI Provider 类型
   * @default 'gemini'
   */
  aiProvider: AIProviderType;

  /**
   * 自定义 API 端点 URL
   * 仅当 aiProvider 为 'openai-compatible' 时使用
   * @example 'http://localhost:8080/v1/chat/completions'
   * @default ''
   */
  customApiEndpoint: string;

  /**
   * 自定义模型名称
   * @example 'gpt-4', 'claude-3-opus', 'llama3'
   * @default ''
   */
  customModelName: string;

  /**
   * UI 界面语言
   * 'auto' 表示自动检测浏览器语言
   * @default 'auto'
   */
  uiLanguage: UILanguage | 'auto';

  /**
   * 目标翻译语言
   * AI 会将文本翻译成此语言
   * 'auto' 表示自动检测浏览器语言
   * @default 'auto'
   */
  targetLanguage: TargetLanguage | 'auto';

  /**
   * 本地模型配置
   * 仅当 aiProvider 为 'localhost' 时使用
   */
  localModelConfig: LocalModelConfig;

  /**
   * 各 Provider 的配置存储
   * 切换 Provider 时保留之前的配置，方便用户切换回来时恢复
   * @since 1.1.0
   */
  providerConfigs: ProviderConfigs;
}

// ============================================================
// Default Settings
// ============================================================

/**
 * 默认设置值
 * Story 4.2 - AC4: 首次安装时的默认配置
 *
 * 安全考虑：
 * - 默认启用所有功能，提供最佳用户体验
 * - 黑名单预置支付网站，保护敏感操作
 */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  enableDoubleClick: true,
  enableHoverIcon: true,
  reviewReminder: true,
  skipChineseText: true,
  theme: 'system' as ThemeType,
  blacklistUrls: Object.freeze(['*.paypal.com', '*.alipay.com', '*bank*']) as unknown as string[],
  aiProvider: 'gemini' as AIProviderType,
  customApiEndpoint: '',
  customModelName: '',
  uiLanguage: 'auto',
  targetLanguage: 'auto',
  localModelConfig: { ...DEFAULT_LOCAL_MODEL_CONFIG },
  providerConfigs: {
    gemini: { ...DEFAULT_GEMINI_CONFIG },
    openaiCompatible: { ...DEFAULT_OPENAI_COMPATIBLE_CONFIG },
    localhost: { ...DEFAULT_LOCAL_MODEL_CONFIG },
  },
});

// ============================================================
// Type Guards
// ============================================================

/**
 * 检查是否为有效的主题类型
 * @param value - 待检查的值
 * @returns 是否为有效的 ThemeType
 */
export function isValidTheme(value: unknown): value is ThemeType {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * 检查是否为有效的 AI Provider 类型
 * @param value - 待检查的值
 * @returns 是否为有效的 AIProviderType
 */
export function isValidAIProvider(value: unknown): value is AIProviderType {
  return value === 'gemini' || value === 'openai-compatible' || value === 'localhost';
}

/**
 * 检查是否为有效的本地模型工具类型
 * @param value - 待检查的值
 * @returns 是否为有效的 LocalModelTool
 */
export function isValidLocalModelTool(value: unknown): value is LocalModelTool {
  return value === 'ollama' || value === 'lm-studio' || value === 'llama-cpp' || value === 'other';
}

/**
 * 检查是否为有效的本地模型配置
 * @param value - 待检查的值
 * @returns 是否为有效的 LocalModelConfig
 */
export function isValidLocalModelConfig(value: unknown): value is LocalModelConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const config = value as Record<string, unknown>;
  return (
    isValidLocalModelTool(config.tool) &&
    typeof config.endpoint === 'string' &&
    typeof config.modelName === 'string'
  );
}

/**
 * 检查是否为有效的 OpenAI 兼容配置
 * @param value - 待检查的值
 * @returns 是否为有效的 OpenAICompatibleConfig
 */
export function isValidOpenAICompatibleConfig(value: unknown): value is OpenAICompatibleConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const config = value as Record<string, unknown>;
  return (
    typeof config.endpoint === 'string' &&
    typeof config.modelName === 'string'
  );
}

/**
 * 检查是否为有效的 Gemini 配置
 * @param value - 待检查的值
 * @returns 是否为有效的 GeminiConfig
 */
export function isValidGeminiConfig(value: unknown): value is GeminiConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const config = value as Record<string, unknown>;
  return typeof config.modelName === 'string';
}

/**
 * 检查是否为有效的 Provider 配置集合
 * @param value - 待检查的值
 * @returns 是否为有效的 ProviderConfigs
 */
export function isValidProviderConfigs(value: unknown): value is ProviderConfigs {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const configs = value as Record<string, unknown>;
  return (
    isValidGeminiConfig(configs.gemini) &&
    isValidOpenAICompatibleConfig(configs.openaiCompatible) &&
    isValidLocalModelConfig(configs.localhost)
  );
}

/**
 * 合并 Provider 配置与默认值
 * @param partial - 部分配置
 * @returns 完整的 ProviderConfigs 对象
 */
export function mergeProviderConfigs(partial: Partial<ProviderConfigs> | null | undefined): ProviderConfigs {
  if (!partial) {
    return {
      gemini: { ...DEFAULT_GEMINI_CONFIG },
      openaiCompatible: { ...DEFAULT_OPENAI_COMPATIBLE_CONFIG },
      localhost: { ...DEFAULT_LOCAL_MODEL_CONFIG },
    };
  }

  return {
    gemini: isValidGeminiConfig(partial.gemini)
      ? partial.gemini
      : { ...DEFAULT_GEMINI_CONFIG },
    openaiCompatible: isValidOpenAICompatibleConfig(partial.openaiCompatible)
      ? partial.openaiCompatible
      : { ...DEFAULT_OPENAI_COMPATIBLE_CONFIG },
    localhost: isValidLocalModelConfig(partial.localhost)
      ? partial.localhost
      : { ...DEFAULT_LOCAL_MODEL_CONFIG },
  };
}

/**
 * 有效的 UI 语言列表
 */
const VALID_UI_LANGUAGES: readonly UILanguage[] = [
  'en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'de', 'es', 'ru', 'az', 'tr',
  'fr', 'it', 'pt', 'pl', 'vi', 'th', 'ar', 'hi', 'nl', 'uk', 'id',
] as const;

/**
 * 检查是否为有效的 UI 语言
 * @param value - 待检查的值
 * @returns 是否为有效的 UILanguage
 */
export function isValidUILanguage(value: unknown): value is UILanguage {
  return VALID_UI_LANGUAGES.includes(value as UILanguage);
}

/**
 * 检查是否为有效的 UI 语言设置（包含 'auto' 选项）
 * @param value - 待检查的值
 * @returns 是否为有效的 UILanguage 或 'auto'
 */
export function isValidUILanguageSetting(value: unknown): value is UILanguage | 'auto' {
  return value === 'auto' || isValidUILanguage(value);
}

/**
 * 检查是否为有效的目标翻译语言
 * @param value - 待检查的值
 * @returns 是否为有效的 TargetLanguage
 */
export function isValidTargetLanguage(value: unknown): value is TargetLanguage {
  return isValidUILanguage(value);
}

/**
 * 检查是否为有效的目标翻译语言设置（包含 'auto' 选项）
 * @param value - 待检查的值
 * @returns 是否为有效的 TargetLanguage 或 'auto'
 */
export function isValidTargetLanguageSetting(value: unknown): value is TargetLanguage | 'auto' {
  return value === 'auto' || isValidTargetLanguage(value);
}

/**
 * 检查是否为有效的 Settings 对象
 * @param value - 待检查的值
 * @returns 是否为有效的 Settings
 */
export function isValidSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const settings = value as Record<string, unknown>;

  return (
    typeof settings.enableDoubleClick === 'boolean' &&
    typeof settings.enableHoverIcon === 'boolean' &&
    typeof settings.reviewReminder === 'boolean' &&
    typeof settings.skipChineseText === 'boolean' &&
    isValidTheme(settings.theme) &&
    Array.isArray(settings.blacklistUrls) &&
    settings.blacklistUrls.every((url) => typeof url === 'string') &&
    isValidAIProvider(settings.aiProvider) &&
    typeof settings.customApiEndpoint === 'string' &&
    typeof settings.customModelName === 'string' &&
    isValidUILanguageSetting(settings.uiLanguage) &&
    isValidTargetLanguageSetting(settings.targetLanguage) &&
    (settings.localModelConfig === undefined || isValidLocalModelConfig(settings.localModelConfig))
  );
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * 合并部分设置与默认值
 * 用于处理存储中可能缺失的字段
 *
 * @param partial - 部分设置
 * @returns 完整的 Settings 对象
 */
export function mergeWithDefaults(partial: Partial<Settings> | null | undefined): Settings {
  if (!partial) {
    return {
      ...DEFAULT_SETTINGS,
      blacklistUrls: [...DEFAULT_SETTINGS.blacklistUrls],
      providerConfigs: mergeProviderConfigs(null),
    };
  }

  return {
    enableDoubleClick: partial.enableDoubleClick ?? DEFAULT_SETTINGS.enableDoubleClick,
    enableHoverIcon: partial.enableHoverIcon ?? DEFAULT_SETTINGS.enableHoverIcon,
    reviewReminder: partial.reviewReminder ?? DEFAULT_SETTINGS.reviewReminder,
    skipChineseText: partial.skipChineseText ?? DEFAULT_SETTINGS.skipChineseText,
    theme: isValidTheme(partial.theme) ? partial.theme : DEFAULT_SETTINGS.theme,
    blacklistUrls: Array.isArray(partial.blacklistUrls)
      ? partial.blacklistUrls
      : [...DEFAULT_SETTINGS.blacklistUrls],
    aiProvider: isValidAIProvider(partial.aiProvider) ? partial.aiProvider : DEFAULT_SETTINGS.aiProvider,
    customApiEndpoint: typeof partial.customApiEndpoint === 'string' ? partial.customApiEndpoint : DEFAULT_SETTINGS.customApiEndpoint,
    customModelName: typeof partial.customModelName === 'string' ? partial.customModelName : DEFAULT_SETTINGS.customModelName,
    uiLanguage: isValidUILanguageSetting(partial.uiLanguage) ? partial.uiLanguage : DEFAULT_SETTINGS.uiLanguage,
    targetLanguage: isValidTargetLanguageSetting(partial.targetLanguage) ? partial.targetLanguage : DEFAULT_SETTINGS.targetLanguage,
    localModelConfig: isValidLocalModelConfig(partial.localModelConfig)
      ? partial.localModelConfig
      : { ...DEFAULT_LOCAL_MODEL_CONFIG },
    providerConfigs: mergeProviderConfigs(partial.providerConfigs),
  };
}
