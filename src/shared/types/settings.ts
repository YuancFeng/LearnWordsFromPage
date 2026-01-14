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
 * - openai-compatible: OpenAI 兼容 API (CLI Proxy, Ollama, etc.)
 */
export type AIProviderType = 'gemini' | 'openai-compatible';

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
  { value: 'openai-compatible', label: 'OpenAI 兼容', description: 'CLI Proxy / Ollama / 其他兼容 API' },
]);

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
  return value === 'gemini' || value === 'openai-compatible';
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
    isValidTargetLanguageSetting(settings.targetLanguage)
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
    return { ...DEFAULT_SETTINGS, blacklistUrls: [...DEFAULT_SETTINGS.blacklistUrls] };
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
  };
}
