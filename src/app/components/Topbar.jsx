import React from 'react';
import { Dropdown } from '@douyinfe/semi-ui';
import { IconChevronDown, IconGridStroked } from '@douyinfe/semi-icons';
import {
  FilePlus, FolderOpen, Save, SaveAll, Download, Image,
  Undo2, Redo2, Group, Ungroup, Lock, LocateFixed, Trash2, RotateCcw,
} from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { icon } from '../../ui/config.js';
import { GLASS, RADIUS, TEXT, ACCENT } from '../../ui/tokens.js';

const menuItems = [
  { action: 'new', label: '新建白板', svg: FilePlus },
  { action: 'open', label: '打开', svg: FolderOpen },
  { action: 'save', label: '保存', svg: Save },
  { action: 'save-as', label: '另存为', svg: SaveAll },
  { action: 'export', label: '导出 PNG', svg: Download },
  { action: 'import-image', label: '导入图片', svg: Image },
  { action: 'undo', label: '撤销', svg: Undo2 },
  { action: 'redo', label: '重做', svg: Redo2 },
  { action: 'group', label: '分组', svg: Group },
  { action: 'ungroup', label: '取消分组', svg: Ungroup },
  { action: 'toggle-lock', label: '锁定/解锁', svg: Lock },
  { action: 'fit-content', label: '适配内容', svg: LocateFixed },
  { action: 'clear', label: '清空画布', svg: Trash2 },
  { action: 'reset-view', label: '重置视图', svg: RotateCcw },
];

function SvgIcon({ svg }) {
  return <span dangerouslySetInnerHTML={{ __html: icon(svg) }} style={{ display: 'flex', alignItems: 'center', width: 18, height: 18 }} />;
}

export default function Topbar() {
  const ctx = useWhiteboardContext();
  const [menuVisible, setMenuVisible] = React.useState(false);

  const dropdownMenu = (
    <Dropdown.Menu style={{ width: 268, padding: 8 }}>
      {menuItems.map((item) => (
        <Dropdown.Item key={item.action}
          icon={item.svg ? <SvgIcon svg={item.svg} /> : undefined}
          onClick={() => { ctx.runAction?.(item.action); setMenuVisible(false); }}
          style={{ height: 36, borderRadius: RADIUS.sm, padding: '0 10px', fontSize: 13, color: TEXT.primary }}>
          {item.label}
        </Dropdown.Item>
      ))}
      <Dropdown.Divider style={{ margin: '4px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 10px', color: TEXT.secondary, fontSize: 13 }}>
        <IconGridStroked />
        <span>画布背景</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, marginTop: 4, borderRadius: RADIUS.sm, background: 'var(--semi-color-fill-0)' }}>
        {[{ id: 'plain', label: '纯白' }, { id: 'dots', label: '点阵' }].map((mode) => {
          const active = ctx.backgroundMode === mode.id;
          return (
            <button key={mode.id} type="button"
              onClick={() => { ctx.setBackgroundMode?.(mode.id); setMenuVisible(false); }}
              style={{
                height: 32, borderRadius: RADIUS.xs, border: 'none', cursor: 'pointer', fontSize: 13,
                background: active ? 'var(--semi-color-bg-3)' : 'transparent',
                color: active ? TEXT.primary : TEXT.secondary,
                fontWeight: active ? 600 : 400,
                boxShadow: active ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
              }}>
              {mode.label}
            </button>
          );
        })}
      </div>
    </Dropdown.Menu>
  );

  return (
    <div style={{ position: 'fixed', zIndex: 30, top: 14, left: 16 }}>
      <Dropdown trigger="click" position="bottomLeft" visible={menuVisible} onVisibleChange={setMenuVisible} render={dropdownMenu}>
        <button type="button"
          onClick={() => setMenuVisible(!menuVisible)}
          style={{
            ...GLASS,
            display: 'flex', alignItems: 'center', gap: 10,
            minWidth: 188, maxWidth: 'min(360px, calc(100vw - 112px))', height: 44,
            padding: '0 12px', cursor: 'pointer',
            borderRadius: RADIUS.md,
          }}>
          <span style={{
            width: 24, height: 24, flex: '0 0 auto', borderRadius: RADIUS.xs,
            background: ACCENT, boxShadow: 'inset -6px -6px 0 rgba(255,255,255,0.2)',
          }} />
          <span style={{ flex: '1 1 auto', minWidth: 0, textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: 14, lineHeight: '17px', color: TEXT.primary, fontWeight: 600 }}>lofiBoard</strong>
            <span style={{ fontSize: 12, lineHeight: '16px', color: TEXT.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ctx.fileName || '未命名白板'}
            </span>
          </span>
          <IconChevronDown style={{ flex: '0 0 auto', color: TEXT.tertiary, fontSize: 18, transition: 'transform 140ms ease', transform: menuVisible ? 'rotate(180deg)' : 'none' }} />
        </button>
      </Dropdown>
    </div>
  );
}
