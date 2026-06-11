import React from 'react';
import { Select } from '@douyinfe/semi-ui';
import { Bold, Italic, Underline, Strikethrough, PanelTop } from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { icon } from '../../ui/config.js';

const ICON_BOLD = icon(Bold);
const ICON_ITALIC = icon(Italic);
const ICON_UNDERLINE = icon(Underline);
const ICON_STRIKE = icon(Strikethrough);
const ICON_PANEL = icon(PanelTop);

const COLORS = ['#111827', '#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed'];
const FILLS  = ['#ffffff', '#dbeafe', '#fee2e2', '#dcfce7', '#fef3c7', '#ede9fe'];
const BGS    = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#ddd6fe', '#fed7aa'];

const FONTS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: "'Noto Sans SC', 'Microsoft YaHei', sans-serif", label: '中文黑体' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Times New Roman', Times, serif", label: 'Times' },
  { value: "'Courier New', Courier, monospace", label: 'Courier' },
];

/* ---- tiny helpers ---- */

const labelStyle = { color: 'var(--semi-color-text-2)', fontSize: 12, fontWeight: 600, lineHeight: 1.1 };
const fieldGap = { display: 'flex', flexDirection: 'column', gap: 6 };

function ColorField({ label, colors, value, set }) {
  return (
    <div style={fieldGap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...labelStyle }}>
        <span>{label}</span>
      </div>
      <div role="group" style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {colors.map(c => (
          <button key={c} onClick={() => set?.(c)} title={c}
            className="color-preset-btn" style={{ width: 24, height: 24, padding: 0, cursor: 'pointer', border: 'none', borderRadius: 6,
              backgroundColor: c, boxShadow: value === c ? `0 0 0 2px var(--semi-color-primary)` : `inset 0 0 0 1px rgba(0,0,0,0.15)` }} />
        ))}
        <div style={{ width: 1, height: 20, backgroundColor: 'var(--semi-color-border)', margin: '0 3px', flex: 'none' }} />
        <span className="color-custom-picker" style={{ display: 'flex', width: 26, height: 26, border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6, overflow: 'hidden' }}>
          <input type="color" value={value || '#111827'} onChange={e => set?.(e.target.value)}
            style={{ width: '100%', height: '100%', padding: 0, border: 'none', borderRadius: 0, cursor: 'pointer', background: 'transparent' }} />
        </span>
      </div>
    </div>
  );
}

function RangeCtl({ label, min, max, step, value, onChange }) {
  return (
    <div style={fieldGap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...labelStyle }}>{label}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--semi-color-primary)', cursor: 'pointer', margin: 0 }} />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 8 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ margin: 0, accentColor: 'var(--semi-color-primary)' }} />
      <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12 }}>{label}</span>
    </label>
  );
}

