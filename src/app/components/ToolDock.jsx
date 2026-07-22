import React, { useCallback, useRef, useState, useLayoutEffect } from 'react';
import { Button, Tooltip, Card } from '@douyinfe/semi-ui';
import {
  MousePointer2, Hand, PenLine, Eraser, Trash2,
  Type, StickyNote, Image as ImageIcon, Binary, Shapes,
  Square, Circle, Minus, ArrowRight, Grid2X2, Lock,
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
  { shapeId: 'rect', label: '矩形 (R)', svg: Square },
  { shapeId: 'ellipse', label: '椭圆', svg: Circle },
  { shapeId: 'line', label: '直线 (L)', svg: Minus },
  { shapeId: 'arrow', label: '箭头 (A)', svg: ArrowRight },
  { id: 'more-tools', label: '更多工具', svg: Shapes },
];

const SHAPE_OPTIONS = [
  { id: 'coordinate-plane', label: '坐标系', svg: Grid2X2 },
];

const KEEP_TOOL_ACTIVE_LABEL = '绘制后保持所选的工具栏状态 (Q)';

const DOCK_STYLE = {
  position: 'fixed',
  zIndex: 28,
  bottom: 18,
  left: 0,
  right: 0,
  width: 'max-content',
  margin: '0 auto',
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
                  const isShapeActive = ctx.currentTool === 'shape' && ctx.activeShape === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`shape-option-card${isShapeActive ? ' active' : ''}`}
                      onClick={() => handleShapeClick(s.id)}
                    >
                      <span className="shape-option-icon">
                        <ToolIcon svg={s.svg} />
                      </span>
                      <span className="shape-option-label">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}

      <div role="toolbar" aria-label="白板工具" style={DOCK_STYLE}>
        <Tooltip content={KEEP_TOOL_ACTIVE_LABEL} position="top" showArrow={false}>
          <Button
            theme={ctx.keepToolActive ? 'solid' : 'borderless'}
            type={ctx.keepToolActive ? 'primary' : 'tertiary'}
            size="small"
            icon={<ToolIcon svg={Lock} />}
            aria-label={KEEP_TOOL_ACTIVE_LABEL}
            aria-pressed={Boolean(ctx.keepToolActive)}
            style={TOOL_BTN_STYLE}
            onClick={ctx.toggleKeepToolActive}
          />
        </Tooltip>
        <span
          role="separator"
          aria-orientation="vertical"
          style={{ alignSelf: 'center', width: 2, height: 20, margin: '0 2px', flex: '0 0 auto', boxSizing: 'border-box', borderLeft: '1px solid #e2e8f0' }}
        />
        {TOOL_CONFIG.map((tool) => {
          const isActive = tool.shapeId
            ? ctx.currentTool === 'shape' && ctx.activeShape === tool.shapeId
            : tool.id === 'more-tools'
              ? ctx.currentTool === 'shape' && SHAPE_OPTIONS.some(option => option.id === ctx.activeShape)
            : tool.id
            ? ctx.currentTool === tool.id
            : false;

          if (tool.id === 'more-tools') {
            return (
              <span key="more-tools" ref={shapeBtnRef} style={{ display: 'inline-flex' }}>
                <Tooltip content={tool.label} position="top" showArrow={false}>
                  <Button
                    theme={isActive ? 'solid' : 'borderless'}
                    type={isActive ? 'primary' : 'tertiary'}
                    size="small"
                    icon={<ToolIcon svg={tool.svg} />}
                    aria-label={tool.label}
                    style={TOOL_BTN_STYLE}
                    onClick={() => ctx.setShapePopoverVisible?.(v => !v)}
                  />
                </Tooltip>
              </span>
            );
          }

          if (tool.shapeId) {
            return (
              <Tooltip key={tool.shapeId} content={tool.label} position="top" showArrow={false}>
                <Button
                  theme={isActive ? 'solid' : 'borderless'}
                  type={isActive ? 'primary' : 'tertiary'}
                  size="small"
                  icon={<ToolIcon svg={tool.svg} />}
                  aria-label={tool.label}
                  style={TOOL_BTN_STYLE}
                  onClick={() => handleShapeClick(tool.shapeId)}
                />
              </Tooltip>
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
