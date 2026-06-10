import React from 'react';
import { Dropdown } from '@douyinfe/semi-ui';
import {
  Copy, Scissors, Clipboard, Layers,
  BringToFront, SendToBack, Group, Ungroup, Lock, Trash2,
} from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { icon } from '../../ui/config.js';

function SvgIcon({ svg }) {
  return <span dangerouslySetInnerHTML={{ __html: icon(svg) }} style={{ display:'flex', alignItems:'center', width:18, height:18 }} />;
}

const ITEMS = [
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

export default function ContextMenu() {
  const ctx = useWhiteboardContext();

  return (
    <div style={{
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
      <Dropdown.Menu style={{ padding: 0 }}>
        {ITEMS.map(item => (
          <Dropdown.Item key={item.action}
            icon={item.svg ? <SvgIcon svg={item.svg} /> : undefined}
            onClick={() => { ctx.runContextAction?.(item.action); ctx.hideContextMenu?.(); }}
            style={{ height: 34, borderRadius: 7, padding: '0 10px', fontSize: 13, color: '#334155', gap: 9 }}>
            {item.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </div>
  );
}