function CapStyle({ cap, onCap, style, onStyle }) {
  const capColor = 'var(--semi-color-text-0)';
  const activeBg = 'var(--semi-color-primary-light-default)';
  const idleBg = 'var(--semi-color-fill-0)';
  const activeBorder = '2px solid var(--semi-color-primary)';
  const idleBorder = '1px solid var(--semi-color-border)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div style={fieldGap}>
        <div style={labelStyle}>笔头</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onCap('round')} title="圆头"
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', height:32, padding:0, cursor:'pointer',
              border: cap==='round' ? activeBorder : idleBorder,
              borderRadius:8, background: cap==='round' ? activeBg : idleBg }}>
            <svg width="28" height="12" viewBox="0 0 28 12" style={{ display: 'block' }}>
              <rect x="4" y="2" width="20" height="8" rx="4" fill={capColor} />
            </svg>
          </button>
          <button onClick={() => onCap('square')} title="平头"
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', height:32, padding:0, cursor:'pointer',
              border: cap==='square' ? activeBorder : idleBorder,
              borderRadius:8, background: cap==='square' ? activeBg : idleBg }}>
            <svg width="28" height="12" viewBox="0 0 28 12" style={{ display: 'block' }}>
              <rect x="4" y="1" width="20" height="10" rx="1" fill={capColor} />
            </svg>
          </button>
        </div>
      </div>
      <div style={fieldGap}>
        <div style={labelStyle}>线型</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{v:'solid',t:'solid'},{v:'dash',t:'dashed'},{v:'dot',t:'dotted'}].map(({v,t}) => (
            <button key={v} onClick={()=>onStyle(v)}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', height:28, padding:0, cursor:'pointer',
                border: style===v ? '2px solid var(--semi-color-primary)' : '1px solid var(--semi-color-border)',
                borderRadius:8, background: style===v ? 'var(--semi-color-primary-light-default)' : 'var(--semi-color-fill-0)' }}>
              <span style={{ width:18, height:0, borderTop:`2px ${t} currentColor`, color:'var(--semi-color-text-0)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Preview({ color, width, cap }) {
  return (
    <div style={{ borderRadius: 10, background: 'var(--semi-color-fill-0)', padding: 6, overflow: 'hidden' }}>
      <svg viewBox="0 0 280 48" style={{ width: '100%', height: 40, display: 'block' }}>
        <path d="M 14,24 C 72,10 132,38 266,24" fill="none" stroke={color||'#111827'} strokeWidth={width||6} strokeLinecap={cap||'round'} />
      </svg>
    </div>
  );
}

function FormatBtns({ bold, italic, underline, strike, onToggle }) {
  const btns = [
    { k:'bold', t:'加粗', h:ICON_BOLD, v:bold },
    { k:'italic', t:'斜体', h:ICON_ITALIC, v:italic },
    { k:'underline', t:'下划线', h:ICON_UNDERLINE, v:underline },
    { k:'strike', t:'删除线', h:ICON_STRIKE, v:strike },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, padding: 4,
      border: '1px solid var(--semi-color-border)', borderRadius: 12, background: 'var(--semi-color-fill-0)' }}>
      {btns.map(b => (
        <button key={b.k} title={b.t} onClick={() => onToggle(b.k)}
          style={{ display:'grid', placeItems:'center', height:28, border:'none', borderRadius:8, cursor:'pointer',
            background: b.v ? 'var(--semi-color-primary-light-default)' : 'transparent',
            color: b.v ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)' }}
          dangerouslySetInnerHTML={{ __html: b.h }} />
      ))}
    </div>
  );
}

/* ---- inspectors ---- */

function BrushCore({ ctx, showFill, showArrow, showCapStyle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Preview color={ctx.brushColor} width={ctx.brushWidth} cap={ctx.brushCap} />
      <ColorField label={showFill ? '边框颜色' : '颜色'} colors={COLORS} value={ctx.brushColor} set={ctx.setBrushColor} />
      {showFill && <ColorField label="填充颜色" colors={FILLS} value={ctx.fillColor} set={ctx.setFillColor} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
        <RangeCtl label="粗细" min={1} max={28} step={1} value={ctx.brushWidth||6} onChange={v => ctx.setBrushWidth?.(v)} />
        {showFill && <Toggle label="透明填充" checked={ctx.fillTransparent??true} onChange={v => ctx.setFillTransparent?.(v)} />}
        {showArrow && <Toggle label="双箭头" checked={ctx.arrowDoubleEnded??false} onChange={v => ctx.setArrowDoubleEnded?.(v)} />}
      </div>
      {showCapStyle && <CapStyle cap={ctx.brushCap||'round'} onCap={v=>ctx.setBrushCap?.(v)} style={ctx.brushStyle||'solid'} onStyle={v=>ctx.setBrushStyle?.(v)} />}
      {showCapStyle && <RangeCtl label="不透明度" min={10} max={100} step={1} value={ctx.brushOpacity||100} onChange={v => ctx.setBrushOpacity?.(v)} />}
    </div>
  );
}

function TextCore({ ctx }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ColorField label="颜色" colors={COLORS} value={ctx.textColor} set={ctx.setTextColor} />
      <div style={fieldGap}>
        <div style={labelStyle}>字体</div>
        <Select value={ctx.fontFamily || FONTS[0].value} onChange={v => ctx.setFontFamily?.(v)} optionList={FONTS} style={{ width: '100%' }} size="small" />
      </div>
      <div style={fieldGap}>
        <div style={labelStyle}>样式</div>
        <FormatBtns bold={ctx.textBold} italic={ctx.textItalic} underline={ctx.textUnderline} strike={ctx.textStrike} onToggle={ctx.setTextStyle} />
      </div>
      <RangeCtl label="字号" min={12} max={96} step={1} value={ctx.fontSize||28} onChange={v => ctx.setFontSize?.(v)} />
    </div>
  );
}

