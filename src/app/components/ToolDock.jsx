import React, { useCallback, useRef, useState, useLayoutEffect } from 'react';
import { Button, Tooltip, Card } from '@douyinfe/semi-ui';
import {
  MousePointer2, Hand, PenLine, Eraser, Trash2,
  Type, StickyNote, Image as ImageIcon, Binary, Shapes,
  Square, Circle, Minus, ArrowRight, Grid2X2, Lock,
} from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { icon } from '../../ui/config.js';
import { GLASS, RADIUS, BORDER } from '../../ui/tokens.js';

// group 决定分隔线位置：相邻工具 group 不同时插入一条竖线。
// 顺序不要随意调整，工具位置是肌肉记忆，只按语义分组。
const TOOL_CONFIG = [
  { id: 'select', label: '选择 (V)', svg: MousePointer2, group: 'navigate' },
  { id: 'pan', label: '平移 (H)', svg: Hand, group: 'navigate' },
  { id: 'pen', label: '画笔 (B)', svg: PenLine, group: 'draw' },
  { id: 'eraser-stroke', label: '片段橡皮 (E)', svg: Eraser, group: 'draw' },
  { id: 'eraser-object', label: '对象橡皮 (O)', svg: Trash2, group: 'draw' },
  { id: 'text', label: '文字 (T)', svg: Type, group: 'content' },
  { id: 'sticky', label: '便签 (N)', svg: StickyNote, group: 'content' },
  { action: 'import-image', label: '图片', svg: ImageIcon, group: 'content' },
  { id: 'structure', label: '结构 (S)', svg: Binary, group: 'content' },
  { shapeId: 'rect', label: '矩形 (R)', svg: Square, group: 'shape' },
  { shapeId: 'ellipse', label: '椭圆', svg: Circle, group: 'shape' },
  { shapeId: 'line', label: '直线 (L)', svg: Minus, group: 'shape' },
  { shapeId: 'arrow', label: '箭头 (A)', svg: ArrowRight, group: 'shape' },
  { id: 'more-tools', label: '更多工具', svg: Shapes, group: 'shape' },
];

const SHAPE_OPTIONS = [
  { id: 'coordinate-plane', label: '坐标系', svg: Grid2X2 },
];

const KEEP_TOOL_ACTIVE_LABEL = '绘制后保持所选的工具栏状态 (Q)';

const DOCK_STYLE = {
  ...GLASS,
  position: 'fixed',
  zIndex: 28,
  bottom: 18,
  // AGENTS.md #35：不要用 left:50% + translateX(-50%)，会把图标压到半像素上发虚。
  left: 0,
  right: 0,
  width: 'max-content',
  margin: '0 auto',
  display: 'flex',
  gap: 2,
  padding: 6,
  borderRadius: RADIUS.md,
  maxWidth: 'calc(100vw - 96px)',
  overflowX: 'auto',
};

const TOOL_BTN_STYLE = {
  width: 38, height: 38, minWidth: 38, padding: 0,
  borderRadius: RADIUS.sm,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

// 分隔线放在偶数宽度的盒子里，避免 1px 边框落在半像素（AGENTS.md #35）。
const SEPARATOR_STYLE = {
  alignSelf: 'center', width: 2, height: 20, margin: '0 4px',
  flex: '0 0 auto', boxSizing: 'border-box',
  // 用长写而非 borderLeft 简写：简写里带 var() 时 jsdom 读不出宽度，回归测试会失去意义
  borderLeftWidth: 1, borderLeftStyle: 'solid', borderLeftColor: BORDER,
};

function Separator() {
  return <span role="separator" aria-orientation="vertical" style={SEPARATOR_STYLE} />;
}

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
              style={{ borderRadius: RADIUS.md, overflow: 'visible' }}
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
        <Separator />
        {TOOL_CONFIG.map((tool, index) => {
          const key = tool.id || tool.shapeId || tool.action;
          const groupBreak = index > 0 && TOOL_CONFIG[index - 1].group !== tool.group;
          const isActive = tool.shapeId
            ? ctx.currentTool === 'shape' && ctx.activeShape === tool.shapeId
            : tool.id === 'more-tools'
              ? ctx.currentTool === 'shape' && SHAPE_OPTIONS.some(option => option.id === ctx.activeShape)
            : tool.id
            ? ctx.currentTool === tool.id
            : false;

          const onClick = () => {
            if (tool.shapeId) return handleShapeClick(tool.shapeId);
            if (tool.id === 'more-tools') return ctx.setShapePopoverVisible?.(v => !v);
            if (tool.id === 'structure') {
              if (ctx.structurePanelVisible) {
                ctx.setStructurePanelVisible?.(false);
                return ctx.setTool?.('select');
              }
              ctx.setTool?.('structure');
              return ctx.setStructurePanelVisible?.(true);
            }
            if (tool.action) return ctx.runAction?.(tool.action);
            return ctx.setTool?.(tool.id);
          };

          const button = (
            <Tooltip content={tool.label} position="top" showArrow={false}>
              <Button
                theme={isActive ? 'solid' : 'borderless'}
                type={isActive ? 'primary' : 'tertiary'}
                size="small"
                icon={<ToolIcon svg={tool.svg} />}
                aria-label={tool.label}
                aria-pressed={isActive}
                style={TOOL_BTN_STYLE}
                onClick={onClick}
              />
            </Tooltip>
          );

          return (
            <React.Fragment key={key}>
              {groupBreak ? <Separator /> : null}
              {/* 弹层要按这个按钮定位，所以只有它多一层 ref 包装 */}
              {tool.id === 'more-tools'
                ? <span ref={shapeBtnRef} style={{ display: 'inline-flex' }}>{button}</span>
                : button}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}
