import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, ColorPicker, Select, Slider, Input, TextArea, Checkbox, Switch } from '@douyinfe/semi-ui';
import { Bold, Italic, Underline, Strikethrough, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { getInspectorTitle } from '../inspector/model.js';
import { icon } from '../../ui/config.js';
import { GLASS, GLASS_EDGE, RADIUS, TEXT, PANEL_MOTION } from '../../ui/tokens.js';

const ICON_BOLD = icon(Bold);
const ICON_ITALIC = icon(Italic);
const ICON_UNDERLINE = icon(Underline);
const ICON_STRIKE = icon(Strikethrough);
const ICON_PANEL = icon(SlidersHorizontal);

const COLORS = ['#111827', '#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed'];
const FILLS  = ['#ffffff', '#dbeafe', '#fee2e2', '#dcfce7', '#fef3c7', '#ede9fe'];
const BGS    = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#ddd6fe', '#fed7aa'];
const TEXT_PANEL_MODES = new Set(['text', 'sticky']);
const COLOR_PICKER_WIDTH = 220;
const COLOR_PICKER_HEIGHT = 180;

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

const cardGroupStyle = {
  background: 'var(--semi-color-fill-0)',
  border: '1px solid var(--semi-color-border)',
  borderRadius: RADIUS.md,
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const cardGroupTitleStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: 'var(--semi-color-text-2)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '2px',
};

function ColorField({ label, colors, value, set }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const togglePalette = () => setPaletteOpen(open => !open);

  return (
    <div style={fieldGap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...labelStyle }}>
        <span>{label}</span>
      </div>
      <div role="group" style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {colors.map(c => (
          <button key={c} onClick={() => set?.(c)} title={c}
            className="color-preset-btn" style={{ width: 24, height: 24, padding: 0, cursor: 'pointer', border: 'none', borderRadius: RADIUS.xs,
              backgroundColor: c, boxShadow: value === c ? `0 0 0 2px var(--semi-color-primary)` : `inset 0 0 0 1px rgba(0,0,0,0.15)` }} />
        ))}
        <div style={{ width: 1, height: 20, backgroundColor: 'var(--semi-color-border)', margin: '0 3px', flex: 'none' }} />
        <ColorPicker
          value={ColorPicker.colorStringToValue(value || '#111827')}
          onChange={(v) => set?.(v.hex)}
          usePopover={true}
          popoverProps={{
            trigger: 'custom',
            visible: paletteOpen,
            onVisibleChange: setPaletteOpen,
          }}
          width={COLOR_PICKER_WIDTH}
          height={COLOR_PICKER_HEIGHT}
          alpha={false}
          eyeDropper={false}
        >
          <div
            role="button"
            tabIndex={0}
            aria-label={`${label}调色板`}
            aria-expanded={paletteOpen}
            style={{ ...colorTriggerBase, backgroundColor: value || '#111827', width: 26, height: 26 }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            onClick={(e) => { e.stopPropagation(); togglePalette(); }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              togglePalette();
            }}
          />
        </ColorPicker>
      </div>
    </div>
  );
}

function RangeCtl({ label, min, max, step, value, onChange }) {
  return (
    <div style={fieldGap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...labelStyle }}>{label}</div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} tipFormatter={null} />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <Checkbox checked={checked} onChange={e => onChange(e.target.checked)} style={{ flexShrink: 0 }}>
      <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12, whiteSpace: 'nowrap' }}>{label}</span>
    </Checkbox>
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
              borderRadius:RADIUS.sm, background: cap==='round' ? activeBg : idleBg }}>
            <svg width="28" height="12" viewBox="0 0 28 12" style={{ display: 'block' }}>
              <rect x="4" y="2" width="20" height="8" rx="4" fill={capColor} />
            </svg>
          </button>
          <button onClick={() => onCap('square')} title="平头"
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', height:32, padding:0, cursor:'pointer',
              border: cap==='square' ? activeBorder : idleBorder,
              borderRadius:RADIUS.sm, background: cap==='square' ? activeBg : idleBg }}>
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
                borderRadius:RADIUS.sm, background: style===v ? 'var(--semi-color-primary-light-default)' : 'var(--semi-color-fill-0)' }}>
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
    <div style={{ borderRadius: RADIUS.sm, background: 'var(--semi-color-fill-0)', padding: 6, overflow: 'hidden' }}>
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
      border: '1px solid var(--semi-color-border)', borderRadius: RADIUS.md, background: 'var(--semi-color-fill-0)' }}>
      {btns.map(b => (
        <button key={b.k} title={b.t} onClick={() => onToggle(b.k)}
          style={{ display:'grid', placeItems:'center', height:28, border:'none', borderRadius:RADIUS.sm, cursor:'pointer',
            background: b.v ? 'var(--semi-color-primary-light-default)' : 'transparent',
            color: b.v ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)' }}
          dangerouslySetInnerHTML={{ __html: b.h }} />
      ))}
    </div>
  );
}

