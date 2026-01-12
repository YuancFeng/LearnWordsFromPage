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
    typeof settings.customModelName === 'string'
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
  };
}
