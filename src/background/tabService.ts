/**
 * LingoRecall AI - Tab Management Service
 * Story 2.3: Jump Back to Source Page
 *
 * 提供标签页管理功能：
 * - 按 URL 查找现有标签页
 * - 切换到指定标签页
 * - 创建新标签页
 * - 等待标签页加载完成
 *
 * @module background/tabService
 */

/**
 * 按 URL 查找现有标签页
 * 使用灵活匹配：忽略 query params 和 hash，只匹配 origin + pathname
 *
 * @param url - 要查找的 URL
 * @returns 匹配的标签页，或 null
 */
export async function findTabByUrl(url: string): Promise<chrome.tabs.Tab | null> {
  try {
    // 解析目标 URL
    const targetUrl = new URL(url);
    const tabs = await chrome.tabs.query({});

    // 查找匹配的标签页（忽略 query params 和 hash）
    const matchingTab = tabs.find((tab) => {
      if (!tab.url) return false;
      try {
        const tabUrl = new URL(tab.url);
        return tabUrl.origin === targetUrl.origin && tabUrl.pathname === targetUrl.pathname;
      } catch {
        return false;
      }
    });

    return matchingTab || null;
  } catch (error) {
    console.error('[LingoRecall] findTabByUrl error:', error);
    return null;
  }
}

/**
 * 切换到指定标签页
 * 同时将标签页所在窗口置于前台
 *
 * @param tabId - 标签页 ID
 */
export async function switchToTab(tabId: number): Promise<void> {
  // 激活标签页
  await chrome.tabs.update(tabId, { active: true });

  // 将窗口置于前台
  const tab = await chrome.tabs.get(tabId);
  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

/**
 * 创建新标签页
 *
 * @param url - 要打开的 URL
 * @param makeActive - 是否激活标签页，默认 true
 * @returns 新创建的标签页
 */
export async function createTab(url: string, makeActive: boolean = true): Promise<chrome.tabs.Tab> {
  return await chrome.tabs.create({ url, active: makeActive });
}

/**
 * URL 可访问性检查结果
 */
export interface UrlAccessCheckResult {
  /** 是否可访问 */
  ok: boolean;
  /** HTTP 状态码（可选） */
  status?: number;
  /** 失败原因（可选） */
  error?: string;
}

/**
 * 检查目标 URL 是否可访问
 * 先用 HEAD 进行轻量探测，如果不支持则回退到 GET
 *
 * @param url - 要检测的 URL
 * @returns 可访问性检查结果
 */
export async function checkUrlAccessible(url: string): Promise<UrlAccessCheckResult> {
  try {
    const headResponse = await fetch(url, {
      method: 'HEAD',
      credentials: 'include',
      redirect: 'follow',
    });

    if (headResponse.ok) {
      return { ok: true, status: headResponse.status };
    }

    // 部分站点不支持 HEAD 请求，回退到 GET
    if (headResponse.status === 405 || headResponse.status === 501) {
      const getResponse = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        redirect: 'follow',
      });
      return { ok: getResponse.ok, status: getResponse.status };
    }

    return { ok: false, status: headResponse.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
}

/**
 * 等待标签页加载完成
 * 支持超时机制，默认 10 秒
 *
 * @param tabId - 标签页 ID
 * @param timeoutMs - 超时时间（毫秒），默认 10000
 * @returns true 表示加载成功，false 表示超时
 */
export async function waitForTabLoad(tabId: number, timeoutMs: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    // 设置超时
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      console.warn('[LingoRecall] Tab load timeout:', tabId);
      resolve(false);
    }, timeoutMs);

    // 监听标签页更新事件
    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string; url?: string }
    ) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // 检查标签页是否已经加载完成
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    }).catch(() => {
      // 标签页可能已关闭
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
    });
  });
}

/**
 * 向标签页发送消息
 * 如果 Content Script 未注入，会静默失败
 *
 * @param tabId - 标签页 ID
 * @param message - 要发送的消息
 * @returns 响应数据，或 null（如果发送失败）
 */
export async function sendMessageToTab<T>(
  tabId: number,
  message: unknown
): Promise<T | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response as T;
  } catch (error) {
    // Content Script 可能未注入，静默失败
    console.warn('[LingoRecall] sendMessageToTab failed:', error);
    return null;
  }
}
