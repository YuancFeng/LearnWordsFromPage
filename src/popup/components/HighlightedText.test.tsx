/**
 * LingoRecall AI - HighlightedText Component Tests
 * Story 4.5 - Task 6: Unit Tests
 *
 * @module popup/components/HighlightedText.test
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HighlightedText, HighlightedTextMultiple } from './HighlightedText';

describe('HighlightedText', () => {
  describe('basic rendering', () => {
    it('renders text without keyword unchanged', () => {
      render(<HighlightedText text="Hello World" keyword="" />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders text with whitespace-only keyword unchanged', () => {
      render(<HighlightedText text="Hello World" keyword="   " />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('keyword highlighting - AC1', () => {
    it('highlights matching keyword', () => {
      const { container } = render(<HighlightedText text="Hello World" keyword="World" />);
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('World');
    });

    it('highlights case-insensitively', () => {
      const { container } = render(<HighlightedText text="Hello World" keyword="world" />);
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('World');
    });

    it('highlights multiple occurrences', () => {
      const { container } = render(<HighlightedText text="the cat sat on the mat" keyword="the" />);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(2);
    });

    it('preserves original case when highlighting', () => {
      const { container } = render(<HighlightedText text="HELLO hello Hello" keyword="hello" />);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(3);
      expect(marks[0]).toHaveTextContent('HELLO');
      expect(marks[1]).toHaveTextContent('hello');
      expect(marks[2]).toHaveTextContent('Hello');
    });

    it('handles keyword at start of text', () => {
      const { container } = render(<HighlightedText text="Hello World" keyword="Hello" />);
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('Hello');
    });

    it('handles keyword at end of text', () => {
      const { container } = render(<HighlightedText text="Hello World" keyword="World" />);
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('World');
    });

    it('handles keyword as entire text', () => {
      const { container } = render(<HighlightedText text="Hello" keyword="Hello" />);
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('Hello');
    });
  });

  describe('special characters', () => {
    it('escapes regex special characters in keyword', () => {
      const { container } = render(<HighlightedText text="Price: $100.00" keyword="$100.00" />);
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('$100.00');
    });

    it('handles parentheses in keyword', () => {
      const { container } = render(<HighlightedText text="Hello (World)" keyword="(World)" />);
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('(World)');
    });

    it('handles brackets in keyword', () => {
      const { container } = render(<HighlightedText text="Array [0]" keyword="[0]" />);
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent('[0]');
    });
  });

  describe('custom highlight class', () => {
    it('applies default highlight class', () => {
      const { container } = render(<HighlightedText text="Hello World" keyword="World" />);
      const mark = container.querySelector('mark');
      expect(mark).toHaveClass('bg-yellow-200', 'rounded', 'px-0.5');
    });

    it('applies custom highlight class', () => {
      const { container } = render(
        <HighlightedText
          text="Hello World"
          keyword="World"
          highlightClassName="bg-blue-200 font-bold"
        />
      );
      const mark = container.querySelector('mark');
      expect(mark).toHaveClass('bg-blue-200', 'font-bold');
    });
  });

  describe('no match scenarios', () => {
    it('renders without marks when no match found', () => {
      const { container } = render(<HighlightedText text="Hello World" keyword="xyz" />);
      const mark = container.querySelector('mark');
      expect(mark).not.toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });
});

describe('HighlightedTextMultiple', () => {
  describe('basic rendering', () => {
    it('renders text without keywords unchanged', () => {
      render(<HighlightedTextMultiple text="Hello World" keywords={[]} />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders text with empty keywords unchanged', () => {
      render(<HighlightedTextMultiple text="Hello World" keywords={['', '  ']} />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('multiple keyword highlighting', () => {
    it('highlights multiple different keywords', () => {
      const { container } = render(
        <HighlightedTextMultiple text="The cat sat on the mat" keywords={['cat', 'mat']} />
      );
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(2);
      expect(marks[0]).toHaveTextContent('cat');
      expect(marks[1]).toHaveTextContent('mat');
    });

    it('highlights case-insensitively', () => {
      const { container } = render(
        <HighlightedTextMultiple text="Hello WORLD world" keywords={['hello', 'world']} />
      );
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(3);
    });
  });

  describe('custom class', () => {
    it('applies custom highlight class', () => {
      const { container } = render(
        <HighlightedTextMultiple
          text="Hello World"
          keywords={['Hello']}
          highlightClassName="bg-green-200"
        />
      );
      const mark = container.querySelector('mark');
      expect(mark).toHaveClass('bg-green-200');
    });
  });
});
