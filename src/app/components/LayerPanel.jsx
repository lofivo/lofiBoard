import React from 'react';
import { Button, List } from '@douyinfe/semi-ui';
import { useWhiteboardContext } from '../WhiteboardContext';
import { PanelTop } from 'lucide-static';
import { icon } from '../../ui/config.js';

const PANEL_STYLE = {
  position: 'fixed',
  zIndex: 25,
  top: '50%',
  transform: 'translateY(-50%)',
  border: '1px solid var(--fluent-stroke)',
  background: 'rgba(255,255,255,0.96)',
  boxShadow: '0 18px 46px rgba(15,23,42,0.1)',
  backdropFilter: 'blur(24px)',
  transition: 'opacity 180ms cubic-bezier(0.33,0,0.2,1), transform 220ms cubic-bezier(0.33,0,0.2,1)',
  overflow: 'hidden',
};

export default function LayerPanel() {
  const ctx = useWhiteboardContext();
  const collapsed = ctx.layerPanelCollapsed ?? true;
  const layers = ctx.layers || [];

  const panelTransform = collapsed
    ? 'translate(calc(100% + 20px), -50%)'
    : 'translate(0, -50%)';

  return (
    <aside style={{
      ...PANEL_STYLE,
      right: 0,
      width: 236,
      maxHeight: 'calc(100vh - 168px)',
      padding: 18,
      borderRadius: '24px 0 0 24px',
      borderRight: 0,
      transform: panelTransform,
      opacity: collapsed ? 0 : 1,
      pointerEvents: collapsed ? 'none' : 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, color: 'var(--semi-color-text-0)' }}
          dangerouslySetInnerHTML={{ __html: icon(PanelTop) + '图层' }} />
        <Button theme="borderless" type="tertiary" size="small"
          onClick={() => ctx.setLayerPanelCollapsed?.(true)}
          style={{ fontSize: 22, width: 32, height: 32, minWidth: 32, padding: 0, color: 'var(--semi-color-text-2)' }}>
          ›
        </Button>
      </div>
      {layers.length === 0
        ? <div style={{ padding: 8, color: 'var(--semi-color-text-2)', fontSize: 12 }}>暂无元素</div>
        : <List dataSource={layers} renderItem={item => (
            <List.Item style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
              onClick={() => ctx.selectLayerItem?.(item.id)}>
              {item.name || item.id}
            </List.Item>
          )} />
      }
    </aside>
  );
}

export function LayerPanelToggle({ collapsed, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'fixed', zIndex: 25, top: '50%', right: 0,
        transform: 'translateY(-50%)',
        width: 32, height: 56, padding: 0,
        border: '1px solid rgba(148,163,184,0.28)', borderRight: 0,
        borderRadius: '8px 0 0 8px',
        background: 'rgba(255,255,255,0.94)',
        boxShadow: '0 18px 50px rgba(15,23,42,0.08)',
        backdropFilter: 'blur(16px)',
        cursor: 'pointer',
        fontSize: 22, lineHeight: '56px', color: '#64748b',
        display: collapsed ? 'block' : 'none',
        opacity: collapsed ? 1 : 0,
        transition: 'opacity 180ms cubic-bezier(0.33,0,0.2,1)',
      }}
      aria-label="展开图层"
      title="展开图层"
    >
      <span aria-hidden="true">‹</span>
    </button>
  );
}
