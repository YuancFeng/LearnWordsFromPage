/**
 * LingoRecall AI - Badge 管理模块
 * Story 3.2 实现 - 待复习词汇提醒
 *
 * 负责扩展图标 Badge 的显示和更新
 * AC#1: Badge 显示待复习数量
 * AC#2: 无待复习词汇时清空 Badge
 * AC#3: Badge 数量超过 99 显示 "99+"
 * AC#4: 复习完成后实时更新 Badge
 *
 * @module background/badge
 */

import { countDueWords } from '../shared/storage/db';

// ============================================================
// Constants
// ============================================================

/**
 * Badge 背景颜色（Tailwind red-500）
 * AC#1: Badge 背景色为红色 (#EF4444)
 */
export const BADGE_COLOR = '#EF4444';

/**
 * Badge 最大显示数量
 * AC#3: Badge 数量超过 99 显示 "99+"
 */
export const MAX_BADGE_COUNT = 99;

// ============================================================
// Badge Text Formatting
// ============================================================

/**
 * 格式化 Badge 显示文本
 * AC#2: count <= 0 时返回空字符串（清空 Badge）
 * AC#3: count > 99 时返回 "99+"
 *
 * @param count 待复习数量
 * @returns Badge 显示文本
 */
export function formatBadgeText(count: number): string {
  if (count <= 0) {
    return '';
  }
  if (count > MAX_BADGE_COUNT) {
    return '99+';
  }
  return String(count);
}

// ============================================================
// Badge Update Functions
// ============================================================

/**
 * 更新扩展图标 Badge
 * AC#1: 设置 Badge 文本和背景色
 * AC#2: count = 0 时清空 Badge
 *
 * @param count 待复习数量
 * @returns Promise<void>
 */
export async function updateBadge(count: number): Promise<void> {
  const text = formatBadgeText(count);

  // 设置 Badge 文本
  await chrome.action.setBadgeText({ text });

  // 只有在有待复习时设置背景色
  if (count > 0) {
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  }
}

/**
 * 检查待复习数量并更新 Badge
 * AC#1, AC#2: 查询待复习数量并更新 Badge 显示
 *
 * 供 Alarm 处理器、初始化、复习完成后调用
 *
 * @returns Promise<void>
 */
export async function checkAndUpdateBadge(): Promise<void> {
  try {
    const count = await countDueWords();
    console.log(`[LingoRecall] Due words count: ${count}`);
    await updateBadge(count);
    console.log(`[LingoRecall] Badge updated: "${formatBadgeText(count)}"`);
  } catch (error) {
    console.error('[LingoRecall] Failed to update badge:', error);
    // 出错时清空 Badge，避免显示过期数据
    await updateBadge(0);
  }
}
