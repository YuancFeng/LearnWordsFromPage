/**
 * LingoRecall AI - Types Module
 * 类型定义模块导出
 */

export {
  ErrorCode,
  ERROR_MESSAGES,
  type ErrorInfo,
  createError,
} from './errors';

export {
  type TextPosition,
  type ContextInfo,
  type SourceLocation,
  type XPathEvaluationResult,
} from './location';

export {
  type Settings,
  type ThemeType,
  DEFAULT_SETTINGS,
  THEME_OPTIONS,
  isValidTheme,
  isValidSettings,
  mergeWithDefaults,
} from './settings';

export {
  type Tag,
  type CreateTagInput,
  type UpdateTagInput,
  PRESET_COLORS,
  DEFAULT_TAG_COLOR,
  MAX_TAG_NAME_LENGTH,
  isValidHexColor,
  isValidTagName,
  normalizeTagName,
  isValidTag,
  getColorWithOpacity,
} from './tag';
