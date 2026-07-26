import React, { useRef } from 'react';
import {
  Copy, Scissors, Clipboard, Layers, Undo2, Redo2,
  BringToFront, SendToBack, Group, Ungroup, Lock, Trash2,
} from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { icon } from '../../ui/config.js';
import { GLASS, RADIUS, TEXT } from '../../ui/tokens.js';
import { getContextMenuItemsForScope } from '../context-menu/controller.js';

function SvgIcon({ svg }) {
  return <span dangerouslySetInnerHTML={{ __html: icon(svg) }} style={{ display:'flex', alignItems:'center', width:18, height:18 }} />;
}

const ITEMS = [
  { action: 'undo', label: '撤销', svg: Undo2 },
  { action: 'redo', label: '重做', svg: Redo2 },
  { action: 'copy', label: '复制', svg: Copy },
  { action: 'cut', label: '剪切', svg: Scissors },
  { action: 'paste', label: '粘贴', svg: Clipboard },
  { action: 'bring-forward', label: '上移', svg: Layers },
  { action: 'send-backward', label: '下移', svg: Layers },
  { action: 'bring-front', label: '置顶', svg: BringToFront },
  { action: 'send-back', label: '置底', svg: SendToBack },
  { action: 'group', label: '分组', svg: Group },
  { action: 'ungroup', label: '取消分组', svg: Ungroup },
  { action: 'toggle-lock', label: '锁定/解锁', svg: Lock },
  { action: 'delete', label: '删除', svg: Trash2 },
];

const menuListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const menuItemStyle = {
  width: '100%',
  height: 34,
  border: 'none',
  borderRadius: RADIUS.sm,
  padding: '0 10px',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  fontSize: 13,
  textAlign: 'left',
  cursor: 'pointer',
};

export default function ContextMenu() {
  const ctx = useWhiteboardContext();
  const pointerActionRef = useRef(null);
  const disabledActions = ctx.contextMenuDisabledActions || {};
  const items = getContextMenuItemsForScope(ITEMS, ctx.contextMenuScope);
  const preventPointerDefault = (event) => {
    event.preventDefault();
  };
  const runMenuAction = async (action) => {
    await ctx.runContextAction?.(action);
    ctx.hideContextMenu?.();
  };
  const runPointerAction = (event, action, disabled) => {
    event.preventDefault();
    if (disabled) return;
    pointerActionRef.current = action;
    window.setTimeout(() => {
      if (pointerActionRef.current === action) pointerActionRef.current = null;
    }, 0);
    void runMenuAction(action);
  };
  const runClickAction = (action, disabled) => {
    if (disabled) return;
    if (pointerActionRef.current === action) {
      pointerActionRef.current = null;
      return;
    }
    void runMenuAction(action);
  };

  return (
    <div
      data-react-context-menu
      onPointerDownCapture={preventPointerDefault}
      onMouseDownCapture={preventPointerDefault}
      style={{
      position: 'fixed',
      left: ctx.contextMenuPos?.x ?? 0,
      top: ctx.contextMenuPos?.y ?? 0,
      display: ctx.contextMenuVisible ? 'block' : 'none',
      zIndex: 42,
      width: 168,
      overflow: 'hidden',
      ...GLASS,
      borderRadius: RADIUS.md,
      padding: 6,
    }}>
      <ul role="menu" style={menuListStyle}>
        {items.map(item => {
          const disabled = Boolean(disabledActions[item.action]);
          return (
          <li key={item.action} role="none">
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onPointerDown={(event) => runPointerAction(event, item.action, disabled)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runClickAction(item.action, disabled)}
              style={{
                ...menuItemStyle,
                color: disabled ? TEXT.tertiary : TEXT.primary,
                opacity: disabled ? 0.58 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {item.svg ? <SvgIcon svg={item.svg} /> : null}
              <span>{item.label}</span>
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
