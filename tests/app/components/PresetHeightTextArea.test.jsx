// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@douyinfe/semi-ui', async () => {
  const ReactModule = await import('react');
  return {
    TextArea: ({ textareaStyle, resize, onResize, onChange, onPointerDown, ...props }) => ReactModule.createElement('textarea', {
      ...props,
      style: { ...textareaStyle, resize },
      onInput: (event) => onChange?.(event.currentTarget.value),
      onDoubleClick: (event) => {
        onPointerDown?.(event);
        onResize?.({ height: 140 });
      },
      'data-resize': resize,
    }),
  };
});

import PresetHeightTextArea from '../../../src/app/components/PresetHeightTextArea.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots = [];

afterEach(() => {
  for (const root of mountedRoots.splice(0)) act(() => root.unmount());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('PresetHeightTextArea', () => {
  it('measures the preset rather than custom content and resets only when the structure changes', () => {
    vi.spyOn(HTMLTextAreaElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 180 });
    vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(function getScrollHeight() {
      return this.value.split('\n').length * 24;
    });

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    mountedRoots.push(root);

    const render = ({ value, presetValue, resetKey }) => act(() => {
      root.render(
        <PresetHeightTextArea
          value={value}
          presetValue={presetValue}
          resetKey={resetKey}
          onChange={() => {}}
        />,
      );
    });

    render({ value: '自定义内容\n很多\n很多\n很多', presetValue: '1\n2\n3', resetKey: 'matrix' });
    const textarea = host.querySelector('textarea');
    expect(textarea.style.height).toBe('72px');
    expect(textarea.style.overflowY).toBe('auto');
    expect(textarea.style.resize).toBe('vertical');

    act(() => textarea.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    expect(textarea.style.height).toBe('140px');
    render({ value: '更多自定义内容\n1\n2\n3\n4', presetValue: '1\n2\n3', resetKey: 'matrix' });
    expect(textarea.style.height).toBe('140px');

    render({ value: '自定义内容', presetValue: '1\n2', resetKey: 'tree' });
    expect(textarea.style.height).toBe('52px');
  });
});
