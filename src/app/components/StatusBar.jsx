import React from 'react';
import { Button, Dropdown } from '@douyinfe/semi-ui';
import { IconMinus, IconPlus } from '@douyinfe/semi-icons';
import { useWhiteboardContext } from '../WhiteboardContext';

const ZOOM_LEVELS = [
  { value: 4, label: '400%' },
  { value: 2, label: '200%' },
  { value: 1, label: '100%' },
  { value: 0.66, label: '66%' },
  { value: 0.33, label: '33%' },
];

export default function StatusBar() {
  const ctx = useWhiteboardContext();
  const [zoomMenuVisible, setZoomMenuVisible] = React.useState(false);

  return (
    <footer style={{
      position: 'fixed', bottom: 12, left: 0, right: 0, zIndex: 27,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '2px 16px', height: 36,
      fontSize: 12, color: 'var(--semi-color-text-2)',
      pointerEvents: 'none',
    }}>
      <span>{ctx.statusMessage || '就绪'}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, pointerEvents: 'auto' }}>
        <Button theme="borderless" type="tertiary" size="small" icon={<IconMinus />}
          onClick={() => ctx.zoomBy?.(-1)} aria-label="缩小"
          style={{ width: 30, height: 30, minWidth: 30, borderRadius: 4 }} />
        <Dropdown
          trigger="click" position="top" visible={zoomMenuVisible} onVisibleChange={setZoomMenuVisible}
          render={
            <Dropdown.Menu>
              {ZOOM_LEVELS.map((level) => (
                <Dropdown.Item key={level.value} active={ctx.currentZoom === level.value}
                  onClick={() => { ctx.setZoomAtCenter?.(level.value); setZoomMenuVisible(false); }}>
                  {level.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          }>
          <Button theme="borderless" type="tertiary" size="small"
            aria-haspopup="true" aria-expanded={zoomMenuVisible}
            style={{ minWidth: 58, height: 30, fontSize: 12, borderRadius: 4 }}>
            {ctx.zoomPercent || 100}%
          </Button>
        </Dropdown>
        <Button theme="borderless" type="tertiary" size="small" icon={<IconPlus />}
          onClick={() => ctx.zoomBy?.(1)} aria-label="放大"
          style={{ width: 30, height: 30, minWidth: 30, borderRadius: 4 }} />
      </div>
    </footer>
  );
}
