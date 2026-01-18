/**
 * LingoRecall AI - Local Model Section Component
 * 本地模型配置 UI 组件
 *
 * @module popup/components/LocalModelSection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Server,
  Cpu,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  HardDrive,
  Info,
} from 'lucide-react';
import {
  type LocalModelConfig,
  type LocalModelTool,
  LOCAL_MODEL_TOOL_OPTIONS,
} from '../../shared/types/settings';
import {
  detectHardware,
  getModelRecommendations,
  getInstallInstructions,
  LOCAL_TOOLS,
  type HardwareInfo,
  type ModelRecommendation,
} from '../../services/localModelService';
import {
  sendMessage,
  MessageTypes,
  type TestLocalConnectionResult,
} from '../../shared/messaging';

/**
 * LocalModelSection 属性
 */
export interface LocalModelSectionProps {
  /** 当前配置 */
  config: LocalModelConfig;
  /** 配置变更回调 */
  onConfigChange: (config: Partial<LocalModelConfig>) => void;
  /** 保存回调 */
  onSave: () => Promise<void>;
  /** 保存中状态 */
  isSaving: boolean;
  /** 保存成功回调 */
  onSaveSuccess?: () => void;
  /** 错误回调 */
  onError?: (error: string) => void;
}

/**
 * 本地模型配置区域组件
 */
