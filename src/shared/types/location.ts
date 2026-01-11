/**
 * LingoRecall AI - Source Location Types
 * 定义文本选择位置信息的类型，用于精确定位和回溯到原文位置
 */

/**
 * 文本位置信息接口
 * 包含 XPath 和偏移量信息，用于精确定位文本在 DOM 中的位置
 */
export interface TextPosition {
  /** XPath 表达式，唯一标识 DOM 中的节点 */
  xpath: string;
  /** 文本在节点中的起始偏移量 */
  textOffset: number;
  /** 选中文本的长度 */
  textLength: number;
}

/**
 * 上下文信息接口
 * 包含选中文本前后的上下文，用于文本匹配回退策略
 */
export interface ContextInfo {
  /** 选中文本前的上下文（最多 100 字符） */
  contextBefore: string;
  /** 选中文本后的上下文（最多 100 字符） */
  contextAfter: string;
}

/**
 * 完整的源位置信息接口
 * 包含所有定位所需的信息，支持 XPath 定位和文本匹配回退
 */
export interface SourceLocation {
  // 主要定位信息（XPath + 偏移量）
  /** XPath 表达式，唯一标识包含选中文本的 DOM 节点 */
  xpath: string;
  /** 文本在节点中的起始偏移量 */
  textOffset: number;
  /** 选中文本的长度 */
  textLength: number;

  // 回退定位信息（文本匹配）
  /** 选中文本前的上下文（最多 100 字符），用于当 XPath 失效时进行文本匹配 */
  contextBefore: string;
  /** 选中文本后的上下文（最多 100 字符），用于当 XPath 失效时进行文本匹配 */
  contextAfter: string;
  /** 原始选中的文本内容 */
  originalText: string;

  // 来源元数据
  /** 页面 URL */
  sourceUrl: string;
  /** 页面标题 */
  sourceTitle: string;
}

/**
 * XPath 评估结果类型
 * 用于验证 XPath 是否能正确定位到目标节点
 */
export interface XPathEvaluationResult {
  /** 是否成功找到节点 */
  found: boolean;
  /** 找到的节点（如果有） */
  node: Node | null;
  /** 错误信息（如果有） */
  error?: string;
}
