/**
 * LingoRecall AI - Local Model Service
 * 本地模型服务：连接测试、模型发现、硬件检测和模型推荐
 *
 * @module services/localModelService
 */

import type { LocalModelTool } from '../shared/types/settings';

// ============================================================
// Types
// ============================================================

/**
 * 本地工具配置
 */
export interface LocalToolConfig {
  name: string;
  defaultEndpoint: string;
  modelListEndpoint?: string;
  chatEndpoint: string;
  installUrl: string;
  installInstructions: Record<'mac' | 'windows' | 'linux', string[]>;
}

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  success: boolean;
  latencyMs?: number;
  availableModels?: string[];
  error?: string;
  errorCode?: 'CONNECTION_REFUSED' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'MODEL_NOT_FOUND';
}

/**
 * 硬件检测结果
 */
export interface HardwareInfo {
  platform: 'mac' | 'windows' | 'linux' | 'unknown';
  isAppleSilicon: boolean;
  estimatedRam: number;
  gpuType: 'nvidia' | 'amd' | 'apple' | 'integrated' | 'unknown';
}

/**
 * 模型推荐
 */
export interface ModelRecommendation {
  modelName: string;
  displayName: string;
  sizeGB: number;
  ramRequired: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'high' | 'medium' | 'basic';
  useCase: string;
  recommended?: boolean;
}

// ============================================================
// Constants
// ============================================================

/**
 * 本地模型工具配置
 */
export const LOCAL_TOOLS: Record<LocalModelTool, LocalToolConfig> = {
  ollama: {
    name: 'Ollama',
    defaultEndpoint: 'http://localhost:11434',
    modelListEndpoint: '/api/tags',
    chatEndpoint: '/api/chat',
    installUrl: 'https://ollama.ai/download',
    installInstructions: {
      mac: [
        '1. 访问 ollama.ai/download 下载 Ollama',
        '2. 双击 .dmg 文件安装',
        '3. 打开终端，下载推荐模型:',
        '   • 翻译专用(推荐): ollama pull translategemma:12b',
        '   • 通用模型: ollama pull llama3.2',
        '4. 模型下载完成后即可使用',
      ],
      windows: [
        '1. 访问 ollama.ai/download 下载 Windows 版本',
        '2. 运行安装程序',
        '3. 打开命令提示符，下载推荐模型:',
        '   • 翻译专用(推荐): ollama pull translategemma:12b',
        '   • 通用模型: ollama pull llama3.2',
        '4. 模型下载完成后即可使用',
      ],
      linux: [
        '1. 运行: curl -fsSL https://ollama.ai/install.sh | sh',
        '2. 下载推荐模型:',
        '   • 翻译专用(推荐): ollama pull translategemma:12b',
        '   • 通用模型: ollama pull llama3.2',
        '3. 模型下载完成后即可使用',
      ],
    },
  },
  'lm-studio': {
    name: 'LM Studio',
    defaultEndpoint: 'http://localhost:1234',
    chatEndpoint: '/v1/chat/completions',
    installUrl: 'https://lmstudio.ai/',
    installInstructions: {
      mac: [
        '1. 访问 lmstudio.ai 下载 LM Studio',
        '2. 安装并打开 LM Studio',
        '3. 在 Discover 页面搜索并下载模型',
        '4. 切换到 Local Server 标签页，点击 Start Server',
      ],
      windows: [
        '1. 访问 lmstudio.ai 下载 LM Studio',
        '2. 安装并打开 LM Studio',
        '3. 在 Discover 页面搜索并下载模型',
        '4. 切换到 Local Server 标签页，点击 Start Server',
      ],
      linux: [
        '1. 访问 lmstudio.ai 下载 AppImage',
        '2. 运行 AppImage 文件',
        '3. 下载模型并启动本地服务器',
      ],
    },
  },
  'llama-cpp': {
    name: 'llama.cpp',
    defaultEndpoint: 'http://localhost:8080',
    chatEndpoint: '/v1/chat/completions',
    installUrl: 'https://github.com/ggerganov/llama.cpp',
    installInstructions: {
      mac: [
        '1. 安装 Homebrew（如未安装）',
        '2. 运行: brew install llama.cpp',
        '3. 下载 GGUF 格式模型文件',
        '4. 运行: llama-server -m model.gguf --port 8080',
      ],
      windows: [
        '1. 从 GitHub Releases 下载预编译版本',
        '2. 下载 GGUF 格式模型文件',
        '3. 运行: llama-server.exe -m model.gguf --port 8080',
      ],
      linux: [
        '1. 克隆仓库: git clone https://github.com/ggerganov/llama.cpp',
        '2. 编译: cd llama.cpp && make',
        '3. 下载 GGUF 格式模型文件',
        '4. 运行: ./llama-server -m model.gguf --port 8080',
      ],
    },
  },
  other: {
    name: '其他',
    defaultEndpoint: 'http://localhost:8000',
    chatEndpoint: '/v1/chat/completions',
    installUrl: '',
    installInstructions: {
      mac: ['请参考对应工具的官方文档配置本地服务器'],
      windows: ['请参考对应工具的官方文档配置本地服务器'],
      linux: ['请参考对应工具的官方文档配置本地服务器'],
    },
  },
};

