/**
 * LingoRecall AI - API Key Section Component
 * Story 4.1 实现 - AC1, AC2, AC3: API Key 配置 UI
 *
 * @module popup/components/APIKeySection
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Save, Trash2, Key, ExternalLink, Server, Settings2, Zap, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAIConfig } from '../../hooks/useAIConfig';
import { ConfirmDialog } from './ConfirmDialog';
import { UsageMonitor } from './UsageMonitor';
import { LocalModelSection } from './LocalModelSection';
import { getSettings, saveSettings } from '../../shared/storage/config';
import { sendMessage, MessageTypes, type TestApiConnectionResult } from '../../shared/messaging';
import {
  AI_PROVIDER_OPTIONS,
  DEFAULT_LOCAL_MODEL_CONFIG,
  DEFAULT_OPENAI_COMPATIBLE_CONFIG,
  type AIProviderType,
  type LocalModelConfig,
  type ProviderConfigs,
} from '../../shared/types/settings';

/**
 * APIKeySection 属性
 */
export interface APIKeySectionProps {
  /** 保存成功回调 */
  onSaveSuccess?: () => void;
  /** 清除成功回调 */
  onClearSuccess?: () => void;
  /** 错误回调 */
  onError?: (error: string) => void;
}

/**
 * API Key 配置区域组件
 * Story 4.1 - Task 2
 */