function StickyCore({ ctx }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ColorField label="背景颜色" colors={BGS} value={ctx.stickyBgColor} set={ctx.setStickyBgColor} />
      <ColorField label="字体颜色" colors={COLORS} value={ctx.stickyTextColor} set={ctx.setStickyTextColor} />
      <div style={fieldGap}>
        <div style={labelStyle}>字体</div>
        <Select value={ctx.stickyFontFamily || FONTS[0].value} onChange={v => ctx.setStickyFontFamily?.(v)} optionList={FONTS} style={{ width: '100%' }} size="small" />
      </div>
      <div style={fieldGap}>
        <div style={labelStyle}>样式</div>
        <FormatBtns bold={ctx.textBold} italic={ctx.textItalic} underline={ctx.textUnderline} strike={ctx.textStrike} onToggle={ctx.setTextStyle} />
      </div>
      <RangeCtl label="字号" min={12} max={64} step={1} value={ctx.stickyFontSize||24} onChange={v => ctx.setStickyFontSize?.(v)} />
    </div>
  );
}

function CoordinateCore({ ctx }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <RangeCtl label="单位间距" min={16} max={120} step={1} value={ctx.coordinateUnitSize||40} onChange={v => ctx.setCoordinateUnitSize?.(v)} />
      <Toggle label="显示网格" checked={ctx.coordinateShowGrid??true} onChange={v => ctx.setCoordinateShowGrid?.(v)} />
      <Toggle label="显示刻度" checked={ctx.coordinateShowTicks??true} onChange={v => ctx.setCoordinateShowTicks?.(v)} />
      <Toggle label="显示标签" checked={ctx.coordinateShowLabels??true} onChange={v => ctx.setCoordinateShowLabels?.(v)} />
      <LabeledColor label="网格颜色" value={ctx.coordinateGridColor||'#e5e7eb'} set={ctx.setCoordinateGridColor} />
      <LabeledColor label="坐标轴颜色" value={ctx.coordinateAxisColor||'#111827'} set={ctx.setCoordinateAxisColor} />
      <LabeledColor label="标签颜色" value={ctx.coordinateLabelColor||'#64748b'} set={ctx.setCoordinateLabelColor} />
    </div>
  );
}

function LabeledColor({ label, value, set }) {
  return (
    <div style={fieldGap}>
      <div style={labelStyle}>{label}</div>
      <input type="color" value={value} onChange={e => set?.(e.target.value)}
        style={{ width:'100%', height:28, border:'1px solid var(--semi-color-border)', borderRadius:6, padding:2, cursor:'pointer' }} />
    </div>
  );
}

/* ---- mode → inspector dispatch ---- */

const LINEAR_ACTIONS = [
  { action: 'array-highlight', label: '应用高亮' },
  { action: 'array-clear-highlight', label: '清除高亮' },
  { action: 'linear-index-zero', label: '0 下标' },
  { action: 'linear-index-one', label: '1 下标' },
  { action: 'linear-index-show', label: '显示下标' },
  { action: 'linear-index-hide', label: '隐藏下标' },
  { action: 'linear-pointer-show', label: '显示指针' },
  { action: 'linear-pointer-hide', label: '隐藏指针' },
];