/* ---- inspectors ---- */

function BrushCore({ ctx, showFill, showArrow, showCapStyle, showPreview = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {showPreview && <Preview color={ctx.brushColor} width={ctx.brushWidth} cap={ctx.brushCap} />}
      <ColorField label={showFill ? '边框颜色' : '颜色'} colors={COLORS} value={ctx.brushColor} set={ctx.setBrushColor} />
      {showFill && <ColorField label="填充颜色" colors={FILLS} value={ctx.fillColor} set={ctx.setFillColor} />}
      <div style={fieldGap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...labelStyle, flexShrink: 0 }}>粗细</span>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <Slider min={1} max={28} step={1} value={ctx.brushWidth||6} onChange={v => ctx.setBrushWidth?.(v)} tipFormatter={null} />
          </div>
          {showFill && <Toggle label="透明填充" checked={ctx.fillTransparent??true} onChange={v => ctx.setFillTransparent?.(v)} />}
          {showArrow && <Toggle label="双箭头" checked={ctx.arrowDoubleEnded??false} onChange={v => ctx.setArrowDoubleEnded?.(v)} />}
        </div>
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
  const [activeColor, setActiveColor] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <RangeCtl label="单位间距" min={16} max={120} step={1} value={ctx.coordinateUnitSize||40} onChange={v => ctx.setCoordinateUnitSize?.(v)} />
      <div style={fieldGap}>
        <div style={labelStyle}>显示选项</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Toggle label="网格" checked={ctx.coordinateShowGrid??true} onChange={v => ctx.setCoordinateShowGrid?.(v)} />
          <Toggle label="刻度" checked={ctx.coordinateShowTicks??true} onChange={v => ctx.setCoordinateShowTicks?.(v)} />
          <Toggle label="标签" checked={ctx.coordinateShowLabels??true} onChange={v => ctx.setCoordinateShowLabels?.(v)} />
        </div>
      </div>
      <div style={fieldGap}>
        <div style={labelStyle}>颜色设置</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <LabeledColor label="网格" value={ctx.coordinateGridColor||'#e5e7eb'} set={ctx.setCoordinateGridColor}
            open={activeColor === 'grid'}
            onToggle={() => setActiveColor(v => v === 'grid' ? null : 'grid')}
            onClose={() => setActiveColor(v => v === 'grid' ? null : v)} />
          <LabeledColor label="坐标轴" value={ctx.coordinateAxisColor||'#111827'} set={ctx.setCoordinateAxisColor}
            open={activeColor === 'axis'}
            onToggle={() => setActiveColor(v => v === 'axis' ? null : 'axis')}
            onClose={() => setActiveColor(v => v === 'axis' ? null : v)} />
          <LabeledColor label="标签" value={ctx.coordinateLabelColor||'#64748b'} set={ctx.setCoordinateLabelColor}
            open={activeColor === 'label'}
            onToggle={() => setActiveColor(v => v === 'label' ? null : 'label')}
            onClose={() => setActiveColor(v => v === 'label' ? null : v)} />
        </div>
      </div>
    </div>
  );
}

const colorTriggerBase = {
  width: 26, height: 26, borderRadius: RADIUS.xs, cursor: 'pointer',
  border: '1px solid var(--semi-color-border)',
  transition: 'transform 180ms cubic-bezier(0.33,0,0.2,1)',
  transform: 'scale(1)',
};

