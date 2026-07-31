import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { TextArea } from '@douyinfe/semi-ui';

const MIN_TEXTAREA_HEIGHT = 52;

export default function PresetHeightTextArea({
  presetValue = '',
  resetKey = '',
  textareaStyle,
  style,
  onResize,
  onPointerDown,
  ...props
}) {
  const hostRef = useRef(null);
  const manuallyResizedRef = useRef(false);
  const userResizeArmedRef = useRef(false);
  const lastWidthRef = useRef(0);
  const expectedHeightRef = useRef(MIN_TEXTAREA_HEIGHT);
  const [height, setHeight] = useState(MIN_TEXTAREA_HEIGHT);

  useLayoutEffect(() => {
    manuallyResizedRef.current = false;
    lastWidthRef.current = 0;

    const host = hostRef.current;
    const textarea = host?.querySelector('textarea');
    if (!host || !textarea) return undefined;

    const measurePreset = () => {
      if (manuallyResizedRef.current) return;
      const width = Math.round(textarea.getBoundingClientRect().width || textarea.clientWidth || 0);
      if (width <= 0 || width === lastWidthRef.current) return;
      lastWidthRef.current = width;

      const measure = textarea.cloneNode();
      measure.value = presetValue || ' ';
      measure.rows = 1;
      Object.assign(measure.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: `${width}px`,
        height: '0',
        minHeight: '0',
        maxHeight: 'none',
        overflow: 'hidden',
        resize: 'none',
        visibility: 'hidden',
        pointerEvents: 'none',
      });
      document.body.append(measure);
      const presetHeight = Math.max(MIN_TEXTAREA_HEIGHT, Math.ceil(measure.scrollHeight || 0));
      measure.remove();
      expectedHeightRef.current = presetHeight;
      setHeight(presetHeight);
    };

    measurePreset();
    const frame = requestAnimationFrame(measurePreset);
    const observer = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => measurePreset())
      : null;
    observer?.observe(host);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [presetValue, resetKey]);

  const handleResize = useCallback((data) => {
    const nextHeight = Math.ceil(Number(data?.height) || 0);
    if (nextHeight > 0 && userResizeArmedRef.current) {
      manuallyResizedRef.current = true;
      expectedHeightRef.current = nextHeight;
      setHeight(nextHeight);
    }
    onResize?.(data);
  }, [onResize]);

  const handlePointerDown = useCallback((event) => {
    userResizeArmedRef.current = true;
    const disarm = () => { userResizeArmedRef.current = false; };
    window.addEventListener('pointerup', disarm, { once: true });
    window.addEventListener('pointercancel', disarm, { once: true });
    onPointerDown?.(event);
  }, [onPointerDown]);

  return (
    <div ref={hostRef} data-preset-height-textarea style={{ width: '100%' }}>
      <TextArea
        {...props}
        style={style}
        textareaStyle={{ ...textareaStyle, height, overflowY: 'auto' }}
        resize="vertical"
        onResize={handleResize}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
}
