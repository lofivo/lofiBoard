import React, { useRef } from 'react';
import {
  Copy, Scissors, Clipboard, Layers, Undo2, Redo2, TextSelect,
  BringToFront, SendToBack, Group, Ungroup, Lock, Trash2,
} from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { icon } from '../../ui/config.js';

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

const INPUT_ITEMS = [
  { action: 'select-all', label: '全选', svg: TextSelect },
  { action: 'copy', label: '复制', svg: Copy },
  { action: 'cut', label: '剪切', svg: Scissors },
  { action: 'paste', label: '粘贴', svg: Clipboard },
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
  borderRadius: 7,
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
  const isInputMenu = ctx.contextMenuMode === 'input';
  const items = isInputMenu ? INPUT_ITEMS : ITEMS;
  const disabledActions = isInputMenu
    ? (ctx.inputContextMenuDisabledActions || {})
    : (ctx.contextMenuDisabledActions || {});
  const preventPointerDefault = (event) => {
    event.preventDefault();
  };
  const runMenuAction = async (action) => {
    if (isInputMenu) {
      await ctx.runInputContextAction?.(action);
    } else {
      await ctx.runContextAction?.(action);
    }
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
      borderRadius: 8,
      padding: 6,
      background: 'rgba(255,255,255,0.98)',
      boxShadow: '0 18px 50px rgba(15,23,42,0.12)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(148,163,184,0.28)',
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
                color: disabled ? '#94a3b8' : '#334155',
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