export function LocalModelSection({
  config,
  onConfigChange,
  onSave,
  isSaving,
  onSaveSuccess,
  onError,
}: LocalModelSectionProps): React.ReactElement {
  const { t } = useTranslation();

  // State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestLocalConnectionResult | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [recommendations, setRecommendations] = useState<ModelRecommendation[]>([]);

  // 检测硬件
  useEffect(() => {
    const hw = detectHardware();
    setHardware(hw);
    setRecommendations(getModelRecommendations(hw));
  }, []);

  // 工具变更时更新默认端点
  useEffect(() => {
    const toolOption = LOCAL_MODEL_TOOL_OPTIONS.find((opt) => opt.value === config.tool);
    if (toolOption && !config.endpoint) {
      onConfigChange({ endpoint: toolOption.defaultEndpoint });
    }
  }, [config.tool]);

  // 获取可用模型（通过 background service worker 绕过 CORS）
  useEffect(() => {
    if (config.endpoint && config.tool === 'ollama') {
      sendMessage(MessageTypes.GET_LOCAL_MODELS, {
        endpoint: config.endpoint,
        tool: config.tool,
      }).then((response) => {
        if (response.success && response.data && response.data.models.length > 0) {
          setAvailableModels(response.data.models);
        }
      });
    }
  }, [config.endpoint, config.tool]);

  // 测试连接（通过 background service worker 绕过 CORS）
  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await sendMessage(MessageTypes.TEST_LOCAL_CONNECTION, {
        endpoint: config.endpoint,
        modelName: config.modelName,
        tool: config.tool,
      });

      if (response.success && response.data) {
        const result = response.data;
        setTestResult(result);

        if (result.success && result.availableModels) {
          setAvailableModels(result.availableModels);
        }

        // 如果连接失败，自动展开安装指南
        if (!result.success) {
          setShowGuide(true);
        }
      } else {
        // 消息通信失败
        setTestResult({
          success: false,
          error: '无法与扩展后台通信',
          errorCode: 'INVALID_RESPONSE',
        });
        setShowGuide(true);
      }
    } catch (error) {
      console.error('[LocalModelSection] Test connection error:', error);
      setTestResult({
        success: false,
        error: '测试连接时发生错误',
        errorCode: 'INVALID_RESPONSE',
      });
      setShowGuide(true);
    }

    setIsTesting(false);
  }, [config.endpoint, config.modelName, config.tool]);

  // 保存配置
  const handleSave = useCallback(async () => {
    try {
      await onSave();
      onSaveSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('settings.apiKey.localModel.saveFailed'));
    }
  }, [onSave, onSaveSuccess, onError, t]);

  // 选择推荐模型
  const handleSelectRecommendedModel = useCallback(
    (modelName: string) => {
      onConfigChange({ modelName });
      setShowRecommendations(false);
    },
    [onConfigChange]
  );

  // 工具切换
  const handleToolChange = useCallback(
    (tool: LocalModelTool) => {
      const toolOption = LOCAL_MODEL_TOOL_OPTIONS.find((opt) => opt.value === tool);
      onConfigChange({
        tool,
        endpoint: toolOption?.defaultEndpoint || config.endpoint,
      });
      setTestResult(null);
      setAvailableModels([]);
    },
    [onConfigChange, config.endpoint]
  );

  const toolConfig = LOCAL_TOOLS[config.tool];
  const installInstructions = hardware
    ? getInstallInstructions(config.tool, hardware.platform)
    : [];

  return (
    <div className="space-y-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
      {/* 标题 */}
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <Server className="w-4 h-4" />
        <span className="text-sm font-medium">{t('settings.apiKey.localModel.title')}</span>
      </div>

      {/* 工具选择 */}
      <div className="space-y-1">
        <label className="text-xs text-gray-600 dark:text-gray-400">
          {t('settings.apiKey.localModel.tool')}
        </label>
        <select
          value={config.tool}
          onChange={(e) => handleToolChange(e.target.value as LocalModelTool)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {LOCAL_MODEL_TOOL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* API 端点 */}
      <div className="space-y-1">
        <label className="text-xs text-gray-600 dark:text-gray-400">
          {t('settings.apiKey.localModel.endpoint')}
        </label>
        <input
          type="text"
          value={config.endpoint}
          onChange={(e) => onConfigChange({ endpoint: e.target.value })}
          placeholder={toolConfig.defaultEndpoint}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t('settings.apiKey.localModel.endpointHint')}
        </p>
      </div>

      {/* 模型名称 */}
      <div className="space-y-1">
        <label className="text-xs text-gray-600 dark:text-gray-400">
          {t('settings.apiKey.localModel.modelName')}
        </label>
        {availableModels.length > 0 ? (
          <select
            value={config.modelName}
            onChange={(e) => onConfigChange({ modelName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={config.modelName}
            onChange={(e) => onConfigChange({ modelName: e.target.value })}
            placeholder="llama3.2"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* 测试连接按钮 */}
      <button
        onClick={handleTestConnection}
        disabled={isTesting || !config.endpoint}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isTesting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('settings.apiKey.localModel.testing')}</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <span>{t('settings.apiKey.localModel.testConnection')}</span>
          </>
        )}
      </button>

      {/* 测试结果 */}
      {testResult && (
        <div
          className={`p-3 rounded-md border ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div
            className={`flex items-center gap-2 ${
              testResult.success
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span className="font-medium">
              {testResult.success
                ? t('settings.apiKey.localModel.testSuccess')
                : t('settings.apiKey.localModel.testFailed')}
            </span>
          </div>
          {testResult.success && testResult.latencyMs && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {t('settings.apiKey.localModel.latency', { ms: testResult.latencyMs })}
            </p>
          )}
          {!testResult.success && testResult.error && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{testResult.error}</p>
          )}
          {testResult.availableModels && testResult.availableModels.length > 0 && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {t('settings.apiKey.localModel.availableModels')}: {testResult.availableModels.length}
            </p>
          )}
        </div>
      )}

      {/* 安装指南 */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <span>{t('settings.apiKey.localModel.setupGuide')}</span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showGuide && (
          <div className="px-3 py-2 bg-white dark:bg-gray-800 space-y-2">
            {installInstructions.map((instruction, index) => (
              <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
                {instruction}
              </p>
            ))}
            {toolConfig.installUrl && (
              <a
                href={toolConfig.installUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
              >
                <span>{t('settings.apiKey.localModel.downloadTool')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* 硬件信息和模型推荐 */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <button
          onClick={() => setShowRecommendations(!showRecommendations)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <span>{t('settings.apiKey.localModel.recommendedModels')}</span>
          {showRecommendations ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {showRecommendations && (
          <div className="px-3 py-2 bg-white dark:bg-gray-800 space-y-3">
            {/* 硬件信息 */}
            {hardware && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                  <Cpu className="w-3 h-3" />
                  {hardware.platform === 'mac'
                    ? 'macOS'
                    : hardware.platform === 'windows'
                      ? 'Windows'
                      : 'Linux'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                  <HardDrive className="w-3 h-3" />
                  {t('settings.apiKey.localModel.ramAvailable', { ram: hardware.estimatedRam })}
                </span>
                {hardware.isAppleSilicon && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400">
                    <Info className="w-3 h-3" />
                    Apple Silicon
                  </span>
                )}
              </div>
            )}

            {/* 推荐模型列表 */}
            <div className="space-y-2">
              {recommendations.slice(0, 4).map((model) => (
                <button
                  key={model.modelName}
                  onClick={() => handleSelectRecommendedModel(model.modelName)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-md border transition-colors ${
                    model.recommended
                      ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {model.displayName}
                      </span>
                      {model.recommended && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded">
                          {t('settings.apiKey.localModel.recommended')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{model.useCase}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400 dark:text-gray-500">
                    <div>{model.sizeGB}GB</div>
                    <div>
                      {t('settings.apiKey.localModel.ramRequired', { ram: model.ramRequired })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        disabled={isSaving || !config.endpoint || !config.modelName}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('common.saving')}</span>
          </>
        ) : (
          <span>{t('settings.apiKey.localModel.saveConfig')}</span>
        )}
      </button>

      {/* 提示信息 */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        {t('settings.apiKey.localModel.noApiKeyRequired')}
      </p>
    </div>
  );
}

export default LocalModelSection;