const GRAPH_ACTIONS = [
  { action: 'graph-add-node', label: '加点' },
  { action: 'graph-add-edge', label: '连边' },
  { action: 'graph-connect-mode', label: '点选连边' },
  { action: 'graph-delete-node', label: '删点' },
  { action: 'graph-delete-edge', label: '删边' },
  { action: 'graph-layout-circle', label: '环形布局' },
  { action: 'graph-layout-grid', label: '网格布局' },
  { action: 'graph-layout-layered', label: '分层布局' },
  { action: 'graph-layout-force', label: '力导向' },
];

const TREE_ACTIONS = [
  { action: 'tree-highlight-level', label: '层序遍历' },
  { action: 'tree-highlight-preorder', label: '前序遍历' },
  { action: 'tree-highlight-postorder', label: '后序遍历' },
  { action: 'tree-clear-highlight', label: '清除高亮' },
];

const BINARY_TREE_ACTIONS = [
  { action: 'tree-highlight-preorder', label: '前序遍历' },
  { action: 'tree-highlight-inorder', label: '中序遍历' },
  { action: 'tree-highlight-postorder', label: '后序遍历' },
  { action: 'tree-clear-highlight', label: '清除高亮' },
];

const LINEAR_STRUCTURE_TYPES = ['array-structure', 'stack-structure', 'queue-structure', 'deque-structure'];

