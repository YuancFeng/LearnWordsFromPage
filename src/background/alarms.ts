/**
 * LingoRecall AI - Alarms Module
 * Story 3.1 实现 - chrome.alarms 定时检查
 *
 * 使用 chrome.alarms API 实现定时检查待复习词汇
 * AC#2: 每小时触发一次定时检查
 *
 * @module background/alarms
 */

import { checkAndUpdateBadge } from './badge';

// ============================================================
// Constants
// ============================================================

/**
 * 复习检查 Alarm 名称
 */
export const REVIEW_CHECK_ALARM = 'reviewCheck';

/**
 * Alarm 触发间隔（分钟）
 * AC#2: 每小时触发一次定时检查
 */
export const ALARM_PERIOD_MINUTES = 60;

// ============================================================
// Alarm Setup
// ============================================================

/**
 * 设置复习检查 Alarm
 * AC#2: 每小时触发一次定时检查 (chrome.alarms)
 *
 * @returns Promise<void>
 */
export async function setupReviewAlarm(): Promise<void> {
  // 清除旧 Alarm（如果存在）
  await chrome.alarms.clear(REVIEW_CHECK_ALARM);

  // 创建新 Alarm，每 60 分钟触发
  chrome.alarms.create(REVIEW_CHECK_ALARM, {
    periodInMinutes: ALARM_PERIOD_MINUTES,
    delayInMinutes: 1, // 首次延迟 1 分钟触发
  });

  console.log(`[LingoRecall] Review alarm created: ${REVIEW_CHECK_ALARM}, period: ${ALARM_PERIOD_MINUTES} minutes`);
}

// ============================================================
// Alarm Handler
// ============================================================

/**
 * 处理 Alarm 触发事件
 * AC#2: 定时检查待复习词汇
 *
 * @param alarm 触发的 Alarm 对象
 * @returns Promise<void>
 */
export async function handleReviewAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  if (alarm.name !== REVIEW_CHECK_ALARM) {
    return;
  }

  console.log(`[LingoRecall] Review alarm triggered: ${alarm.name}`);

  // 避免 Badge 更新异常导致未处理的 Promise 拒绝
  try {
    await checkAndUpdateBadge();
  } catch (error) {
    console.error('[LingoRecall] Failed to update badge on alarm:', error);
  }
}

// Re-export checkAndUpdateBadge for backward compatibility
export { checkAndUpdateBadge } from './badge';