function LabeledColor({ label, value, set, open, onToggle, onClose }) {
  return (
    <ColorPicker
      value={ColorPicker.colorStringToValue(value)}
      onChange={(v) => { set?.(v.hex); }}
      usePopover={true}
      popoverProps={{ trigger: 'custom', visible: open, onVisibleChange: (v) => { if (!v) onClose?.(); } }}
      width={COLOR_PICKER_WIDTH}
      height={COLOR_PICKER_HEIGHT}
      alpha={false}
      eyeDropper={false}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div
          role="button"
          tabIndex={0}
          aria-label={`${label}调色板`}
          aria-expanded={open}
          style={{ ...colorTriggerBase, backgroundColor: value }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            onToggle?.();
          }}
        />
        <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12, whiteSpace: 'nowrap' }}>{label}</span>
      </div>
    </ColorPicker>
  );
}

/* ---- Multi Inspector ---- */

function MultiInspector({ ctx }) {
  const caps = ctx.selectionCaps || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(caps.drawing || caps.stroke) && (
        <BrushCore ctx={ctx} showFill={caps.fillShape} showArrow={caps.arrow} showCapStyle={caps.stroke} showPreview={caps.stroke} />
      )}
      {caps.text && <TextCore ctx={ctx} />}
      {caps.sticky && <StickyCore ctx={ctx} />}
      {caps.coordinate && <CoordinateCore ctx={ctx} />}
    </div>
  );
}

/* ---- mode → inspector dispatch ---- */

const LINEAR_STRUCTURE_TYPES = ['array-structure', 'stack-structure', 'queue-structure', 'deque-structure'];

const textAreaStyle = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid var(--semi-color-border)', borderRadius: RADIUS.xs,
  background: 'var(--semi-color-fill-0)', color: 'var(--semi-color-text-0)',
};

const textAreaInner = {
  minHeight: 52, padding: '6px 8px', fontSize: 12, lineHeight: 1.5,
  outline: 'none', fontFamily: 'inherit',
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box', height: 28, padding: '0 8px', fontSize: 12,
  border: '1px solid var(--semi-color-border)', borderRadius: RADIUS.xs,
  background: 'var(--semi-color-fill-0)', color: 'var(--semi-color-text-0)',
  outline: 'none', fontFamily: 'inherit',
};

function readDom(root, selector, prop) {
  const el = root?.querySelector(selector);
  return el ? (prop ? el[prop] : el.value) : '';
}

