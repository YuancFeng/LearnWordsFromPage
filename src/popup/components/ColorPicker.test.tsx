/**
 * LingoRecall AI - ColorPicker Component Tests
 * Story 4.4 - Task 8: 颜色选择器组件测试
 *
 * 测试预设颜色选择和自定义 HEX 输入功能
 *
 * @module popup/components/ColorPicker.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from './ColorPicker';
import { PRESET_COLORS, DEFAULT_TAG_COLOR } from '../../shared/types/tag';

// ============================================================
// Test Setup
// ============================================================

describe('ColorPicker', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  // ============================================================
  // Rendering Tests
  // ============================================================

  describe('渲染', () => {
    it('应该渲染颜色标签', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      expect(screen.getByText('颜色')).toBeInTheDocument();
    });

    it('应该渲染所有预设颜色（12个）', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      PRESET_COLORS.forEach((color) => {
        expect(screen.getByTestId(`color-preset-${color}`)).toBeInTheDocument();
      });
    });

    it('应该渲染自定义颜色按钮', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      expect(screen.getByTestId('color-custom-button')).toBeInTheDocument();
    });

    it('应该渲染当前选中颜色预览', () => {
      render(<ColorPicker value="#EF4444" onChange={mockOnChange} />);

      const preview = screen.getByTestId('color-preview');
      expect(preview).toHaveStyle({ backgroundColor: '#EF4444' });
      expect(screen.getByText('#EF4444')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Preset Color Selection Tests - AC4
  // ============================================================

  describe('预设颜色选择 - AC4', () => {
    it('应该在点击预设颜色时调用 onChange', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      const redButton = screen.getByTestId('color-preset-#EF4444');
      fireEvent.click(redButton);

      expect(mockOnChange).toHaveBeenCalledWith('#EF4444');
    });

    it('应该在选中的颜色上显示复选标记', () => {
      render(<ColorPicker value="#EF4444" onChange={mockOnChange} />);

      const redButton = screen.getByTestId('color-preset-#EF4444');
      expect(redButton).toHaveClass('ring-2');
    });

    it('应该在禁用状态下不响应点击', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} disabled />);

      const redButton = screen.getByTestId('color-preset-#EF4444');
      fireEvent.click(redButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Custom HEX Input Tests - AC4
  // ============================================================

  describe('自定义 HEX 输入 - AC4', () => {
    it('应该在点击自定义按钮时显示输入框', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      const customButton = screen.getByTestId('color-custom-button');
      fireEvent.click(customButton);

      expect(screen.getByTestId('color-custom-input')).toBeInTheDocument();
      expect(screen.getByTestId('color-custom-apply')).toBeInTheDocument();
    });

    it('应该实时验证并应用有效的 HEX 颜色', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      // 打开自定义输入
      fireEvent.click(screen.getByTestId('color-custom-button'));

      const input = screen.getByTestId('color-custom-input');
      fireEvent.change(input, { target: { value: '#FF5733' } });

      // 应该在输入有效颜色时调用 onChange
      expect(mockOnChange).toHaveBeenCalledWith('#FF5733');
    });

    it('应该自动添加 # 前缀', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('color-custom-button'));

      const input = screen.getByTestId('color-custom-input');
      fireEvent.change(input, { target: { value: 'FF5733' } });

      expect(mockOnChange).toHaveBeenCalledWith('#FF5733');
    });

    it('应该在点击应用按钮时验证颜色', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('color-custom-button'));

      const input = screen.getByTestId('color-custom-input');
      fireEvent.change(input, { target: { value: '#ABC123' } });

      const applyButton = screen.getByTestId('color-custom-apply');
      fireEvent.click(applyButton);

      // 输入框应该关闭
      expect(screen.queryByTestId('color-custom-input')).not.toBeInTheDocument();
    });

    it('应该对无效颜色显示错误', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('color-custom-button'));

      const input = screen.getByTestId('color-custom-input');
      fireEvent.change(input, { target: { value: 'invalid' } });

      const applyButton = screen.getByTestId('color-custom-apply');
      fireEvent.click(applyButton);

      expect(screen.getByTestId('color-custom-error')).toBeInTheDocument();
    });

    it('应该在按 ESC 键时关闭自定义输入', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('color-custom-button'));
      expect(screen.getByTestId('color-custom-input')).toBeInTheDocument();

      const input = screen.getByTestId('color-custom-input');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByTestId('color-custom-input')).not.toBeInTheDocument();
    });

    it('应该在按 Enter 键时提交', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('color-custom-button'));

      const input = screen.getByTestId('color-custom-input');
      fireEvent.change(input, { target: { value: '#ABCDEF' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 应该关闭输入框（成功提交）
      expect(screen.queryByTestId('color-custom-input')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Disabled State Tests
  // ============================================================

  describe('禁用状态', () => {
    it('应该在禁用状态下应用禁用样式', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} disabled />);

      const presetButton = screen.getByTestId(`color-preset-${PRESET_COLORS[0]}`);
      expect(presetButton).toBeDisabled();
      expect(presetButton).toHaveClass('opacity-50');
    });

    it('应该在禁用状态下禁用自定义按钮', () => {
      render(<ColorPicker value={DEFAULT_TAG_COLOR} onChange={mockOnChange} disabled />);

      const customButton = screen.getByTestId('color-custom-button');
      expect(customButton).toBeDisabled();
    });
  });

  // ============================================================
  // Color Preview Tests
  // ============================================================

  describe('颜色预览', () => {
    it('应该正确显示当前选中的预设颜色', () => {
      render(<ColorPicker value="#22C55E" onChange={mockOnChange} />);

      const preview = screen.getByTestId('color-preview');
      expect(preview).toHaveStyle({ backgroundColor: '#22C55E' });
      expect(screen.getByText('#22C55E')).toBeInTheDocument();
    });

    it('应该正确显示自定义颜色', () => {
      render(<ColorPicker value="#AABBCC" onChange={mockOnChange} />);

      const preview = screen.getByTestId('color-preview');
      expect(preview).toHaveStyle({ backgroundColor: '#AABBCC' });
      expect(screen.getByText('#AABBCC')).toBeInTheDocument();
    });
  });
});
