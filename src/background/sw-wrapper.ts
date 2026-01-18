/**
 * LingoRecall AI - Service Worker Wrapper
 *
 * 这个 wrapper 脚本解决了 Chrome 扩展中常见的 Service Worker 注册错误：
 * "An unknown error occurred when fetching the script"
 *
 * 它通过以下方式提供更好的错误处理和调试能力：
 * 1. 捕获 importScripts 错误并显示详细的错误信息
 * 2. 添加全局错误处理器防止未处理的异常
 * 3. 提供更友好的错误提示帮助用户解决问题
 *
 * @see https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
 */

// Service Worker 全局函数声明
declare function importScripts(...urls: string[]): void;

// 全局错误处理器 - 捕获所有未处理的错误
self.addEventListener('error', (event: ErrorEvent) => {
  console.error('[LingoRecall SW] Uncaught error:', event.error);
  console.error('[LingoRecall SW] Error message:', event.message);
  console.error('[LingoRecall SW] Error location:', event.filename, 'line:', event.lineno, 'col:', event.colno);
});

// 全局 unhandled rejection 处理器
self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('[LingoRecall SW] Unhandled promise rejection:', event.reason);
});

// Service Worker 安装事件 - 用于调试生命周期
self.addEventListener('install', () => {
  console.log('[LingoRecall SW] Service Worker installing...');
});

// Service Worker 激活事件
self.addEventListener('activate', () => {
  console.log('[LingoRecall SW] Service Worker activated');
});

/**
 * 使用 try-catch 包裹主脚本的导入
 * 这样可以捕获并显示实际的错误，而不是显示神秘的
 * "An unknown error occurred when fetching the script"
 */
try {
  // 导入主 background 脚本
  // 注意：这里使用的是编译后的文件名
  importScripts('background-main.js');
  console.log('[LingoRecall SW] Main script loaded successfully');
} catch (error) {
  // 捕获并详细记录错误
  console.error('[LingoRecall SW] Failed to load main script');

  if (error instanceof Error) {
    console.error('[LingoRecall SW] Error name:', error.name);
    console.error('[LingoRecall SW] Error message:', error.message);
    console.error('[LingoRecall SW] Error stack:', error.stack);

    // 检测常见错误类型并提供解决建议
    const message = error.message.toLowerCase();

    if (message.includes('window')) {
      console.error('[LingoRecall SW] HINT: Code is using "window" object which is not available in Service Workers. Check your dependencies.');
    } else if (message.includes('document')) {
      console.error('[LingoRecall SW] HINT: Code is using "document" object which is not available in Service Workers.');
    } else if (message.includes('syntaxerror')) {
      console.error('[LingoRecall SW] HINT: There is a syntax error in the script. Check the build output.');
    } else if (message.includes('not found') || message.includes('404')) {
      console.error('[LingoRecall SW] HINT: Script file not found. Check if the build completed successfully.');
    }
  } else {
    console.error('[LingoRecall SW] Unknown error type:', error);
  }

  // 重新抛出错误，这样 Chrome 仍然会在扩展页面显示错误
  // 但现在控制台会有详细的错误信息
  throw error;
}
