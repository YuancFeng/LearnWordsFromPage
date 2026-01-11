import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearHighlights, highlightRange } from './highlight';

beforeEach(() => {
  document.body.innerHTML = '<p id="text">Hello world</p>';
  Element.prototype.scrollIntoView = vi.fn();
});

describe('highlightRange', () => {
  it('wraps the range in a mark element', () => {
    const textNode = document.getElementById('text')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 6);
    range.setEnd(textNode, 11);

    const result = highlightRange(range);
    expect(result).toBe(true);

    const mark = document.querySelector('mark.lingorecall-highlight');
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe('world');

    clearHighlights();
    expect(document.querySelector('mark.lingorecall-highlight')).toBeNull();
  });

  it('restores DOM structure after clearing multi-node highlight', () => {
    document.body.innerHTML = '<p id="text">Hello <span>world</span>!</p>';
    Element.prototype.scrollIntoView = vi.fn();

    const container = document.getElementById('text')!;
    const initialHTML = container.innerHTML;
    const firstText = container.childNodes[0] as Text;
    const spanText = container.querySelector('span')!.firstChild as Text;

    const range = document.createRange();
    range.setStart(firstText, 3);
    range.setEnd(spanText, 5);

    const result = highlightRange(range);
    expect(result).toBe(true);

    const marks = container.querySelectorAll('mark.lingorecall-highlight');
    expect(marks.length).toBe(2);

    clearHighlights();
    expect(container.innerHTML).toBe(initialHTML);
  });
});
