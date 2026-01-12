/**
 * LingoRecall AI - API Key Section Component
 * Story 4.1 实现 - AC1, AC2, AC3: API Key 配置 UI
 *
 * @module popup/components/APIKeySection
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff, Save, Trash2, Key, ExternalLink, Server, Settings2 } from 'lucide-react';
import { useAIConfig } from '../../hooks/useAIConfig';
import { ConfirmDialog } from './ConfirmDialog';
import { getSettings, saveSettings } from '../../shared/storage/config';
import { AI_PROVIDER_OPTIONS, type AIProviderType } from '../../shared/types/settings';

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

  // 加载当前设置
  useEffect(() => {
    getSettings().then((result) => {
      if (result.success && result.data) {
        setAiProvider(result.data.aiProvider);
        setCustomEndpoint(result.data.customApiEndpoint);
        setCustomModel(result.data.customModelName);
      }
    });
  }, []);

  /**
   * 保存 Provider 配置
   */
  const handleSaveProviderConfig = useCallback(async () => {
    setProviderSaving(true);
    try {
      const result = await saveSettings({
        aiProvider,
        customApiEndpoint: customEndpoint,
        customModelName: customModel,
      });
      if (result.success) {
        onSaveSuccess?.();
      } else {
        onError?.(result.error?.message ?? '保存配置失败');
      }
    } finally {
      setProviderSaving(false);
    }
  }, [aiProvider, customEndpoint, customModel, onSaveSuccess, onError]);

  /**
   * 处理保存 API Key
   * Story 4.1 - AC1
   */
  const handleSave = useCallback(async () => {
    if (!inputValue.trim()) {
      onError?.('请输入 API Key');
      return;
    }

    const result = await saveKey(inputValue.trim());

    if (result.success) {
      setInputValue('');
      onSaveSuccess?.();
    } else {
      onError?.(result.error?.message ?? '保存失败');
    }
  }, [inputValue, saveKey, onSaveSuccess, onError]);

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
      onError?.(result.error?.message ?? '清除失败');
    }
  }, [clearKey, onClearSuccess, onError]);

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
          <h3 className="font-medium">AI Provider</h3>
        </div>
        <select
          value={aiProvider}
          onChange={(e) => setAiProvider(e.target.value as AIProviderType)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {AI_PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} - {opt.description}
            </option>
          ))}
        </select>
      </div>

      {/* OpenAI 兼容配置 */}
      {aiProvider === 'openai-compatible' && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Server className="w-4 h-4" />
            <span className="text-sm font-medium">自定义 API 配置</span>
          </div>

          {/* API 端点 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-gray-400">API 端点 URL</label>
            <input
              type="text"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="http://localhost:8080/v1/chat/completions"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              支持 CLI Proxy、Ollama、LM Studio 等 OpenAI 兼容 API
            </p>
          </div>

          {/* 模型名称 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-gray-400">模型名称</label>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="gpt-4 / claude-3-opus / llama3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 保存配置按钮 */}
          <button
            onClick={handleSaveProviderConfig}
            disabled={providerSaving || !customEndpoint.trim()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {providerSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>保存配置</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 标题和说明 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Key className="w-4 h-4" />
          <h3 className="font-medium">API Key</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {aiProvider === 'gemini'
            ? '配置您的 Gemini API Key 以启用 AI 词汇分析功能'
            : '配置自定义 API 的访问密钥（如不需要可留空）'}
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
              placeholder="输入您的 Gemini API Key"
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
                aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
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
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </>
              )}
            </button>
          ) : (
            // 清除按钮
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>清除</span>
            </button>
          )}
        </div>

        {/* 获取 API Key 链接 */}
        {!hasKey && aiProvider === 'gemini' && (
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
          >
            <span>获取 Gemini API Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* 已保存状态提示 */}
        {hasKey && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            API Key 已配置
          </p>
        )}
      </div>

      {/* 确认清除对话框 */}
      {showConfirm && (
        <ConfirmDialog
          title="确认清除"
          message="确定要清除已保存的 API Key 吗？清除后需要重新配置才能使用 AI 分析功能。"
          confirmText="清除"
          cancelText="取消"
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
