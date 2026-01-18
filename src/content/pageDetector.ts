/**
 * LingoRecall AI - Page Type Detection
 *
 * 检测页面类型，用于生成智能的定位失败提示
 * 根据 URL 和页面特征识别可能导致定位失败的场景
 *
 * @module content/pageDetector
 */

/**
 * 页面类型枚举
 * 不同类型的页面有不同的内容加载特性
 */
export type PageType =
  | 'email-thread'      // 邮件串（Gmail, Outlook）- 邮件可能被折叠
  | 'chat-app'          // 聊天应用（Slack, Discord, Teams）- 历史消息虚拟化
  | 'social-feed'       // 社交动态（Twitter, Facebook, LinkedIn）- 无限滚动/折叠
  | 'forum-thread'      // 论坛帖子（Reddit, Stack Overflow, GitHub Issues）- 评论折叠
  | 'video-comments'    // 视频评论（YouTube, Bilibili）- 评论分页/折叠
  | 'ecommerce'         // 电商网站（Amazon, 淘宝）- 评论分页
  | 'document'          // 文档应用（Notion, Google Docs）- 折叠块
  | 'news-article'      // 新闻文章 - 评论分页
  | 'spa-dynamic'       // SPA 动态内容 - 内容可能已更新
  | 'generic';          // 通用页面

/**
 * 页面类型检测结果
 */
export interface PageTypeInfo {
  /** 页面类型 */
  type: PageType;
  /** 页面名称（用于显示） */
  name: string;
  /** 可能的问题原因 */
  reason: string;
  /** 建议的操作 */
  suggestion: string;
}

/**
 * URL 模式匹配规则
 */
interface UrlPattern {
  /** 域名匹配（支持通配符） */
  domain: RegExp;
  /** 路径匹配（可选） */
  path?: RegExp;
  /** 检测到时的页面类型 */
  type: PageType;
  /** 显示名称 */
  name: string;
}

/**
 * URL 模式规则列表
 * 按优先级排序，越靠前优先级越高
 */
const URL_PATTERNS: UrlPattern[] = [
  // 邮件服务
  {
    domain: /^mail\.google\.com$/,
    type: 'email-thread',
    name: 'Gmail',
  },
  {
    domain: /^outlook\.(live|office|office365)\.com$/,
    type: 'email-thread',
    name: 'Outlook',
  },
  {
    domain: /^mail\.yahoo\.com$/,
    type: 'email-thread',
    name: 'Yahoo Mail',
  },
  {
    domain: /^mail\.\w+\.(com|cn|net)$/,
    type: 'email-thread',
    name: '邮箱',
  },

  // 聊天应用
  {
    domain: /^app\.slack\.com$/,
    type: 'chat-app',
    name: 'Slack',
  },
  {
    domain: /^discord\.com$/,
    type: 'chat-app',
    name: 'Discord',
  },
  {
    domain: /^teams\.microsoft\.com$/,
    type: 'chat-app',
    name: 'Teams',
  },
  {
    domain: /^web\.telegram\.org$/,
    type: 'chat-app',
    name: 'Telegram',
  },
  {
    domain: /^web\.whatsapp\.com$/,
    type: 'chat-app',
    name: 'WhatsApp',
  },

  // 社交媒体
  {
    domain: /^(www\.)?(twitter|x)\.com$/,
    type: 'social-feed',
    name: 'Twitter/X',
  },
  {
    domain: /^(www\.)?facebook\.com$/,
    type: 'social-feed',
    name: 'Facebook',
  },
  {
    domain: /^(www\.)?linkedin\.com$/,
    type: 'social-feed',
    name: 'LinkedIn',
  },
  {
    domain: /^(www\.)?instagram\.com$/,
    type: 'social-feed',
    name: 'Instagram',
  },
  {
    domain: /^(www\.)?weibo\.com$/,
    type: 'social-feed',
    name: '微博',
  },
  {
    domain: /^(www\.)?xiaohongshu\.com$/,
    type: 'social-feed',
    name: '小红书',
  },

  // 论坛/问答
  {
    domain: /^(www\.)?reddit\.com$/,
    type: 'forum-thread',
    name: 'Reddit',
  },
  {
    domain: /^(www\.)?github\.com$/,
    path: /\/(issues|pull|discussions)/,
    type: 'forum-thread',
    name: 'GitHub',
  },
  {
    domain: /^stackoverflow\.com$/,
    type: 'forum-thread',
    name: 'Stack Overflow',
  },
  {
    domain: /^(www\.)?zhihu\.com$/,
    type: 'forum-thread',
    name: '知乎',
  },
  {
    domain: /^(www\.)?v2ex\.com$/,
    type: 'forum-thread',
    name: 'V2EX',
  },
  {
    domain: /^(hn|news)\.ycombinator\.com$/,
    type: 'forum-thread',
    name: 'Hacker News',
  },

  // 视频网站
  {
    domain: /^(www\.)?youtube\.com$/,
    type: 'video-comments',
    name: 'YouTube',
  },
  {
    domain: /^(www\.)?bilibili\.com$/,
    type: 'video-comments',
    name: 'Bilibili',
  },
  {
    domain: /^(www\.)?twitch\.tv$/,
    type: 'video-comments',
    name: 'Twitch',
  },

  // 电商网站
  {
    domain: /^(www\.)?amazon\.(com|cn|co\.\w+)$/,
    type: 'ecommerce',
    name: 'Amazon',
  },
  {
    domain: /^(www\.)?taobao\.com$/,
    type: 'ecommerce',
    name: '淘宝',
  },
  {
    domain: /^(www\.)?jd\.com$/,
    type: 'ecommerce',
    name: '京东',
  },
  {
    domain: /^(www\.)?ebay\.(com|co\.\w+)$/,
    type: 'ecommerce',
    name: 'eBay',
  },

  // 文档应用
  {
    domain: /^(www\.)?notion\.so$/,
    type: 'document',
    name: 'Notion',
  },
  {
    domain: /^docs\.google\.com$/,
    type: 'document',
    name: 'Google Docs',
  },
  {
    domain: /^(www\.)?yuque\.com$/,
    type: 'document',
    name: '语雀',
  },
  {
    domain: /^(www\.)?feishu\.cn$/,
    type: 'document',
    name: '飞书文档',
  },

  // 新闻/博客
  {
    domain: /^(www\.)?medium\.com$/,
    type: 'news-article',
    name: 'Medium',
  },
  {
    domain: /^(.*\.)?substack\.com$/,
    type: 'news-article',
    name: 'Substack',
  },
];

