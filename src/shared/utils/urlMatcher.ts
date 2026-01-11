/**
 * LingoRecall AI - URL Matcher Utilities
 * Story 4.3 - Task 2: URL 匹配工具函数
 *
 * 提供 URL 模式匹配功能，用于黑名单检查
 * 支持通配符: * 匹配任意字符
 *
 * @module shared/utils/urlMatcher
 */

// ============================================================
// Pattern Normalization
// ============================================================

/**
 * 规范化 URL 模式
 * - 转换为小写
 * - 去除首尾空白
 * - 合并连续的通配符
 *
 * @param pattern - 原始模式
 * @returns 规范化后的模式
 *
 * @example
 * normalizePattern('*.PayPal.COM') // '*.paypal.com'
 * normalizePattern('**bank**') // '*bank*'
 */
export function normalizePattern(pattern: string): string {
  return pattern
    .toLowerCase()
    .trim()
    .replace(/\*+/g, '*'); // 合并连续的 *
}

// ============================================================
// Pattern Validation
// ============================================================

/**
 * 验证 URL 模式格式是否有效
 *
 * 有效模式规则:
 * - 不能为空或只有空白
 * - 不能只包含通配符
 * - 至少包含 2 个非通配符字符
 *
 * @param pattern - 待验证的模式
 * @returns 是否为有效模式
 *
 * @example
 * isValidPattern('*.paypal.com') // true
 * isValidPattern('*bank*') // true
 * isValidPattern('*') // false
 * isValidPattern('') // false
 */
export function isValidPattern(pattern: string): boolean {
  // 处理空输入
  if (!pattern || pattern.trim().length === 0) {
    return false;
  }

  const normalized = normalizePattern(pattern);

  // 不能只包含通配符
  if (/^\*+$/.test(normalized)) {
    return false;
  }

  // 至少包含 2 个非通配符字符
  const nonWildcard = normalized.replace(/\*/g, '');
  return nonWildcard.length >= 2;
}

// ============================================================
// Pattern to Regex Conversion
// ============================================================

/**
 * 将 URL 模式转换为正则表达式
 *
 * 支持的模式:
 * - `*` 匹配任意字符 (包括空)
 * - `*.domain.com` 匹配任意子域名
 * - `*keyword*` 匹配包含关键词的字符串
 *
 * @param pattern - URL 模式
 * @returns 匹配用的正则表达式 (大小写不敏感)
 *
 * @example
 * patternToRegex('*.paypal.com').test('www.paypal.com') // true
 * patternToRegex('*bank*').test('mybank.com') // true
 */
export function patternToRegex(pattern: string): RegExp {
  const normalized = normalizePattern(pattern);

  // 转义正则特殊字符，但保留 *
  const escaped = normalized
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`, 'i');
}

// ============================================================
// Blacklist Matching
// ============================================================

/**
 * 检查 URL 是否匹配黑名单中的任意模式
 *
 * 匹配逻辑:
 * 1. 首先尝试匹配 hostname
 * 2. 对于 *.domain.com 模式，只匹配子域名
 * 3. 对于 *keyword* 模式，检查 hostname 中是否包含关键词
 *
 * 安全考虑:
 * - 防止伪造域名: paypal.com.fake.com 不应匹配 *.paypal.com
 * - 关键词匹配有边界: prankster.com 不应匹配 *bank*
 *
 * @param url - 完整 URL
 * @param patterns - 黑名单模式数组
 * @returns 是否匹配黑名单
 *
 * @example
 * matchesBlacklist('https://www.paypal.com', ['*.paypal.com']) // true
 * matchesBlacklist('https://prankster.com', ['*bank*']) // false
 */
export function matchesBlacklist(url: string, patterns: string[]): boolean {
  // 空黑名单，直接返回 false
  if (!patterns || patterns.length === 0) {
    return false;
  }

  // 尝试解析 URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    // 无效 URL，返回 false
    return false;
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 检查每个模式
  return patterns.some((pattern) => {
    const normalized = normalizePattern(pattern);

    // 模式 1: *.domain.com - 子域名通配符
    if (normalized.startsWith('*.')) {
      const domainPart = normalized.slice(2); // 移除 *.
      // hostname 必须以 .domain.com 结尾，或者就是 domain.com
      // 例如: www.paypal.com 匹配 *.paypal.com
      // 但: paypal.com.fake.com 不匹配
      if (hostname === domainPart || hostname.endsWith('.' + domainPart)) {
        return true;
      }
      return false;
    }

    // 模式 2: *keyword* - 关键词匹配
    if (normalized.startsWith('*') && normalized.endsWith('*')) {
      const keyword = normalized.slice(1, -1); // 移除两端的 *
      if (keyword.length > 0) {
        // 检查 hostname 中是否包含关键词作为独立部分
        // 例如: mybank.com, bankofamerica.com 匹配 *bank*
        // 但: prankster.com 不匹配 (bank 不是独立部分)
        return isKeywordInHostname(hostname, keyword);
      }
    }

    // 模式 3: 精确匹配 (无通配符或单个通配符)
    const regex = patternToRegex(normalized);
    return regex.test(hostname);
  });
}

/**
 * 检查关键词是否在 hostname 中作为有意义的部分出现
 *
 * 匹配规则 (宽松但合理):
 * - keyword 出现在 hostname 的开头: bank.com, banking.net
 * - keyword 出现在 hostname 的结尾: mybank.com
 * - keyword 被分隔符隔开: my-bank.com, my.bank.com
 * - keyword 作为域名的一部分: onlinebanking.com
 *
 * 不匹配:
 * - keyword 是其他单词的一部分且不在边界: prankster.com (prank+ster)
 *
 * @param hostname - 主机名
 * @param keyword - 关键词
 * @returns 是否匹配
 */
function isKeywordInHostname(hostname: string, keyword: string): boolean {
  const lowerHost = hostname.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // 不包含关键词，直接返回 false
  if (!lowerHost.includes(lowerKeyword)) {
    return false;
  }

  const index = lowerHost.indexOf(lowerKeyword);
  const keywordLength = lowerKeyword.length;

  // 检查关键词前后的字符
  const charBefore = index > 0 ? lowerHost[index - 1] : null;
  const charAfter = index + keywordLength < lowerHost.length
    ? lowerHost[index + keywordLength]
    : null;

  // 定义分隔符
  const separators = ['.', '-', '_'];

  // 检查是否在边界位置或被分隔符隔开
  const isStartBoundary = charBefore === null || separators.includes(charBefore);
  const isEndBoundary = charAfter === null || separators.includes(charAfter);

  // 如果关键词在任一边界，认为是有效匹配
  // 例如: bank.com (开头), mybank.com (结尾), my-bank.com (两端分隔)
  if (isStartBoundary || isEndBoundary) {
    return true;
  }

  // 特殊情况: 关键词作为 compound word 的核心部分
  // 例如: onlinebanking.com, mobilebanking.net
  // 这些应该匹配，因为 "banking" 是核心服务
  // 但 prankster.com 不应该匹配，因为 "bank" 只是偶然出现

  // 使用启发式方法: 如果关键词长度 >= 4 且占 hostname 较大比例，认为是有效匹配
  // 这可以匹配 bankofamerica.com (bank 是核心部分)
  // 但排除 prankster.com (bank 只是偶然出现在 prank 中)
  const hostWithoutTld = lowerHost.split('.')[0]; // 第一部分
  if (keywordLength >= 4 && keywordLength >= hostWithoutTld.length * 0.3) {
    return true;
  }

  return false;
}