export function APIKeySection({
  onSaveSuccess,
  onClearSuccess,
  onError,
}: APIKeySectionProps): React.ReactElement {
  const { t } = useTranslation();

  // 使用 AI 配置 Hook
  const {
    displayValue,
    hasKey,
    isLoading,
    isSaving,
    error,
    showKey,
    toggleShowKey,
    saveKey,
    clearKey,
  } = useAIConfig();

  // 本地输入状态（用于新 Key 输入）
  const [inputValue, setInputValue] = useState('');
  // 确认对话框状态
  const [showConfirm, setShowConfirm] = useState(false);

  // AI Provider 配置状态
  const [aiProvider, setAiProvider] = useState<AIProviderType>('gemini');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [providerSaving, setProviderSaving] = useState(false);
  const [localModelConfig, setLocalModelConfig] = useState<LocalModelConfig>({
    ...DEFAULT_LOCAL_MODEL_CONFIG,
  });
  // 各 Provider 的配置缓存，切换时保留
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfigs>({
    gemini: { modelName: 'gemini-2.0-flash-lite' },
    openaiCompatible: { ...DEFAULT_OPENAI_COMPATIBLE_CONFIG },
    localhost: { ...DEFAULT_LOCAL_MODEL_CONFIG },
  });

  // API 测试相关状态
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestApiConnectionResult | null>(null);

  // 加载当前设置
  useEffect(() => {
    getSettings().then((result) => {
      if (result.success && result.data) {
        setAiProvider(result.data.aiProvider);
        setCustomEndpoint(result.data.customApiEndpoint);
        setCustomModel(result.data.customModelName);
        if (result.data.localModelConfig) {
          setLocalModelConfig(result.data.localModelConfig);
        }
        // 加载各 Provider 的配置缓存
        if (result.data.providerConfigs) {
          setProviderConfigs(result.data.providerConfigs);
          // 根据当前 Provider 恢复对应配置
          if (result.data.aiProvider === 'openai-compatible') {
            setCustomEndpoint(result.data.providerConfigs.openaiCompatible.endpoint);
            setCustomModel(result.data.providerConfigs.openaiCompatible.modelName);
          } else if (result.data.aiProvider === 'localhost') {
            setLocalModelConfig(result.data.providerConfigs.localhost);
          }
        }
      }
    });
  }, []);

  /**
   * 处理 Provider 切换
   * 保存当前配置并恢复目标 Provider 的配置
   */
  const handleProviderChange = useCallback(async (newProvider: AIProviderType) => {
    // 保存当前 Provider 的配置到缓存
    const updatedConfigs = { ...providerConfigs };

    if (aiProvider === 'openai-compatible') {
      updatedConfigs.openaiCompatible = {
        endpoint: customEndpoint,
        modelName: customModel,
      };
    } else if (aiProvider === 'localhost') {
      updatedConfigs.localhost = { ...localModelConfig };
    }

    setProviderConfigs(updatedConfigs);

    // 恢复目标 Provider 的配置
    if (newProvider === 'openai-compatible') {
      setCustomEndpoint(updatedConfigs.openaiCompatible.endpoint);
      setCustomModel(updatedConfigs.openaiCompatible.modelName);
    } else if (newProvider === 'localhost') {
      setLocalModelConfig(updatedConfigs.localhost);
    }

    setAiProvider(newProvider);
    // 清除测试结果
    setTestResult(null);

    // 保存到存储
    await saveSettings({
      aiProvider: newProvider,
      providerConfigs: updatedConfigs,
    });
  }, [aiProvider, customEndpoint, customModel, localModelConfig, providerConfigs]);

  /**
   * 保存 Provider 配置
   */
  const handleSaveProviderConfig = useCallback(async () => {
    setProviderSaving(true);
    try {
      // 同时更新 providerConfigs 缓存
      const updatedConfigs = {
        ...providerConfigs,
        openaiCompatible: {
          endpoint: customEndpoint,
          modelName: customModel,
        },
      };
      setProviderConfigs(updatedConfigs);

      const result = await saveSettings({
        aiProvider,
        customApiEndpoint: customEndpoint,
        customModelName: customModel,
        providerConfigs: updatedConfigs,
      });
      if (result.success) {
        onSaveSuccess?.();
      } else {
        onError?.(result.error?.message ?? t('settings.apiKey.configSaveFailed'));
      }
    } finally {
      setProviderSaving(false);
    }
  }, [aiProvider, customEndpoint, customModel, providerConfigs, onSaveSuccess, onError, t]);

  /**
   * 更新本地模型配置
   */
  const handleLocalConfigChange = useCallback((partial: Partial<LocalModelConfig>) => {
    setLocalModelConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  /**
   * 保存本地模型配置
   */
  const handleSaveLocalConfig = useCallback(async () => {
    setProviderSaving(true);
    try {
      // 同时更新 providerConfigs 缓存
      const updatedConfigs = {
        ...providerConfigs,
        localhost: { ...localModelConfig },
      };
      setProviderConfigs(updatedConfigs);

      const result = await saveSettings({
        aiProvider,
        localModelConfig,
        providerConfigs: updatedConfigs,
      });
      if (result.success) {
        onSaveSuccess?.();
      } else {
        onError?.(result.error?.message ?? t('settings.apiKey.configSaveFailed'));
      }
    } finally {
      setProviderSaving(false);
    }
  }, [aiProvider, localModelConfig, providerConfigs, onSaveSuccess, onError, t]);

  /**
   * 测试 API 连接
   */
  const handleTestApi = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await sendMessage(MessageTypes.TEST_API_CONNECTION, {
        provider: aiProvider,
        apiKey: hasKey ? undefined : inputValue.trim(), // 如果已有 key，后端会从存储中读取
        customEndpoint: customEndpoint,
        customModel: customModel,
      });

      if (response.success && response.data) {
        setTestResult(response.data);
      } else {
        setTestResult({
          success: false,
          error: response.error?.message || '测试失败',
          errorCode: 'UNKNOWN',
        });
      }
    } catch (error) {
      console.error('[APIKeySection] Test API error:', error);
      setTestResult({
        success: false,
        error: '测试时发生错误',
        errorCode: 'UNKNOWN',
      });
    }

    setIsTesting(false);
  }, [aiProvider, hasKey, inputValue, customEndpoint, customModel]);

  /**
   * 处理保存 API Key
   * Story 4.1 - AC1
   */
  const handleSave = useCallback(async () => {
    if (!inputValue.trim()) {
      onError?.(t('settings.apiKey.enterKey'));
      return;
    }

    const result = await saveKey(inputValue.trim());

    if (result.success) {
      setInputValue('');
      onSaveSuccess?.();
    } else {
      onError?.(result.error?.message ?? t('settings.apiKey.saveFailed'));
    }
  }, [inputValue, saveKey, onSaveSuccess, onError, t]);

  /**
   * 处理清除 API Key
   * Story 4.1 - AC3
   */
  const handleClear = useCallback(async () => {
    const result = await clearKey();

    if (result.success) {
      setShowConfirm(false);
      onClearSuccess?.();
    } else {
      onError?.(result.error?.message ?? t('settings.apiKey.clearFailed'));
    }
  }, [clearKey, onClearSuccess, onError, t]);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !hasKey && inputValue.trim()) {
        handleSave();
      }
    },
    [hasKey, inputValue, handleSave]
  );

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Provider 选择 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Settings2 className="w-4 h-4" />
          <h3 className="font-medium">{t('settings.apiKey.aiProvider')}</h3>
        </div>
        <select
          value={aiProvider}
          onChange={(e) => handleProviderChange(e.target.value as AIProviderType)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {AI_PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} - {opt.description}
            </option>
          ))}
        </select>
      </div>

      {/* 本地模型配置 */}
      {aiProvider === 'localhost' && (
        <LocalModelSection
          config={localModelConfig}
          onConfigChange={handleLocalConfigChange}
          onSave={handleSaveLocalConfig}
          isSaving={providerSaving}
          onSaveSuccess={onSaveSuccess}
          onError={onError}
        />
      )}

      {/* OpenAI 兼容配置 - 整合 API Key 到同一区块 */}
      {aiProvider === 'openai-compatible' && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Server className="w-4 h-4" />
            <span className="text-sm font-medium">{t('settings.apiKey.customConfig')}</span>
          </div>

          {/* API 端点 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-gray-400">{t('settings.apiKey.endpointUrl')}</label>
            <input
              type="text"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="http://localhost:8080/v1/chat/completions"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('settings.apiKey.endpointHint')}
            </p>
          </div>

          {/* 模型名称 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-gray-400">{t('settings.apiKey.modelName')}</label>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="gpt-4 / claude-3-opus / llama3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* API Key 输入 - 整合到自定义配置区块内 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-gray-400">{t('settings.apiKey.title')}</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={hasKey ? displayValue : inputValue}
                onChange={(e) => !hasKey && setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('settings.apiKey.placeholder')}
                disabled={hasKey || isSaving}
                className={`
                  w-full px-3 py-2 pr-10
                  border rounded-md
                  text-sm
                  bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed
                  ${error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
                `}
                aria-label="API Key"
              />
              {/* 显示/隐藏切换按钮 */}
              {(hasKey || inputValue) && (
                <button
                  type="button"
                  onClick={toggleShowKey}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showKey ? t('settings.apiKey.hideKey') : t('settings.apiKey.showKey')}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('settings.apiKey.customDescription')}
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="text-xs text-red-500" role="alert">
              {error}
            </p>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            {/* 测试 API 按钮 */}
            <button
              onClick={handleTestApi}
              disabled={isTesting || !customEndpoint.trim() || (!hasKey && !inputValue.trim())}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('settings.apiKey.testApiTesting')}</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>{t('settings.apiKey.testApi')}</span>
                </>
              )}
            </button>

            {/* 保存配置按钮 */}
            <button
              onClick={async () => {
                // 先保存 API Key（如果有新输入）
                if (!hasKey && inputValue.trim()) {
                  const keyResult = await saveKey(inputValue.trim());
                  if (keyResult.success) {
                    setInputValue('');
                  } else {
                    onError?.(keyResult.error?.message ?? t('settings.apiKey.saveFailed'));
                    return;
                  }
                }
                // 然后保存其他配置
                await handleSaveProviderConfig();
              }}
              disabled={providerSaving || isSaving || !customEndpoint.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {providerSaving || isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>{t('common.saving')}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('settings.apiKey.saveConfig')}</span>
                </>
              )}
            </button>

            {/* 清除 API Key 按钮 - 仅当已保存时显示 */}
            {hasKey && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('settings.apiKey.clear')}</span>
              </button>
            )}
          </div>

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
                    ? t('settings.apiKey.testApiSuccess')
                    : t('settings.apiKey.testApiFailed')}
                </span>
              </div>
              {testResult.success && testResult.latencyMs && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  {t('settings.apiKey.testApiLatency', { ms: testResult.latencyMs })}
                </p>
              )}
              {!testResult.success && testResult.error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{testResult.error}</p>
              )}
            </div>
          )}

          {/* 已保存状态提示 */}
          {hasKey && !testResult && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              {t('settings.apiKey.configured')}
            </p>
          )}
        </div>
      )}

      {/* Gemini 模式的 API Key 配置 - 保持原有结构 */}
      {aiProvider === 'gemini' && (
        <>
          {/* 标题和说明 */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Key className="w-4 h-4" />
              <h3 className="font-medium">{t('settings.apiKey.title')}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('settings.apiKey.geminiDescription')}
            </p>
          </div>

          {/* API Key 输入区域 */}
          <div className="space-y-3">
            {/* 输入框和切换按钮 */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={hasKey ? displayValue : inputValue}
                  onChange={(e) => !hasKey && setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('settings.apiKey.placeholder')}
                  disabled={hasKey || isSaving}
                  className={`
                    w-full px-3 py-2 pr-10
                    border rounded-md
                    text-sm
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed
                    ${error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
                  `}
                  aria-label="API Key"
                  aria-describedby={error ? 'api-key-error' : undefined}
                />

                {/* 显示/隐藏切换按钮 */}
                {(hasKey || inputValue) && (
                  <button
                    type="button"
                    onClick={toggleShowKey}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showKey ? t('settings.apiKey.hideKey') : t('settings.apiKey.showKey')}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <p id="api-key-error" className="text-xs text-red-500" role="alert">
                {error}
              </p>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2">
              {!hasKey ? (
                // 保存按钮
                <button
                  onClick={handleSave}
                  disabled={isSaving || !inputValue.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>{t('common.saving')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{t('common.save')}</span>
                    </>
                  )}
                </button>
              ) : (
                <>
                  {/* 测试 API 按钮 */}
                  <button
                    onClick={handleTestApi}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('settings.apiKey.testApiTesting')}</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>{t('settings.apiKey.testApi')}</span>
                      </>
                    )}
                  </button>
                  {/* 清除按钮 */}
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t('settings.apiKey.clear')}</span>
                  </button>
                </>
              )}
            </div>

            {/* 获取 API Key 链接 */}
            {!hasKey && (
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
              >
                <span>{t('settings.apiKey.getKey')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

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
                      ? t('settings.apiKey.testApiSuccess')
                      : t('settings.apiKey.testApiFailed')}
                  </span>
                </div>
                {testResult.success && testResult.latencyMs && (
                  <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                    {t('settings.apiKey.testApiLatency', { ms: testResult.latencyMs })}
                  </p>
                )}
                {!testResult.success && testResult.error && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{testResult.error}</p>
                )}
              </div>
            )}

            {/* 已保存状态提示 */}
            {hasKey && !testResult && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {t('settings.apiKey.configured')}
              </p>
            )}
          </div>
        </>
      )}

      {/* 用量监控 - 仅当有 API Key 且非本地模型时显示 */}
      {hasKey && aiProvider !== 'localhost' && <UsageMonitor />}

      {/* 确认清除对话框 */}
      {showConfirm && (
        <ConfirmDialog
          title={t('settings.apiKey.clearConfirmTitle')}
          message={t('settings.apiKey.clearConfirmMessage')}
          confirmText={t('settings.apiKey.clear')}
          cancelText={t('dialog.cancel')}
          confirmType="danger"
          onConfirm={handleClear}
          onCancel={() => setShowConfirm(false)}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}

export default APIKeySection;