function writeDomValue(root, selector, value) {
  const el = root?.querySelector(selector);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function findLegacyRoot() {
  const container = document.querySelector('#stage-container');
  return container?.parentElement ?? null;
}

function MatrixStructureInspector({ ctx }) {
  const matrix = ctx.matrixStructure;
  const [input, setInput] = useState(matrix?.input ?? '');
  const [rows, setRows] = useState(String(matrix?.rows ?? 1));
  const [columns, setColumns] = useState(String(matrix?.columns ?? 1));
  const activeElementIdRef = useRef(matrix?.elementId ?? null);
  const dirtyRef = useRef(false);
  const sizeDirtyRef = useRef(false);

  useEffect(() => {
    const elementChanged = activeElementIdRef.current !== (matrix?.elementId ?? null);
    if (elementChanged || !dirtyRef.current) {
      activeElementIdRef.current = matrix?.elementId ?? null;
      setInput(matrix?.input ?? '');
      dirtyRef.current = false;
    }
    if (elementChanged || !sizeDirtyRef.current) {
      setRows(String(matrix?.rows ?? 1));
      setColumns(String(matrix?.columns ?? 1));
      sizeDirtyRef.current = false;
    }
  }, [matrix?.elementId, matrix?.input, matrix?.rows, matrix?.columns]);

  if (!matrix) return null;

  const handleInputChange = (value) => {
    dirtyRef.current = true;
    setInput(value);
  };
  const applyInput = () => {
    dirtyRef.current = false;
    ctx.updateMatrixStructure?.({ input });
  };
  const applySize = () => {
    sizeDirtyRef.current = false;
    const nextRows = Number.parseInt(rows, 10);
    const nextColumns = Number.parseInt(columns, 10);
    ctx.updateMatrixStructure?.({
      rows: Number.isInteger(nextRows) ? nextRows : matrix.rows,
      columns: Number.isInteger(nextColumns) ? nextColumns : matrix.columns,
    });
  };

  return (
    <div data-matrix-structure-inspector style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={cardGroupStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={cardGroupTitleStyle}>尺寸</div>
          <span style={{ color: 'var(--semi-color-text-2)', fontSize: 11 }}>
            {matrix.rows} 行 x {matrix.columns} 列
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={fieldGap}>
            <span style={labelStyle}>行数</span>
            <Input
              type="number"
              min={1}
              max={32}
              step={1}
              value={rows}
              onChange={(value) => { sizeDirtyRef.current = true; setRows(String(value)); }}
              style={inputStyle}
            />
          </div>
          <div style={fieldGap}>
            <span style={labelStyle}>列数</span>
            <Input
              type="number"
              min={1}
              max={32}
              step={1}
              value={columns}
              onChange={(value) => { sizeDirtyRef.current = true; setColumns(String(value)); }}
              style={inputStyle}
            />
          </div>
        </div>
        <Button
          size="small"
          theme="light"
          type="primary"
          style={{ height: 28, borderRadius: RADIUS.sm }}
          onClick={applySize}
        >
          应用尺寸
        </Button>
      </div>

      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>二维数据</div>
        <TextArea
          value={input}
          onChange={handleInputChange}
          rows={5}
          spellCheck={false}
          resize="vertical"
          placeholder={'1,2,3\n4,5,6'}
          style={textAreaStyle}
          textareaStyle={textAreaInner}
        />
        <Button
          size="small"
          theme="light"
          type="primary"
          style={{ height: 28, borderRadius: RADIUS.sm }}
          onClick={applyInput}
        >
          应用结构
        </Button>
      </div>

      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>下标</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[0, 1].map((indexBase) => (
            <Button
              key={indexBase}
              size="small"
              theme={matrix.indexBase === indexBase ? 'light' : 'outline'}
              type={matrix.indexBase === indexBase ? 'primary' : 'tertiary'}
              style={{ height: 28, borderRadius: RADIUS.sm }}
              onClick={() => ctx.updateMatrixStructure?.({ indexBase })}
            >
              {indexBase} 下标
            </Button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={labelStyle}>显示下标</span>
          <Switch
            checked={matrix.showIndexes}
            size="small"
            onChange={(checked) => ctx.updateMatrixStructure?.({ showIndexes: checked })}
          />
        </div>
      </div>
    </div>
  );
}

/* ---- Linear Structure Inspector ---- */

function LinearStructureInspector({ ctx }) {
  const [values, setValues] = useState('');
  const [valuesTitle, setValuesTitle] = useState('当前结构');
  const [hStart, setHStart] = useState('0');
  const [hEnd, setHEnd] = useState('0');
  const [hPointer, setHPointer] = useState('0');
  const [algo, setAlgo] = useState('bubble-sort');
  const [algoStatus, setAlgoStatus] = useState('');
  const [algoSpeed, setAlgoSpeed] = useState('1');

  const [startDisabled, setStartDisabled] = useState(false);
  const [prevDisabled, setPrevDisabled] = useState(true);
  const [nextDisabled, setNextDisabled] = useState(true);
  const [playDisabled, setPlayDisabled] = useState(true);
  const [resetDisabled, setResetDisabled] = useState(true);
  const [stopDisabled, setStopDisabled] = useState(true);
  const [playLabel, setPlayLabel] = useState('播放');

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    const sync = () => {
      const root = findLegacyRoot();
      if (!root) return;
      const t = ctxRef.current.structureSelection || 'none';
      if (!LINEAR_STRUCTURE_TYPES.includes(t)) return;
      setValues(prev => { const v = readDom(root, '[data-linear-values-input]'); return prev !== v ? v : prev; });
      setValuesTitle(prev => { const v = readDom(root, '[data-linear-values-title]', 'textContent') || '当前结构'; return prev !== v ? v : prev; });
      setHStart(prev => { const v = readDom(root, '[data-linear-field="highlight-start"]'); return prev !== v ? v : prev; });
      setHEnd(prev => { const v = readDom(root, '[data-linear-field="highlight-end"]'); return prev !== v ? v : prev; });
      setHPointer(prev => { const v = readDom(root, '[data-linear-field="highlight-pointer"]'); return prev !== v ? v : prev; });
      setAlgo(prev => { const v = readDom(root, '[data-array-algorithm-select]'); return prev !== v ? v : prev; });
      setAlgoStatus(prev => { const v = readDom(root, '[data-array-algorithm-status]', 'textContent'); return prev !== v ? v : prev; });
      setAlgoSpeed(prev => { const v = readDom(root, '[data-array-algorithm-speed]'); return prev !== v ? v : prev; });

      setStartDisabled(prev => {
        const btn = root.querySelector("[data-action='array-algorithm-start']");
        const val = btn ? btn.disabled : false;
        return prev !== val ? val : prev;
      });
      setPrevDisabled(prev => {
        const btn = root.querySelector("[data-action='array-algorithm-prev']");
        const val = btn ? btn.disabled : true;
        return prev !== val ? val : prev;
      });
      setNextDisabled(prev => {
        const btn = root.querySelector("[data-action='array-algorithm-next']");
        const val = btn ? btn.disabled : true;
        return prev !== val ? val : prev;
      });
      setPlayDisabled(prev => {
        const btn = root.querySelector("[data-action='array-algorithm-play']");
        const val = btn ? btn.disabled : true;
        return prev !== val ? val : prev;
      });
      setResetDisabled(prev => {
        const btn = root.querySelector("[data-action='array-algorithm-reset']");
        const val = btn ? btn.disabled : true;
        return prev !== val ? val : prev;
      });
      setStopDisabled(prev => {
        const btn = root.querySelector("[data-action='array-algorithm-stop']");
        const val = btn ? btn.disabled : true;
        return prev !== val ? val : prev;
      });
      setPlayLabel(prev => {
        const btn = root.querySelector("[data-action='array-algorithm-play']");
        const val = btn ? (btn.textContent || '播放') : '播放';
        return prev !== val ? val : prev;
      });
    };
    sync();
    const id = setInterval(sync, 150);
    return () => clearInterval(id);
  }, []);

  const handleValuesChange = useCallback((v) => {
    setValues(v);
    writeDomValue(findLegacyRoot(), '[data-linear-values-input]', v);
  }, []);

  const handleFieldChange = useCallback((selector, setter) => (v) => {
    const val = typeof v === 'number' ? String(v) : (v?.target?.value ?? v);
    setter(val);
    writeDomValue(findLegacyRoot(), selector, val);
  }, []);

  const handleAlgoChange = useCallback((v) => {
    setAlgo(v);
    writeDomValue(findLegacyRoot(), '[data-array-algorithm-select]', v);
  }, []);

  const handleSpeedChange = useCallback((v) => {
    const val = String(v);
    setAlgoSpeed(val);
    writeDomValue(findLegacyRoot(), '[data-array-algorithm-speed]', val);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 1. 数据输入 */}
      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>数据输入</div>
        <div style={fieldGap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>{valuesTitle}</span>
            <Button size="small" theme="light" type="primary" style={{ height: 26, fontSize: 11, padding: '0 8px', borderRadius: RADIUS.xs }}
              onClick={() => ctx.runAction?.('linear-apply-values')}>应用结构</Button>
          </div>
          <TextArea value={values} onChange={v => handleValuesChange(v)} rows={2}
            spellCheck={false} placeholder="1,2,3" resize="vertical" style={textAreaStyle} textareaStyle={textAreaInner} />
        </div>
      </div>

      {/* 2. 元素高亮指示器 */}
      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>元素高亮指示器</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          <div style={fieldGap}>
            <div style={labelStyle}>高亮起点</div>
            <Input value={hStart} size="small"
              onChange={handleFieldChange('[data-linear-field="highlight-start"]', setHStart)} style={inputStyle} />
          </div>
          <div style={fieldGap}>
            <div style={labelStyle}>高亮终点</div>
            <Input value={hEnd} size="small"
              onChange={handleFieldChange('[data-linear-field="highlight-end"]', setHEnd)} style={inputStyle} />
          </div>
          <div style={fieldGap}>
            <div style={labelStyle}>指针</div>
            <Input value={hPointer} size="small"
              onChange={handleFieldChange('[data-linear-field="highlight-pointer"]', setHPointer)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 4 }}>
          <Button size="small" theme="light" type="tertiary" style={{ height: 28, fontSize: 12, borderRadius: RADIUS.sm, fontWeight: 600 }}
            onClick={() => ctx.runAction?.('array-highlight')}>应用高亮</Button>
          <Button size="small" theme="outline" type="tertiary" style={{ height: 28, fontSize: 12, borderRadius: RADIUS.sm }}
            onClick={() => ctx.runAction?.('array-clear-highlight')}>清除高亮</Button>
        </div>
      </div>

      {/* 3. 下标与指针选项 */}
      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>下标与指针选项</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { action: 'linear-index-zero', label: '0 下标' },
            { action: 'linear-index-one', label: '1 下标' },
            { action: 'linear-index-show', label: '显示下标' },
            { action: 'linear-index-hide', label: '隐藏下标' },
            { action: 'linear-pointer-show', label: '显示指针' },
            { action: 'linear-pointer-hide', label: '隐藏指针' },
          ].map(a => (
            <Button key={a.action} size="small" theme="outline" type="tertiary" style={{ height: 28, fontSize: 11, padding: 0, borderRadius: RADIUS.xs }}
              onClick={() => ctx.runAction?.(a.action)}>{a.label}</Button>
          ))}
        </div>
      </div>

      {/* 4. 排序演示 - 仅数组 */}
      {ctx.structureSelection === 'array-structure' && (
      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>排序演示</div>
        <div style={fieldGap}>
          <div style={labelStyle}>演示算法</div>
          <Select value={algo} onChange={handleAlgoChange} size="small" style={{ width: '100%' }}
            optionList={[
              { value: 'bubble-sort', label: '冒泡排序' },
              { value: 'selection-sort', label: '选择排序' },
              { value: 'insertion-sort', label: '插入排序' },
            ]} />
        </div>
        <div style={{
          background: 'var(--semi-color-fill-1)',
          border: '1px solid var(--semi-color-border)',
          borderRadius: RADIUS.sm,
          padding: '8px 10px',
          color: 'var(--semi-color-text-1)',
          fontSize: '11px',
          lineHeight: '1.4',
          minHeight: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 500,
          textAlign: 'center',
        }}>
          {algoStatus || '选择数组后开始演示'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { action: 'array-algorithm-start', label: '开始', main: true, disabled: startDisabled },
            { action: 'array-algorithm-prev', label: '上一步', disabled: prevDisabled },
            { action: 'array-algorithm-next', label: '下一步', disabled: nextDisabled },
            { action: 'array-algorithm-play', label: playLabel, main: true, disabled: playDisabled },
            { action: 'array-algorithm-reset', label: '重置', disabled: resetDisabled },
            { action: 'array-algorithm-stop', label: '结束', disabled: stopDisabled },
          ].map(a => (
            <Button key={a.action} size="small"
              theme={a.main ? "light" : "outline"}
              type="tertiary"
              disabled={a.disabled}
              style={{ height: 28, fontSize: 12, borderRadius: RADIUS.sm, fontWeight: a.main ? 600 : 400 }}
              onClick={() => ctx.runAction?.(a.action)}>{a.label}</Button>
          ))}
        </div>
        <div style={fieldGap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...labelStyle }}>
            <span>演示速度</span>
            <span style={{ color: 'var(--semi-color-primary)' }}>{algoSpeed}x</span>
          </div>
          <Slider min={0.5} max={3} step={0.5} value={Number(algoSpeed) || 1} onChange={handleSpeedChange} tipFormatter={null} />
        </div>
      </div>
      )}
    </div>
  );
}

