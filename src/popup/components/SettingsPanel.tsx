/**
 * LingoRecall AI - Settings Panel Component
 * Story 4.1, 4.2, 4.3, 4.4 实现 - 设置页面主容器
 *
 * 包含 Tab 导航：API Key, Preferences, Blacklist, Tags
 *
 * @module popup/components/SettingsPanel
 */

import React, { useState } from 'react';
import { ArrowLeft, Key, Settings, Shield, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APIKeySection } from './APIKeySection';
import { PreferencesSection } from './PreferencesSection';
import { BlacklistSection } from './BlacklistSection';
import { TagManagement } from './TagManagement';
import { Toast, useToast } from './Toast';

/**
 * 设置 Tab 类型
 */
type SettingsTab = 'api-key' | 'preferences' | 'blacklist' | 'tags';

/**
 * Tab 配置
 */
interface TabConfig {
  id: SettingsTab;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'api-key', labelKey: 'settings.tabs.apiKey', icon: Key },
  { id: 'preferences', labelKey: 'settings.tabs.preferences', icon: Settings },
  { id: 'blacklist', labelKey: 'settings.tabs.blacklist', icon: Shield },
  { id: 'tags', labelKey: 'settings.tabs.tags', icon: Tag },
];

/**
 * SettingsPanel 属性
 */
export interface SettingsPanelProps {
  /** 返回回调 */
  onBack?: () => void;
}

/**
 * 设置面板组件
 * Story 4.1 - Task 1
 */
export function SettingsPanel({ onBack }: SettingsPanelProps): React.ReactElement {
  const { t } = useTranslation();
  // 当前选中的 Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('api-key');
  // Toast 通知
  const toast = useToast();

  /**
   * 处理 Tab 切换
   */
  const handleTabChange = (tabId: SettingsTab) => {
    const tab = TABS.find((t) => t.id === tabId);
    if (tab?.disabled) {
      toast.info(t('settings.toast.comingSoon'));
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* 顶部标题栏 */}
      <header className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.title')}
        </h1>
      </header>

      {/* Tab 导航 */}
      <nav className="flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={isDisabled}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              className={`
                flex-1 flex items-center justify-center gap-1.5
                px-3 py-2.5
                text-sm font-medium
                border-b-2 -mb-px
                transition-colors
                ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                    : isDisabled
                      ? 'text-gray-300 dark:text-gray-600 border-transparent cursor-not-allowed'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab 内容区域 */}
      <main className="flex-1 overflow-auto">
        {/* API Key Tab */}
        <div
          id="panel-api-key"
          role="tabpanel"
          aria-labelledby="tab-api-key"
          className={activeTab === 'api-key' ? 'p-4' : 'hidden'}
        >
          <APIKeySection
            onSaveSuccess={() => toast.success(t('settings.toast.apiKeySaved'))}
            onClearSuccess={() => toast.success(t('settings.toast.apiKeyCleared'))}
            onError={(error) => toast.error(error)}
          />
        </div>

        {/* Preferences Tab - Story 4.2 */}
        <div
          id="panel-preferences"
          role="tabpanel"
          aria-labelledby="tab-preferences"
          className={activeTab === 'preferences' ? 'p-4' : 'hidden'}
        >
          <PreferencesSection
            onSaveSuccess={() => toast.success(t('settings.toast.settingsSaved'))}
            onError={(error) => toast.error(error)}
          />
        </div>

        {/* Blacklist Tab - Story 4.3 */}
        <div
          id="panel-blacklist"
          role="tabpanel"
          aria-labelledby="tab-blacklist"
          className={activeTab === 'blacklist' ? 'p-4' : 'hidden'}
        >
          <BlacklistSection
            onSaveSuccess={() => toast.success(t('settings.toast.blacklistUpdated'))}
            onError={(error) => toast.error(error)}
          />
        </div>

        {/* Tags Tab - Story 4.4 */}
        <div
          id="panel-tags"
          role="tabpanel"
          aria-labelledby="tab-tags"
          className={activeTab === 'tags' ? 'p-4' : 'hidden'}
        >
          <TagManagement />
        </div>
      </main>

      {/* Toast 容器 */}
      <toast.ToastContainer />
    </div>
  );
}

export default SettingsPanel;
