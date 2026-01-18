/**
 * LingoRecall AI - Popup Preferences Storage
 *
 * 存储和管理弹窗的位置和大小偏好
 * 使用 chrome.storage.local 持久化用户的自定义设置
 *
 * @module content/popupPreferences
 */

/** 弹窗偏好设置接口 */
export interface PopupPreferences {
  /** 用户是否手动调整过位置/大小 */
  customized: boolean;
  /** 弹窗宽度 */
  width: number;
  /** 弹窗高度（可选，用于固定高度模式） */
  height?: number;
  /** 相对于视口的 X 偏移（0-1 范围表示相对位置） */
  relativeX?: number;
  /** 相对于视口的 Y 偏移（0-1 范围表示相对位置） */
  relativeY?: number;
}

/** 存储键名 */
const STORAGE_KEY = 'lingorecall_popup_preferences';

/** 默认偏好设置 */
const DEFAULT_PREFERENCES: PopupPreferences = {
  customized: false,
  width: 320,
};

/** 内存缓存 */
let cachedPreferences: PopupPreferences | null = null;

/**
 * 获取弹窗偏好设置
 * 优先从内存缓存读取，否则从 storage 读取
 */
export async function getPopupPreferences(): Promise<PopupPreferences> {
  if (cachedPreferences) {
    return { ...cachedPreferences };
  }

  try {
    if (!chrome?.storage?.local) {
      return { ...DEFAULT_PREFERENCES };
    }

    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as PopupPreferences | undefined;

    if (stored) {
      cachedPreferences = stored;
      return { ...stored };
    }
  } catch (error) {
    console.warn('[LingoRecall] Failed to load popup preferences:', error);
  }

  return { ...DEFAULT_PREFERENCES };
}

/**
 * 同步获取弹窗偏好设置（仅从缓存）
 * 用于初始化时快速获取，可能返回默认值
 */
export function getPopupPreferencesSync(): PopupPreferences {
  return cachedPreferences ? { ...cachedPreferences } : { ...DEFAULT_PREFERENCES };
}

/**
 * 保存弹窗偏好设置
 * @param preferences - 要保存的偏好设置
 */
export async function savePopupPreferences(preferences: Partial<PopupPreferences>): Promise<void> {
  const current = cachedPreferences || { ...DEFAULT_PREFERENCES };
  const updated: PopupPreferences = {
    ...current,
    ...preferences,
    customized: true,
  };

  cachedPreferences = updated;

  try {
    if (chrome?.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: updated });
      console.log('[LingoRecall] Popup preferences saved:', updated);
    }
  } catch (error) {
    console.warn('[LingoRecall] Failed to save popup preferences:', error);
  }
}

/**
 * 重置弹窗偏好设置为默认值
 */
export async function resetPopupPreferences(): Promise<void> {
  cachedPreferences = { ...DEFAULT_PREFERENCES };

  try {
    if (chrome?.storage?.local) {
      await chrome.storage.local.remove(STORAGE_KEY);
      console.log('[LingoRecall] Popup preferences reset to defaults');
    }
  } catch (error) {
    console.warn('[LingoRecall] Failed to reset popup preferences:', error);
  }
}

/**
 * 预加载偏好设置到缓存
 * 在 content script 初始化时调用
 */
export async function preloadPopupPreferences(): Promise<void> {
  await getPopupPreferences();
}
