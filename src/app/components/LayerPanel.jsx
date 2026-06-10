import React from 'react';
import { useWhiteboardContext } from '../WhiteboardContext';
import { PanelTop } from 'lucide-static';
import { icon } from '../../ui/config.js';

const TYPE_DOT = {
  stroke: '#2563eb',
  text: '#16a34a',
  sticky: '#f59e0b',
  image: '#8b5cf6',
  rect: '#6366f1',
  ellipse: '#ec4899',
  line: '#64748b',
  arrow: '#dc2626',
  'coordinate-plane': '#0ea5e9',
  'array-structure': '#f97316',
  'stack-structure': '#14b8a6',
  'queue-structure': '#06b6d4',
  'deque-structure': '#06b6d4',
  'graph-structure': '#8b5cf6',
  'tree-structure': '#22c55e',
};

const PANEL_STYLE = {
  position: 'fixed',
  zIndex: 25,
  top: '50%',
  transform: 'translateY(-50%)',
  border: '1px solid rgba(148,163,184,0.16)',
  background: 'rgba(255,255,255,0.94)',
  boxShadow: '0 8px 32px rgba(15,23,42,0.06)',
  backdropFilter: 'blur(20px)',
  transition: 'opacity 180ms cubic-bezier(0.33,0,0.2,1), transform 220ms cubic-bezier(0.33,0,0.2,1)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const dotStyle = (color) => ({
  width: 8, height: 8, minWidth: 8, borderRadius: '50%',
  backgroundColor: color, flex: 'none',
});

const levelBadgeStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 20, height: 18, padding: '0 5px', borderRadius: 5,
  background: 'rgba(148,163,184,0.12)', color: '#64748b',
  fontSize: 10, fontWeight: 600, letterSpacing: '0.03em',
  flex: 'none',
};

const itemBase = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
  borderRadius: 10, cursor: 'pointer', fontSize: 12,
  transition: 'background 120ms cubic-bezier(0.33,0,0.2,1)',
  color: '#334155', minHeight: 36,
};

export default function LayerPanel() {
  const ctx = useWhiteboardContext();
  const collapsed = ctx.layerPanelCollapsed ?? true;
  const layers = ctx.layers || [];
  const selectedIds = ctx.selectedLayerIds || [];

  const panelTransform = collapsed
    ? 'translate(calc(100% + 20px), -50%)'
    : 'translate(0, -50%)';

  return (
    <aside style={{
      ...PANEL_STYLE,
      right: 0,
      width: 232,
      maxHeight: 'calc(100vh - 168px)',
      padding: '16px 10px',
      borderRadius: '20px 0 0 20px',
      borderRight: 0,
      transform: panelTransform,
      opacity: collapsed ? 0 : 1,
      pointerEvents: collapsed ? 'none' : 'auto',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 8px', marginBottom: 10, flex: 'none',
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 7,
          fontWeight: 600, fontSize: 13, color: '#1e293b',
        }}
          dangerouslySetInnerHTML={{ __html: icon(PanelTop) + '图层' }} />
        <button type="button"
          onClick={() => ctx.setLayerPanelCollapsed?.(true)}
          style={{
            width: 28, height: 28, padding: 0, border: 'none', borderRadius: 8,
            cursor: 'pointer', background: 'transparent', color: '#94a3b8',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="收起图层">›</button>
      </div>

      {layers.length === 0
        ? <div style={{
            padding: '32px 8px', color: '#94a3b8', fontSize: 12,
            textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.4, fontSize: 24 }}>⊞</span>
              <span>暂无元素</span>
            </span>
          </div>
        : <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {layers.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const dotColor = TYPE_DOT[item.type] || '#94a3b8';
              return (
                <div key={item.id}
                  role="button"
                  onClick={() => ctx.selectLayerItem?.(item.id)}
                  style={{
                    ...itemBase,
                    background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                    color: isSelected ? '#4338ca' : '#334155',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(148,163,184,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}>
                  <span style={dotStyle(dotColor)} />
                  <span style={{
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 12, lineHeight: 1.3,
                  }}>{item.name}</span>
                  <span style={levelBadgeStyle}>{item.level}</span>
                </div>
              );
            })}
          </div>
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
        boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
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
