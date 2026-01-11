/**
 * LingoRecall AI - Tag Types
 * Story 4.4 - Task 1: Tag 数据模型定义
 *
 * 提供标签类型定义和颜色常量
 *
 * @module shared/types/tag
 */

// ============================================================
// Tag Interface
// ============================================================

/**
 * 标签接口
 * Story 4.4 - AC1: 用于分类词汇
 */
export interface Tag {
  /** 唯一标识符 (UUID) */
  id: string;
  /** 标签名称 (最多 20 个字符) */
  name: string;
  /** 颜色 (HEX 格式，如 #3B82F6) */
  color: string;
  /** 创建时间戳 (Unix timestamp) */
  createdAt: number;
}

/**
 * 创建标签时的输入类型（不包含 id 和 createdAt）
 */
export type CreateTagInput = Omit<Tag, 'id' | 'createdAt'>;

/**
 * 更新标签时的输入类型
 */
export type UpdateTagInput = Partial<Pick<Tag, 'name' | 'color'>>;

// ============================================================
// Preset Colors
// ============================================================

/**
 * 预设颜色列表
 * Story 4.4 - AC4: 8-12 个预设颜色
 *
 * 基于 Tailwind CSS 调色板
 */
export const PRESET_COLORS: readonly string[] = Object.freeze([
  '#EF4444', // Red-500
  '#F97316', // Orange-500
  '#EAB308', // Yellow-500
  '#22C55E', // Green-500
  '#14B8A6', // Teal-500
  '#3B82F6', // Blue-500
  '#8B5CF6', // Purple-500
  '#EC4899', // Pink-500
  '#6B7280', // Gray-500
  '#78716C', // Stone-500
  '#0EA5E9', // Sky-500
  '#D946EF', // Fuchsia-500
]);

/**
 * 默认颜色（新标签使用）
 */
export const DEFAULT_TAG_COLOR = '#3B82F6'; // Blue-500

// ============================================================
// Validation Functions
// ============================================================

/**
 * 验证 HEX 颜色格式
 * 支持 #RGB 和 #RRGGBB 格式
 *
 * @param color - 颜色字符串
 * @returns 是否为有效的 HEX 颜色
 *
 * @example
 * isValidHexColor('#3B82F6') // true
 * isValidHexColor('#fff') // true
 * isValidHexColor('red') // false
 * isValidHexColor('#GGGGGG') // false
 */
export function isValidHexColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * 标签名称最大长度
 */
export const MAX_TAG_NAME_LENGTH = 20;

/**
 * 验证标签名称
 * - 不能为空
 * - 不能只有空白
 * - 最多 20 个字符
 *
 * @param name - 标签名称
 * @returns 是否为有效的标签名称
 *
 * @example
 * isValidTagName('学术') // true
 * isValidTagName('') // false
 * isValidTagName('   ') // false
 * isValidTagName('a'.repeat(25)) // false
 */
export function isValidTagName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TAG_NAME_LENGTH;
}

/**
 * 规范化标签名称
 * 去除首尾空白
 *
 * @param name - 原始名称
 * @returns 规范化后的名称
 */
export function normalizeTagName(name: string): string {
  return (name || '').trim();
}

/**
 * 验证完整的 Tag 对象
 *
 * @param tag - 待验证的对象
 * @returns 是否为有效的 Tag
 */
export function isValidTag(tag: unknown): tag is Tag {
  if (!tag || typeof tag !== 'object') {
    return false;
  }

  const t = tag as Record<string, unknown>;

  return (
    typeof t.id === 'string' &&
    t.id.length > 0 &&
    typeof t.name === 'string' &&
    isValidTagName(t.name) &&
    typeof t.color === 'string' &&
    isValidHexColor(t.color) &&
    typeof t.createdAt === 'number' &&
    t.createdAt > 0
  );
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * 获取颜色的浅色版本（用于背景）
 * 在原始颜色基础上添加透明度
 *
 * @param hexColor - HEX 颜色
 * @param opacity - 透明度 (0-1)
 * @returns 带透明度的颜色字符串
 *
 * @example
 * getColorWithOpacity('#3B82F6', 0.1) // 'rgba(59, 130, 246, 0.1)'
 */
export function getColorWithOpacity(hexColor: string, opacity: number): string {
  if (!isValidHexColor(hexColor)) {
    return `rgba(0, 0, 0, ${opacity})`;
  }

  // 移除 # 前缀
  let hex = hexColor.slice(1);

  // 如果是 3 位格式，扩展为 6 位
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
