import React from 'react';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import {
  MousePointer2, Hand, PenLine, Eraser, Trash2,
  Type, StickyNote, Image as ImageIcon, Binary, Shapes,
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

const SHAPE_SUB_TOOLS = ['rect', 'ellipse', 'line', 'arrow', 'coordinate-plane'];

// Shared group for convenience -- the native popover is rendered by the whiteboard core

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

  return (
    <div style={DOCK_STYLE}>
      {TOOL_CONFIG.map((tool) => {
        const isActive = tool.id
          ? (ctx.currentTool === tool.id || (tool.id === 'shape' && SHAPE_SUB_TOOLS.includes(ctx.currentTool)))
          : false;
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
  );
}