/**
 * 页面类型对应的提示信息
 */
const PAGE_TYPE_HINTS: Record<PageType, { reason: string; suggestion: string }> = {
  'email-thread': {
    reason: '邮件串中的早期邮件可能已折叠',
    suggestion: '请展开邮件串中的相关邮件，然后重试',
  },
  'chat-app': {
    reason: '聊天历史中的旧消息可能已被移出可视区域',
    suggestion: '请滚动到包含该词汇的消息位置，然后重试',
  },
  'social-feed': {
    reason: '动态内容可能已更新或折叠',
    suggestion: '请展开相关内容或滚动到该位置，然后重试',
  },
  'forum-thread': {
    reason: '评论/回复可能已折叠或分页',
    suggestion: '请展开所有评论或切换到正确的页码，然后重试',
  },
  'video-comments': {
    reason: '评论区内容可能分页或折叠',
    suggestion: '请展开评论区并加载更多评论，然后重试',
  },
  'ecommerce': {
    reason: '商品评论可能分页显示',
    suggestion: '请切换到包含该评论的页码，然后重试',
  },
  'document': {
    reason: '文档中的折叠块可能未展开',
    suggestion: '请展开文档中的相关折叠块，然后重试',
  },
  'news-article': {
    reason: '文章评论可能分页或折叠',
    suggestion: '请加载更多评论内容，然后重试',
  },
  'spa-dynamic': {
    reason: '页面内容可能已动态更新',
    suggestion: '请检查页面内容是否仍然存在',
  },
  'generic': {
    reason: '页面内容可能已更改或不可见',
    suggestion: '请检查内容是否仍在页面上，或尝试刷新页面',
  },
};

/**
 * 检测当前页面类型
 *
 * @param url - 页面 URL（可选，默认使用当前页面 URL）
 * @returns 页面类型信息
 */
export function detectPageType(url?: string): PageTypeInfo {
  const currentUrl = url || window.location.href;

  try {
    const urlObj = new URL(currentUrl);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    // 遍历 URL 模式进行匹配
    for (const pattern of URL_PATTERNS) {
      if (pattern.domain.test(hostname)) {
        // 如果有路径要求，也需要匹配
        if (pattern.path && !pattern.path.test(pathname)) {
          continue;
        }

        const hints = PAGE_TYPE_HINTS[pattern.type];
        return {
          type: pattern.type,
          name: pattern.name,
          reason: hints.reason,
          suggestion: hints.suggestion,
        };
      }
    }

    // 检测 SPA 特征
    if (detectSpaFeatures()) {
      const hints = PAGE_TYPE_HINTS['spa-dynamic'];
      return {
        type: 'spa-dynamic',
        name: 'SPA 应用',
        reason: hints.reason,
        suggestion: hints.suggestion,
      };
    }

    // 默认返回通用类型
    const hints = PAGE_TYPE_HINTS['generic'];
    return {
      type: 'generic',
      name: '网页',
      reason: hints.reason,
      suggestion: hints.suggestion,
    };
  } catch {
    // URL 解析失败，返回通用类型
    const hints = PAGE_TYPE_HINTS['generic'];
    return {
      type: 'generic',
      name: '网页',
      reason: hints.reason,
      suggestion: hints.suggestion,
    };
  }
}

/**
 * 检测 SPA 特征
 * 通过检查页面中是否存在常见的 SPA 框架标识
 */
function detectSpaFeatures(): boolean {
  // 检查 React
  if (document.querySelector('[data-reactroot]') || document.querySelector('#__next')) {
    return true;
  }

  // 检查 Vue
  if (document.querySelector('[data-v-]') || document.querySelector('#app[data-server-rendered]')) {
    return true;
  }

  // 检查 Angular
  if (document.querySelector('[ng-version]') || document.querySelector('app-root')) {
    return true;
  }

  return false;
}

/**
 * 生成定位失败的详细提示消息
 *
 * @param pageInfo - 页面类型信息
 * @returns 用于 Toast 显示的消息
 */
export function generateLocationFailureMessage(pageInfo: PageTypeInfo): string {
  if (pageInfo.type === 'generic') {
    return pageInfo.reason;
  }

  return `${pageInfo.reason}。${pageInfo.suggestion}`;
}

/**
 * 生成简短的失败原因（用于 Toast 标题）
 */
export function getShortFailureReason(pageInfo: PageTypeInfo): string {
  return pageInfo.reason;
}

/**
 * 获取操作建议
 */
export function getSuggestion(pageInfo: PageTypeInfo): string {
  return pageInfo.suggestion;
}
