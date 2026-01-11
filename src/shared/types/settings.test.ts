/**
 * LingoRecall AI - Settings Types Tests
 * Story 4.2 - Task 1: Settings 接口和默认值测试
 *
 * @module shared/types/settings.test
 */

import { describe, it, expect } from 'vitest';
import {
  type Settings,
  type ThemeType,
  DEFAULT_SETTINGS,
  THEME_OPTIONS,
} from './settings';

describe('Settings Types', () => {
  describe('Settings interface', () => {
    it('should have all required fields with correct types', () => {
      // 创建一个符合 Settings 接口的对象
      const settings: Settings = {
        enableDoubleClick: true,
        enableHoverIcon: true,
        reviewReminder: true,
        theme: 'system',
        blacklistUrls: [],
      };

      expect(settings.enableDoubleClick).toBe(true);
      expect(settings.enableHoverIcon).toBe(true);
      expect(settings.reviewReminder).toBe(true);
      expect(settings.theme).toBe('system');
      expect(settings.blacklistUrls).toEqual([]);
    });

    it('should accept light theme', () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        theme: 'light',
      };
      expect(settings.theme).toBe('light');
    });

    it('should accept dark theme', () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        theme: 'dark',
      };
      expect(settings.theme).toBe('dark');
    });

    it('should accept system theme', () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        theme: 'system',
      };
      expect(settings.theme).toBe('system');
    });

    it('should accept blacklist URLs array', () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        blacklistUrls: ['*.paypal.com', '*.alipay.com', '*bank*'],
      };
      expect(settings.blacklistUrls).toHaveLength(3);
      expect(settings.blacklistUrls).toContain('*.paypal.com');
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have enableDoubleClick set to true', () => {
      expect(DEFAULT_SETTINGS.enableDoubleClick).toBe(true);
    });

    it('should have enableHoverIcon set to true', () => {
      expect(DEFAULT_SETTINGS.enableHoverIcon).toBe(true);
    });

    it('should have reviewReminder set to true', () => {
      expect(DEFAULT_SETTINGS.reviewReminder).toBe(true);
    });

    it('should have theme set to system', () => {
      expect(DEFAULT_SETTINGS.theme).toBe('system');
    });

    it('should have default blacklist URLs for payment sites', () => {
      expect(DEFAULT_SETTINGS.blacklistUrls).toContain('*.paypal.com');
      expect(DEFAULT_SETTINGS.blacklistUrls).toContain('*.alipay.com');
      expect(DEFAULT_SETTINGS.blacklistUrls).toContain('*bank*');
    });

    it('should have all required properties', () => {
      expect(DEFAULT_SETTINGS).toHaveProperty('enableDoubleClick');
      expect(DEFAULT_SETTINGS).toHaveProperty('enableHoverIcon');
      expect(DEFAULT_SETTINGS).toHaveProperty('reviewReminder');
      expect(DEFAULT_SETTINGS).toHaveProperty('theme');
      expect(DEFAULT_SETTINGS).toHaveProperty('blacklistUrls');
    });

    it('should be immutable (frozen)', () => {
      // DEFAULT_SETTINGS 应该被 Object.freeze 冻结
      expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true);
    });
  });

  describe('THEME_OPTIONS', () => {
    it('should contain light option', () => {
      const lightOption = THEME_OPTIONS.find((opt) => opt.value === 'light');
      expect(lightOption).toBeDefined();
      expect(lightOption?.label).toBeTruthy();
    });

    it('should contain dark option', () => {
      const darkOption = THEME_OPTIONS.find((opt) => opt.value === 'dark');
      expect(darkOption).toBeDefined();
      expect(darkOption?.label).toBeTruthy();
    });

    it('should contain system option', () => {
      const systemOption = THEME_OPTIONS.find((opt) => opt.value === 'system');
      expect(systemOption).toBeDefined();
      expect(systemOption?.label).toBeTruthy();
    });

    it('should have exactly 3 options', () => {
      expect(THEME_OPTIONS).toHaveLength(3);
    });
  });

  describe('ThemeType', () => {
    it('should be union of light, dark, system', () => {
      // TypeScript 类型检查 - 这些赋值应该都有效
      const light: ThemeType = 'light';
      const dark: ThemeType = 'dark';
      const system: ThemeType = 'system';

      expect(light).toBe('light');
      expect(dark).toBe('dark');
      expect(system).toBe('system');
    });
  });
});

describe('Settings Type Utilities', () => {
  it('should allow partial settings updates', () => {
    // Partial<Settings> 应该允许只更新部分字段
    const partialUpdate: Partial<Settings> = {
      enableDoubleClick: false,
    };

    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...partialUpdate,
    };

    expect(merged.enableDoubleClick).toBe(false);
    expect(merged.enableHoverIcon).toBe(true); // 保持默认值
  });

  it('should allow spreading DEFAULT_SETTINGS into new object', () => {
    const newSettings: Settings = {
      ...DEFAULT_SETTINGS,
      theme: 'dark',
    };

    expect(newSettings.theme).toBe('dark');
    expect(newSettings.enableDoubleClick).toBe(DEFAULT_SETTINGS.enableDoubleClick);
  });
});