function StructureCore({ ctx }) {
  const type = ctx.structureSelection || 'none';

  if (type === 'none') return <div style={{ padding: 8, color: 'var(--semi-color-text-2)', fontSize: 12 }}>选择一个结构元素</div>;

  let actions = [];
  if (LINEAR_STRUCTURE_TYPES.includes(type)) actions = LINEAR_ACTIONS;
  else if (type === 'graph-structure') actions = GRAPH_ACTIONS;
  else if (type === 'tree-structure') actions = TREE_ACTIONS;

  const actionBtnStyle = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: 28, padding: '0 10px', cursor: 'pointer', fontSize: 11,
    border: '1px solid var(--semi-color-border)', borderRadius: 6,
    background: 'var(--semi-color-fill-0)', color: 'var(--semi-color-text-1)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {actions.map((a) => (
          <button key={a.action} type="button" onClick={() => ctx.runAction?.(a.action)} style={actionBtnStyle}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function resolveInspector(mode, shape, ctx) {
  const isRect = shape === 'rect';
  const isEllipse = shape === 'ellipse';
  const isArrow = shape === 'arrow';
  const showFill = (mode === 'tool' || mode === 'element') && (isRect || isEllipse);
  const showArrowCtrl = (mode === 'tool' || mode === 'linear-tool' || mode === 'element' || mode === 'linear') && isArrow;
  const showCapStyle = mode === 'brush' || mode === 'stroke';

  switch (mode) {
    case 'brush':
    case 'stroke':
      return <BrushCore ctx={ctx} showFill={false} showArrow={false} showCapStyle={true} />;
    case 'tool':
    case 'linear-tool':
      return <BrushCore ctx={ctx} showFill={showFill} showArrow={showArrowCtrl} showCapStyle={false} />;
    case 'element':
    case 'linear':
      return <BrushCore ctx={ctx} showFill={showFill} showArrow={showArrowCtrl} showCapStyle={false} />;
    case 'text':
      return <TextCore ctx={ctx} />;
    case 'sticky':
      return <StickyCore ctx={ctx} />;
    case 'coordinate-tool':
    case 'coordinate':
      return <CoordinateCore ctx={ctx} />;
    case 'multi':
      return <BrushCore ctx={ctx} showFill={false} showArrow={false} showCapStyle={false} />;
    case 'structure':
      return <StructureCore ctx={ctx} />;
    default:
      // When panel is hidden but a tool that has presets is active, show its inspector
      if (ctx.currentTool === 'text') return <TextCore ctx={ctx} />;
      if (ctx.currentTool === 'sticky') return <StickyCore ctx={ctx} />;
      return null;
  }
}

/* ---- Main Panel ---- */

const PANEL_STYLE = {
  position: 'fixed', zIndex: 26, top: '50%', transform: 'translateY(-50%)',
  border: '1px solid var(--fluent-stroke)', background: 'rgba(255,255,255,0.96)',
  boxShadow: '0 18px 46px rgba(15,23,42,0.1)', backdropFilter: 'blur(24px)',
  transition: 'opacity 180ms cubic-bezier(0.33,0,0.2,1), transform 220ms cubic-bezier(0.33,0,0.2,1)',
  overflow: 'hidden',
};

export default function StylePanel() {
  const ctx = useWhiteboardContext();
  const collapsed = ctx.stylePanelCollapsed ?? false;
  const mode = ctx.panelMode || 'hidden';
  const shape = ctx.activeShape || 'rect';
  const panelTitle = ctx.stylePanelTitle || '属性';

  // Hide panel entirely when mode is hidden and no tool preset should show
  const shouldShow = mode !== 'hidden' || ctx.currentTool === 'text' || ctx.currentTool === 'sticky';

  if (!shouldShow) {
    return (
      <StylePanelToggle collapsed={collapsed} onClick={() => ctx.setStylePanelCollapsed?.(false)} />
    );
  }

  const panelTransform = collapsed ? 'translate(calc(-100% - 20px), -50%)' : 'translate(0, -50%)';
  const inspector = resolveInspector(mode, shape, ctx);

  if (!inspector) return <StylePanelToggle collapsed={collapsed} onClick={() => ctx.setStylePanelCollapsed?.(false)} />;

  return (
    <>
      <aside style={{ ...PANEL_STYLE, left: 0, width: 260, maxHeight: 'calc(100vh - 64px)', padding: 18,
        borderRadius: '0 24px 24px 0', borderLeft: 0, transform: panelTransform,
        opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? 'none' : 'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, fontSize:13, color:'var(--semi-color-text-0)' }}
            dangerouslySetInnerHTML={{ __html: ICON_PANEL + panelTitle }} />
          <button type="button" onClick={() => ctx.setStylePanelCollapsed?.(true)}
            style={{ fontSize:22, width:32, height:32, padding:0, border:'none', borderRadius:8, cursor:'pointer',
              background:'transparent', color:'var(--semi-color-text-2)', display:'flex', alignItems:'center', justifyContent:'center' }}
            aria-label="收起属性">‹</button>
        </div>
        {inspector}
      </aside>
      <StylePanelToggle collapsed={collapsed} onClick={() => ctx.setStylePanelCollapsed?.(false)} />
    </>
  );
}

export function StylePanelToggle({ collapsed, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        position: 'fixed', zIndex: 26, top: '50%', left: 0, transform: 'translateY(-50%)',
        width: 32, height: 56, padding: 0,
        border: '1px solid rgba(148,163,184,0.28)', borderLeft: 0, borderRadius: '0 8px 8px 0',
        background: 'rgba(255,255,255,0.94)', boxShadow: '0 18px 50px rgba(15,23,42,0.08)',
        backdropFilter: 'blur(16px)', cursor: 'pointer',
        fontSize: 22, lineHeight: '56px', color: '#64748b',
        display: collapsed ? 'block' : 'none', opacity: collapsed ? 1 : 0,
        transition: 'opacity 180ms cubic-bezier(0.33,0,0.2,1)',
      }}
      aria-label="展开属性" title="展开属性">
      <span aria-hidden="true">›</span>
    </button>
  );
}