/* ---- Graph Structure Inspector ---- */

function GraphStructureInspector({ ctx }) {
  const [input, setInput] = useState('');
  const [nodeScale, setNodeScale] = useState('100');

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    const sync = () => {
      const root = findLegacyRoot();
      if (!root) return;
      const t = ctxRef.current.structureSelection || 'none';
      if (t !== 'graph-structure') return;
      setInput(prev => { const v = readDom(root, '[data-graph-structure-input]'); return prev !== v ? v : prev; });
      setNodeScale(prev => { const v = readDom(root, '[data-graph-node-scale]') || '100'; return prev !== v ? v : prev; });
    };
    sync();
    const id = setInterval(sync, 150);
    return () => clearInterval(id);
  }, []);

  const handleInputChange = useCallback((v) => {
    setInput(v);
    writeDomValue(findLegacyRoot(), '[data-graph-structure-input]', v);
  }, []);

  const handleNodeScaleChange = useCallback((v) => {
    const val = String(v);
    setNodeScale(val);
    writeDomValue(findLegacyRoot(), '[data-graph-node-scale]', val);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 1. 图结构数据 */}
      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>图结构数据</div>
        <div style={fieldGap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>顶点与边关系</span>
            <Button size="small" theme="light" type="primary" style={{ height: 26, fontSize: 11, padding: '0 8px', borderRadius: RADIUS.xs }}
              onClick={() => ctx.runAction?.('graph-apply-structure')}>应用结构</Button>
          </div>
          <TextArea value={input} onChange={v => handleInputChange(v)} rows={3}
            spellCheck={false} placeholder="A->B&#10;A-C" resize="vertical" style={textAreaStyle} textareaStyle={textAreaInner} />
        </div>
      </div>

      {/* 2. 图设置 */}
      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>图设置</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13 }}>有向图</span>
          <Switch checked={ctx.graphDirected ?? false}
            onChange={() => ctx.runAction?.('graph-directed-toggle')} />
        </div>
        <div style={fieldGap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...labelStyle }}>
            <span>节点大小</span>
            <span style={{ color: 'var(--semi-color-primary)' }}>{nodeScale}%</span>
          </div>
          <Slider min={50} max={200} step={10} value={Number(nodeScale) || 100}
            onChange={handleNodeScaleChange}
            onAfterChange={() => ctx.runAction?.('graph-node-scale-commit')}
            tipFormatter={null} />
        </div>
      </div>
    </div>
  );
}

