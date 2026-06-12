import React, { useCallback, useRef, useState, useLayoutEffect } from 'react';
import { Button, Tooltip, Card } from '@douyinfe/semi-ui';
import {
  MousePointer2, Hand, PenLine, Eraser, Trash2,
  Type, StickyNote, Image as ImageIcon, Binary, Shapes,
  Square, Circle, Minus, ArrowRight, Grid2X2,
} from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { icon } from '../../ui/config.js';

const TOOL_CONFIG = [
  { id: 'select', label: '选择 (V)', svg: MousePointer2 },
  { id: 'pan', label: '平移 (H)', svg: Hand },
  { id: 'pen', label: '画笔 (B)', svg: PenLine },
  { id: 'eraser-stroke', label: '片段橡皮 (E)', svg: Eraser },
  { id: 'eraser-object', label: '对象橡皮 (O)', svg: Trash2 },
  { id: 'text', label: '文字 (T)', svg: Type },
  { id: 'sticky', label: '便签 (N)', svg: StickyNote },
  { action: 'import-image', label: '图片', svg: ImageIcon },
  { id: 'structure', label: '结构 (S)', svg: Binary },
  { id: 'shape', label: '图形 (R/L/A)', svg: Shapes },
];

const SHAPE_OPTIONS = [
  { id: 'rect', label: '矩形', shortcut: 'R', svg: Square },
  { id: 'ellipse', label: '椭圆', svg: Circle },
  { id: 'line', label: '直线', shortcut: 'L', svg: Minus },
  { id: 'arrow', label: '箭头', shortcut: 'A', svg: ArrowRight },
  { id: 'coordinate-plane', label: '坐标系', svg: Grid2X2 },
];

const SHAPE_SUB_TOOLS = ['rect', 'ellipse', 'line', 'arrow', 'coordinate-plane'];

const DOCK_STYLE = {
  position: 'fixed',
  zIndex: 28,
  bottom: 18,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 4,
  padding: 6,
  borderRadius: 8,
  border: '1px solid rgba(148,163,184,0.28)',
  background: 'rgba(255,255,255,0.94)',
  boxShadow: '0 18px 50px rgba(15,23,42,0.08)',
  backdropFilter: 'blur(16px)',
  maxWidth: 'calc(100vw - 96px)',
  overflowX: 'auto',
};

const TOOL_BTN_STYLE = {
  width: 40, height: 40, minWidth: 40, padding: 0,
  borderRadius: 7,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

function ToolIcon({ svg }) {
  return <span className="icon-wrapper" dangerouslySetInnerHTML={{ __html: icon(svg) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} />;
}

export default function ToolDock() {
  const ctx = useWhiteboardContext();

  const handleShapeClick = useCallback((shapeId) => {
    ctx.selectShape?.(shapeId);
  }, [ctx]);

  const closeShapePopover = useCallback(() => {
    ctx.setShapePopoverVisible?.(false);
  }, [ctx]);

  const shapeBtnRef = useRef(null);
  const [shapePopoverStyle, setShapePopoverStyle] = useState({});

  useLayoutEffect(() => {
    if (ctx.shapePopoverVisible && shapeBtnRef.current) {
      const rect = shapeBtnRef.current.getBoundingClientRect();
      setShapePopoverStyle({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      });
    }
  }, [ctx.shapePopoverVisible]);

  return (
    <>
      {/* Shape popover: fixed card panel */}
      {ctx.shapePopoverVisible && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={closeShapePopover} />
          <div
            className="structure-panel-react"
            style={{
              position: 'fixed', zIndex: 31,
              ...shapePopoverStyle,
            }}
          >
            <Card
              bordered={false}
              shadows="always"
              style={{ borderRadius: 16, overflow: 'visible' }}
              bodyStyle={{ padding: 6 }}
            >
              <div className="shape-popover-grid">
                {SHAPE_OPTIONS.map(s => {
                  const isShapeActive = ctx.currentTool === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`shape-option-card${isShapeActive ? ' active' : ''}`}
                      onClick={() => handleShapeClick(s.id)}
                    >
                      <span
                        className="shape-option-icon"
                        dangerouslySetInnerHTML={{ __html: icon(s.svg) }}
                      />
                      <span className="shape-option-label">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}

      <div style={DOCK_STYLE}>
        {TOOL_CONFIG.map((tool) => {
          const isActive = tool.id
            ? (ctx.currentTool === tool.id || (tool.id === 'shape' && SHAPE_SUB_TOOLS.includes(ctx.currentTool)))
            : false;

          if (tool.id === 'shape') {
            return (
              <span key="shape" ref={shapeBtnRef} style={{ display: 'inline-flex' }}>
                <Tooltip content={tool.label} position="top" showArrow={false}>
                  <Button
                    theme={isActive ? 'solid' : 'borderless'}
                    type={isActive ? 'primary' : 'tertiary'}
                    size="small"
                    icon={<ToolIcon svg={tool.svg} />}
                    aria-label={tool.label}
                    style={TOOL_BTN_STYLE}
                    onClick={() => {
                      ctx.setTool?.('shape');
                      ctx.setShapePopoverVisible?.(v => !v);
                    }}
                  />
                </Tooltip>
              </span>
            );
          }

          if (tool.id === 'structure') {
            return (
              <Tooltip key="structure" content={tool.label} position="top" showArrow={false}>
                <Button
                  theme={isActive ? 'solid' : 'borderless'}
                  type={isActive ? 'primary' : 'tertiary'}
                  size="small"
                  icon={<ToolIcon svg={tool.svg} />}
                  aria-label={tool.label}
                  style={TOOL_BTN_STYLE}
                  onClick={() => {
                    ctx.setTool?.('structure');
                    ctx.setStructurePanelVisible?.(v => !v);
                  }}
                />
              </Tooltip>
            );
          }

          return (
            <Tooltip key={tool.id || tool.action} content={tool.label} position="top" showArrow={false}>
              <Button
                theme={isActive ? 'solid' : 'borderless'}
                type={isActive ? 'primary' : 'tertiary'}
                size="small"
                icon={<ToolIcon svg={tool.svg} />}
                aria-label={tool.label}
                style={TOOL_BTN_STYLE}
                onClick={() => {
                  if (tool.action) ctx.runAction?.(tool.action);
                  else ctx.setTool?.(tool.id);
                }}
              />
            </Tooltip>
          );
        })}
      </div>
    </>
  );
}