/**
 * 模型推荐列表
 *
 * 分为两类：
 * 1. 翻译专用模型 (TranslateGemma) - Google 专门训练的翻译模型，速度快、翻译质量高
 * 2. 通用模型 - 可以做翻译、单词分析等多种任务
 */
export const MODEL_RECOMMENDATIONS: ModelRecommendation[] = [
  // ============================================================
  // 🌟 TranslateGemma 系列 - 翻译专用模型（强烈推荐）
  // Google 2025年1月发布的开源翻译模型，基于 Gemma 3 架构
  // 特点：翻译速度快（比通用模型快 5-8 倍）、支持 55 种语言、翻译质量高
  // ============================================================
  {
    modelName: 'translategemma:4b',
    displayName: 'TranslateGemma 4B ⚡',
    sizeGB: 3.3,
    ramRequired: 8,
    speed: 'fast',
    quality: 'high',
    useCase: '🌟 翻译专用：速度最快，8GB 内存推荐',
  },
  {
    modelName: 'translategemma:12b',
    displayName: 'TranslateGemma 12B 🏆',
    sizeGB: 8.1,
    ramRequired: 16,
    speed: 'fast',
    quality: 'high',
    useCase: '🏆 强烈推荐：专业翻译质量，速度快',
    recommended: true,
  },
  {
    modelName: 'translategemma:27b',
    displayName: 'TranslateGemma 27B',
    sizeGB: 17,
    ramRequired: 32,
    speed: 'medium',
    quality: 'high',
    useCase: '最高翻译质量，需要 32GB 内存',
  },

  // ============================================================
  // 通用模型 - 可以做翻译、单词分析等任务
  // ============================================================
  {
    modelName: 'llama3.2:1b',
    displayName: 'Llama 3.2 1B',
    sizeGB: 1.3,
    ramRequired: 4,
    speed: 'fast',
    quality: 'basic',
    useCase: '低配设备，快速响应',
  },
  {
    modelName: 'llama3.2:3b',
    displayName: 'Llama 3.2 3B',
    sizeGB: 2.0,
    ramRequired: 6,
    speed: 'fast',
    quality: 'medium',
    useCase: '平衡速度和质量',
  },
  {
    modelName: 'llama3.2',
    displayName: 'Llama 3.2 8B',
    sizeGB: 4.7,
    ramRequired: 8,
    speed: 'medium',
    quality: 'high',
    useCase: '通用模型：性价比高',
  },
  {
    modelName: 'qwen2.5:7b',
    displayName: 'Qwen 2.5 7B',
    sizeGB: 4.4,
    ramRequired: 8,
    speed: 'medium',
    quality: 'high',
    useCase: '中文优化，翻译质量高',
  },
  {
    modelName: 'gemma2:9b',
    displayName: 'Gemma 2 9B',
    sizeGB: 5.4,
    ramRequired: 10,
    speed: 'medium',
    quality: 'high',
    useCase: 'Google 开源模型',
  },
  {
    modelName: 'mistral',
    displayName: 'Mistral 7B',
    sizeGB: 4.1,
    ramRequired: 8,
    speed: 'fast',
    quality: 'high',
    useCase: '速度与质量兼顾',
  },
];

// ============================================================
// Hardware Detection
// ============================================================

/**
 * 检测用户硬件
 */
export function detectHardware(): HardwareInfo {
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';

  // 检测操作系统
  let os: HardwareInfo['platform'] = 'unknown';
  if (platform.includes('Mac') || userAgent.includes('Mac')) {
    os = 'mac';
  } else if (platform.includes('Win') || userAgent.includes('Windows')) {
    os = 'windows';
  } else if (platform.includes('Linux') || userAgent.includes('Linux')) {
    os = 'linux';
  }

  // 检测 Apple Silicon
  const isAppleSilicon =
    os === 'mac' &&
    (userAgent.includes('ARM') ||
      // @ts-expect-error - userAgentData is experimental
      navigator.userAgentData?.platform === 'macOS');

  // 估算 RAM（浏览器限制，只能粗略估计）
  // @ts-expect-error - deviceMemory is experimental
  const estimatedRam: number = navigator.deviceMemory || 8;

  // GPU 类型检测
  let gpuType: HardwareInfo['gpuType'] = 'unknown';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(
          debugInfo.UNMASKED_RENDERER_WEBGL
        );
        if (renderer.includes('NVIDIA')) gpuType = 'nvidia';
        else if (renderer.includes('AMD') || renderer.includes('Radeon')) gpuType = 'amd';
        else if (renderer.includes('Apple')) gpuType = 'apple';
        else if (renderer.includes('Intel')) gpuType = 'integrated';
      }
    }
  } catch {
    // GPU detection failed, keep as unknown
  }

  return {
    platform: os,
    isAppleSilicon,
    estimatedRam,
    gpuType,
  };
}