/* ---- Tree Structure Inspector ---- */

const TREE_TRAVERSAL_ACTIONS = [
  { action: 'tree-highlight-level', label: '层序遍历' },
  { action: 'tree-highlight-preorder', label: '前序遍历' },
  { action: 'tree-highlight-inorder', label: '中序遍历' },
  { action: 'tree-highlight-postorder', label: '后序遍历' },
  { action: 'tree-clear-highlight', label: '清除高亮' },
];

const BINARY_TREE_TRAVERSAL_ACTIONS = [
  { action: 'tree-highlight-preorder', label: '前序遍历' },
  { action: 'tree-highlight-inorder', label: '中序遍历' },
  { action: 'tree-highlight-postorder', label: '后序遍历' },
  { action: 'tree-clear-highlight', label: '清除高亮' },
];

function TreeStructureInspector({ ctx }) {
  const [input, setInput] = useState('');
  const [treeKind, setTreeKind] = useState('general');

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    const sync = () => {
      const root = findLegacyRoot();
      if (!root) return;
      const t = ctxRef.current.structureSelection || 'none';
      if (t !== 'tree-structure') return;
      setInput(prev => { const v = readDom(root, '[data-tree-structure-input]'); return prev !== v ? v : prev; });
      setTreeKind(prev => { const v = root.dataset.treeKind || 'general'; return prev !== v ? v : prev; });
    };
    sync();
    const id = setInterval(sync, 150);
    return () => clearInterval(id);
  }, []);

  const handleInputChange = useCallback((v) => {
    setInput(v);
    writeDomValue(findLegacyRoot(), '[data-tree-structure-input]', v);
  }, []);

  const actions = treeKind === 'binary' ? BINARY_TREE_TRAVERSAL_ACTIONS : TREE_TRAVERSAL_ACTIONS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 1. 树结构数据 */}
      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>树结构数据</div>
        <div style={fieldGap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>父子节点关系</span>
            <Button size="small" theme="light" type="primary" style={{ height: 26, fontSize: 11, padding: '0 8px', borderRadius: RADIUS.xs }}
              onClick={() => ctx.runAction?.('tree-apply-structure')}>应用结构</Button>
          </div>
          <TextArea value={input} onChange={v => handleInputChange(v)} rows={3}
            spellCheck={false} placeholder="A->B&#10;A->C" resize="vertical" style={textAreaStyle} textareaStyle={textAreaInner} />
        </div>
      </div>

      {/* 2. 遍历与交互 */}
      <div style={cardGroupStyle}>
        <div style={cardGroupTitleStyle}>遍历与交互</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {actions.map(a => {
            const isClear = a.action.includes('clear');
            return (
              <Button key={a.action} size="small"
                theme={isClear ? "outline" : "light"}
                type="tertiary"
                style={{ height: 28, fontSize: 12, borderRadius: RADIUS.sm }}
                onClick={() => ctx.runAction?.(a.action)}>{a.label}</Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---- StructureCore dispatcher ---- */

function StructureCore({ ctx }) {
  const type = ctx.structureSelection || 'none';

  if (type === 'none') return <div style={{ padding: 8, color: 'var(--semi-color-text-2)', fontSize: 12 }}>选择一个结构元素</div>;
  if (type === 'matrix-structure') return <MatrixStructureInspector ctx={ctx} />;
  if (LINEAR_STRUCTURE_TYPES.includes(type)) return <LinearStructureInspector ctx={ctx} />;
  if (type === 'graph-structure') return <GraphStructureInspector ctx={ctx} />;
  if (type === 'tree-structure') return <TreeStructureInspector ctx={ctx} />;

  return <div style={{ padding: 8, color: 'var(--semi-color-text-2)', fontSize: 12 }}>选择一个结构元素</div>;
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
      return <BrushCore ctx={ctx} showFill={false} showArrow={false} showCapStyle={true} showPreview={true} />;
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
      return <MultiInspector ctx={ctx} />;
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
  ...GLASS,
  position: 'fixed', zIndex: 26, top: '50%', transform: 'translateY(-50%)',
  transition: PANEL_MOTION,
  overflow: 'hidden',
};

export default function StylePanel() {
  const ctx = useWhiteboardContext();
  const collapsed = ctx.stylePanelCollapsed ?? false;
  const mode = ctx.panelMode || 'hidden';
  const shape = ctx.activeShape || 'rect';
  const titleContext = TEXT_PANEL_MODES.has(mode)
    ? { elements: [{ type: mode }] }
    : (mode === 'hidden' && TEXT_PANEL_MODES.has(ctx.currentTool)
      ? { tool: ctx.currentTool }
      : null);
  const panelTitle = titleContext ? getInspectorTitle(titleContext) : (ctx.stylePanelTitle || '属性');

  // Hide panel entirely when mode is hidden and no tool preset should show
  const shouldShow = mode !== 'hidden' || ctx.currentTool === 'text' || ctx.currentTool === 'sticky';

  if (!shouldShow) return null;

  const panelTransform = collapsed ? 'translate(calc(-100% - 20px), -50%)' : 'translate(0, -50%)';
  const inspector = resolveInspector(mode, shape, ctx);

  if (!inspector) return null;

  return (
    <>
      <aside style={{ ...PANEL_STYLE, left: 0, width: 260, maxHeight: 'calc(100vh - 64px)', padding: 18,
        borderRadius: `0 ${RADIUS.lg}px ${RADIUS.lg}px 0`, borderLeft: 0, transform: panelTransform,
        opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? 'none' : 'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, fontSize:13, color:TEXT.primary }}
            dangerouslySetInnerHTML={{ __html: ICON_PANEL + panelTitle }} />
          <button type="button" onClick={() => ctx.setStylePanelCollapsed?.(true)}
            style={{ width:32, height:32, padding:0, border:'none', borderRadius:RADIUS.sm, cursor:'pointer',
              background:'transparent', color:TEXT.tertiary, display:'flex', alignItems:'center', justifyContent:'center' }}
            aria-label="收起属性"
            dangerouslySetInnerHTML={{ __html: icon(ChevronLeft) }} />
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
        ...GLASS_EDGE,
        position: 'fixed', zIndex: 26, top: '50%', left: 0, transform: 'translateY(-50%)',
        width: 32, height: 56, padding: 0,
        borderLeft: 0, borderRadius: `0 ${RADIUS.sm}px ${RADIUS.sm}px 0`,
        cursor: 'pointer', color: TEXT.secondary,
        display: collapsed ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
        opacity: collapsed ? 1 : 0,
        transition: 'opacity 180ms cubic-bezier(0.33, 0, 0.2, 1)',
      }}
      aria-label="展开属性" title="展开属性"
      dangerouslySetInnerHTML={{ __html: icon(ChevronRight) }}
    />
  );
}
