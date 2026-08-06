import React from 'react';
import { Button, Dropdown } from '@douyinfe/semi-ui';
import { IconMinus, IconPlus, IconRedo, IconUndo } from '@douyinfe/semi-icons';
import { useWhiteboardContext } from '../WhiteboardContext';
import { GLASS, RADIUS, TEXT } from '../../ui/tokens.js';

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
      fontSize: 12, color: TEXT.secondary,
      pointerEvents: 'none',
    }}>
      <span>{ctx.statusMessage}</span>
      {/* 缩放是可点控件，给它和工具栏同一层毛玻璃底座，别裸在画布上 */}
      <div style={{
        ...GLASS, borderRadius: RADIUS.md, padding: 2,
        display: 'flex', alignItems: 'center', gap: 0, pointerEvents: 'auto',
      }}>
        <Button theme="borderless" type="tertiary" size="small" icon={<IconUndo />}
          onClick={() => ctx.runAction?.('undo')} disabled={!ctx.canUndo}
          aria-label="撤销" title="撤销"
          style={{ width: 30, height: 30, minWidth: 30, borderRadius: RADIUS.sm }} />
        <Button theme="borderless" type="tertiary" size="small" icon={<IconRedo />}
          onClick={() => ctx.runAction?.('redo')} disabled={!ctx.canRedo}
          aria-label="重做" title="重做"
          style={{ width: 30, height: 30, minWidth: 30, borderRadius: RADIUS.sm }} />
        <Button theme="borderless" type="tertiary" size="small" icon={<IconMinus />}
          onClick={() => ctx.zoomBy?.(-1)} aria-label="缩小"
          style={{ width: 30, height: 30, minWidth: 30, borderRadius: RADIUS.sm }} />
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
            style={{ minWidth: 58, height: 30, fontSize: 12, borderRadius: RADIUS.sm }}>
            {ctx.zoomPercent || 100}%
          </Button>
        </Dropdown>
        <Button theme="borderless" type="tertiary" size="small" icon={<IconPlus />}
          onClick={() => ctx.zoomBy?.(1)} aria-label="放大"
          style={{ width: 30, height: 30, minWidth: 30, borderRadius: RADIUS.sm }} />
      </div>
    </footer>
  );
}