/**
 * 根据硬件推荐模型
 */
export function getModelRecommendations(hardware: HardwareInfo): ModelRecommendation[] {
  const ram = hardware.estimatedRam || 8;

  return MODEL_RECOMMENDATIONS.filter((model) => model.ramRequired <= ram).sort((a, b) => {
    // Apple Silicon 或 NVIDIA GPU 用户优先推荐较大模型
    if (hardware.isAppleSilicon || hardware.gpuType === 'nvidia') {
      // 优先推荐 recommended 的模型
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return b.sizeGB - a.sizeGB;
    }

    // 其他情况优先推荐平衡模型
    const qualityScore = { high: 3, medium: 2, basic: 1 };
    const speedScore = { fast: 3, medium: 2, slow: 1 };

    // 优先推荐 recommended 的模型
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;

    return (
      qualityScore[b.quality] +
      speedScore[b.speed] -
      (qualityScore[a.quality] + speedScore[a.speed])
    );
  });
}

// ============================================================
// Connection Testing
// ============================================================

/**
 * 测试本地模型连接
 */
export async function testLocalConnection(
  endpoint: string,
  modelName: string,
  tool: LocalModelTool
): Promise<ConnectionTestResult> {
  const startTime = performance.now();
  const toolConfig = LOCAL_TOOLS[tool];

  try {
    // 1. 首先检查服务是否在运行
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `连接超时，请检查 ${toolConfig.name} 是否正在运行`,
          errorCode: 'TIMEOUT',
        };
      }
      return {
        success: false,
        error: `无法连接到 ${toolConfig.name}，请确保服务正在运行`,
        errorCode: 'CONNECTION_REFUSED',
      };
    }

    // 2. 获取可用模型列表 (Ollama specific)
    let availableModels: string[] = [];
    if (tool === 'ollama' && toolConfig.modelListEndpoint) {
      try {
        const modelsResponse = await fetch(`${endpoint}${toolConfig.modelListEndpoint}`);
        const modelsData = await modelsResponse.json();
        availableModels = modelsData.models?.map((m: { name: string }) => m.name) || [];
      } catch {
        // Model list fetch failed, continue without it
      }
    }

    // 3. 发送测试请求
    const testEndpoint =
      tool === 'ollama' ? `${endpoint}/api/chat` : `${endpoint}${toolConfig.chatEndpoint}`;

    const testRequest =
      tool === 'ollama'
        ? {
            model: modelName,
            messages: [{ role: 'user', content: 'Say OK' }],
            stream: false,
          }
        : {
            model: modelName,
            messages: [{ role: 'user', content: 'Say OK' }],
            max_tokens: 10,
          };

    const testController = new AbortController();
    const testTimeoutId = setTimeout(() => testController.abort(), 30000);

    try {
      const response = await fetch(testEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testRequest),
        signal: testController.signal,
      });
      clearTimeout(testTimeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404 || errorText.includes('not found')) {
          return {
            success: false,
            error: `未找到模型 "${modelName}"，请先下载该模型`,
            errorCode: 'MODEL_NOT_FOUND',
            availableModels,
          };
        }
        return {
          success: false,
          error: `服务器错误: ${response.status}`,
          errorCode: 'INVALID_RESPONSE',
          availableModels,
        };
      }

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        success: true,
        latencyMs,
        availableModels,
      };
    } catch (error) {
      clearTimeout(testTimeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: '模型响应超时，可能正在加载中，请稍后重试',
          errorCode: 'TIMEOUT',
          availableModels,
        };
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          success: false,
          error: `无法连接到 ${toolConfig.name}`,
          errorCode: 'CONNECTION_REFUSED',
        };
      }
    }
    return {
      success: false,
      error: '发生未知错误',
      errorCode: 'INVALID_RESPONSE',
    };
  }
}

/**
 * 获取已安装的模型列表（仅 Ollama）
 */
export async function getAvailableModels(
  endpoint: string,
  tool: LocalModelTool
): Promise<string[]> {
  if (tool !== 'ollama') {
    return [];
  }

  try {
    const response = await fetch(`${endpoint}/api/tags`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}

/**
 * 获取安装指南
 */
export function getInstallInstructions(
  tool: LocalModelTool,
  platform: HardwareInfo['platform']
): string[] {
  const toolConfig = LOCAL_TOOLS[tool];
  const platformKey = platform === 'unknown' ? 'mac' : platform;
  return toolConfig.installInstructions[platformKey];
}
