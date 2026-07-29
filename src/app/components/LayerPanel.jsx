import React from 'react';
import { useWhiteboardContext } from '../WhiteboardContext';
import { Layers, ChevronRight, ChevronLeft, SquareDashed } from 'lucide-static';
import { icon } from '../../ui/config.js';
import { GLASS, GLASS_EDGE, RADIUS, TEXT, ACCENT, ACCENT_SOFT, PANEL_MOTION } from '../../ui/tokens.js';

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
  'matrix-structure': '#e11d48',
  'stack-structure': '#14b8a6',
  'queue-structure': '#06b6d4',
  'deque-structure': '#06b6d4',
  'graph-structure': '#8b5cf6',
  'tree-structure': '#22c55e',
};

const PANEL_STYLE = {
  ...GLASS,
  position: 'fixed',
  zIndex: 25,
  top: '50%',
  transform: 'translateY(-50%)',
  transition: PANEL_MOTION,
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
  minWidth: 20, height: 18, padding: '0 5px', borderRadius: RADIUS.xs,
  background: 'var(--semi-color-fill-0)', color: TEXT.secondary,
  fontSize: 10, fontWeight: 600, letterSpacing: '0.03em',
  flex: 'none',
};

const stateBadgeStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 18, height: 18, borderRadius: RADIUS.xs,
  background: 'var(--semi-color-fill-0)', color: TEXT.secondary,
  fontSize: 10, fontWeight: 700,
  flex: 'none',
};

const itemBase = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
  borderRadius: RADIUS.sm, cursor: 'pointer', fontSize: 12,
  transition: 'background 120ms cubic-bezier(0.33,0,0.2,1)',
  color: TEXT.primary, minHeight: 36,
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
      borderRadius: `${RADIUS.lg}px 0 0 ${RADIUS.lg}px`,
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
          fontWeight: 600, fontSize: 13, color: TEXT.primary,
        }}
          dangerouslySetInnerHTML={{ __html: icon(Layers) + '图层' }} />
        <button type="button"
          onClick={() => ctx.setLayerPanelCollapsed?.(true)}
          style={{
            width: 28, height: 28, padding: 0, border: 'none', borderRadius: RADIUS.sm,
            cursor: 'pointer', background: 'transparent', color: TEXT.tertiary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="收起图层"
          dangerouslySetInnerHTML={{ __html: icon(ChevronRight) }} />
      </div>

      {layers.length === 0
        ? <div style={{
            padding: '32px 8px', color: TEXT.tertiary, fontSize: 12,
            textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ opacity: 0.45 }} dangerouslySetInnerHTML={{ __html: icon(SquareDashed) }} />
              <span>暂无元素，先在画布上画点什么</span>
            </span>
          </div>
        : <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {layers.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const dotColor = TYPE_DOT[item.type] || 'var(--semi-color-text-3)';
              const stateLabel = [
                item.locked ? '锁定' : null,
                item.groupId ? '分组' : null,
              ].filter(Boolean).join('，');
              return (
                <div key={item.id}
                  role="button"
                  data-layer-id={item.id}
                  aria-label={`${item.name}${stateLabel ? `，${stateLabel}` : ''}`}
                  onClick={() => ctx.selectLayerItem?.(item.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    ctx.openLayerItemContextMenu?.(item.id, {
                      clientX: event.clientX,
                      clientY: event.clientY,
                    });
                  }}
                  style={{
                    ...itemBase,
                    background: isSelected ? ACCENT_SOFT : 'transparent',
                    color: isSelected ? ACCENT : TEXT.primary,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--semi-color-fill-0)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}>
                  <span style={dotStyle(dotColor)} />
                  <span style={{
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 12, lineHeight: 1.3,
                  }}>{item.name}</span>
                  {item.locked ? <span style={stateBadgeStyle} title="锁定">锁</span> : null}
                  {item.groupId ? <span style={stateBadgeStyle} title="分组">组</span> : null}
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
        ...GLASS_EDGE,
        position: 'fixed', zIndex: 25, top: '50%', right: 0,
        transform: 'translateY(-50%)',
        width: 32, height: 56, padding: 0,
        borderRight: 0,
        borderRadius: `${RADIUS.sm}px 0 0 ${RADIUS.sm}px`,
        cursor: 'pointer',
        color: TEXT.secondary,
        display: collapsed ? 'flex' : 'none',
        alignItems: 'center', justifyContent: 'center',
        opacity: collapsed ? 1 : 0,
        transition: 'opacity 180ms cubic-bezier(0.33, 0, 0.2, 1)',
      }}
      aria-label="展开图层"
      title="展开图层"
      dangerouslySetInnerHTML={{ __html: icon(ChevronLeft) }}
    />
  );
}
