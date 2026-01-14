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
 * 向标签页的所有 frames 发送消息
 * 使用 webNavigation.getAllFrames 获取所有 frame，然后向每个 frame 发送消息
 * 这样可以确保消息到达 iframe 中的 content script（如 Gmail 的邮件内容区域）
 *
 * @param tabId - 标签页 ID
 * @param message - 要发送的消息
 * @returns 第一个成功的响应，或 null（如果所有 frame 都失败）
 */
export async function sendMessageToTab<T>(
  tabId: number,
  message: unknown
): Promise<T | null> {
  try {
    // 获取标签页中的所有 frames
    const frames = await chrome.webNavigation.getAllFrames({ tabId });

    if (!frames || frames.length === 0) {
      console.warn('[LingoRecall] No frames found in tab:', tabId);
      // 回退到默认行为
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response as T;
    }

    console.log(`[LingoRecall] Sending message to ${frames.length} frames in tab ${tabId}`);

    // 向所有 frames 发送消息，收集所有响应
    const sendPromises = frames.map(async (frame) => {
      try {
        const response = await chrome.tabs.sendMessage(tabId, message, { frameId: frame.frameId });
        console.log(`[LingoRecall] Frame ${frame.frameId} (${frame.url?.substring(0, 50)}...) responded:`, response ? 'success' : 'null');
        return { frameId: frame.frameId, response: response as T, error: null };
      } catch (error) {
        // 这个 frame 可能没有 content script，静默忽略
        return { frameId: frame.frameId, response: null, error };
      }
    });

    const results = await Promise.all(sendPromises);

    // 找到第一个成功的响应
    const successResult = results.find((r) => r.response !== null);

    if (successResult) {
      console.log(`[LingoRecall] Got successful response from frame ${successResult.frameId}`);
      return successResult.response;
    }

    // 所有 frame 都失败了
    console.warn('[LingoRecall] All frames failed to respond');
    return null;
  } catch (error) {
    // webNavigation API 调用失败，回退到默认行为
    console.warn('[LingoRecall] sendMessageToTab failed:', error);
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response as T;
    } catch {
      return null;
    }
  }
}
