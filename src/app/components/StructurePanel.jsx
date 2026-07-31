import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Card, Typography } from '@douyinfe/semi-ui';
import {
  BetweenHorizontalEnd, Layers, ListOrdered, ArrowLeftRight,
  Share2, GitFork, Binary,
  Table2,
} from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { STRUCTURE_ITEMS } from '../../structures/types.js';
import { icon } from '../../ui/config.js';
import PresetHeightTextArea from './PresetHeightTextArea.jsx';

const { Text } = Typography;

const RANDOM_TYPES = new Set(['array', 'matrix', 'stack', 'queue', 'deque', 'graph', 'tree', 'binary-tree']);

const STRUCTURE_ICON_MAP = {
  array: BetweenHorizontalEnd,
  matrix: Table2,
  stack: Layers,
  queue: ListOrdered,
  deque: ArrowLeftRight,
  graph: Share2,
  tree: GitFork,
  'binary-tree': Binary,
};

function findLegacyRoot() {
  const container = document.querySelector('#stage-container');
  return container?.parentElement ?? null;
}

function writeDomValue(root, selector, value) {
  const el = root?.querySelector(selector);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function clickLegacyBtn(root, selector) {
  const btn = root?.querySelector(selector);
  if (btn) btn.click();
}

function getStructureItem(type) {
  return STRUCTURE_ITEMS.find(i => i.id === type) ?? STRUCTURE_ITEMS[0];
}

export default function StructurePanel() {
  const ctx = useWhiteboardContext();
  const visible = ctx.structurePanelVisible ?? false;
  const [activeType, setActiveType] = useState('array');
  const [initMode, setInitMode] = useState('manual');
  const [input, setInput] = useState('');
  const [count, setCount] = useState('5');
  const [matrixRows, setMatrixRows] = useState('3');
  const [matrixColumns, setMatrixColumns] = useState('3');
  const initializedRef = useRef(false);

  const supportsRandom = RANDOM_TYPES.has(activeType);
  const isMatrix = activeType === 'matrix';
  const showInput = !(supportsRandom && initMode === 'random');
  const randomCountLabel = ['graph', 'tree', 'binary-tree'].includes(activeType)
    ? '节点数量'
    : '元素数量';

  // Initialize from legacy DOM when panel opens
  useEffect(() => {
    if (!visible) {
      initializedRef.current = false;
      return;
    }
    const root = findLegacyRoot();
    if (!root) return;

    // Read active type from legacy DOM
    const activeBtn = root.querySelector('[data-structure-type].active');
    if (activeBtn && !initializedRef.current) {
      const type = activeBtn.dataset.structureType || 'array';
      setActiveType(type);
      const item = getStructureItem(type);
      setInput(item.defaultInput);

      const modeBtn = root.querySelector('[data-array-init-mode].active');
      if (modeBtn) setInitMode(modeBtn.dataset.arrayInitMode || 'manual');
      const randomCountInput = root.querySelector('[data-array-random-count]');
      if (randomCountInput) setCount(randomCountInput.value || '');
      const matrixRowsInput = root.querySelector('[data-matrix-random-rows]');
      if (matrixRowsInput) setMatrixRows(matrixRowsInput.value || '');
      const matrixColumnsInput = root.querySelector('[data-matrix-random-columns]');
      if (matrixColumnsInput) setMatrixColumns(matrixColumnsInput.value || '');

      initializedRef.current = true;
    }
  }, [visible]);

  const handleTypeChange = useCallback((key) => {
    setActiveType(key);
    const item = getStructureItem(key);
    setInput(item.defaultInput);
    clickLegacyBtn(findLegacyRoot(), `[data-structure-type="${key}"]`);
  }, []);

  const handleModeChange = useCallback((key) => {
    setInitMode(key);
    clickLegacyBtn(findLegacyRoot(), `[data-array-init-mode="${key}"]`);
  }, []);

  const handleInputChange = useCallback((v) => {
    setInput(v);
    writeDomValue(findLegacyRoot(), '[data-structure-input]', v);
  }, []);

  const handleCountChange = useCallback((v) => {
    const nextCount = String(v ?? '');
    setCount(nextCount);
    writeDomValue(findLegacyRoot(), '[data-array-random-count]', nextCount);
  }, []);

  const handleMatrixRowsChange = useCallback((v) => {
    const nextRows = String(v ?? '');
    setMatrixRows(nextRows);
    writeDomValue(findLegacyRoot(), '[data-matrix-random-rows]', nextRows);
  }, []);

  const handleMatrixColumnsChange = useCallback((v) => {
    const nextColumns = String(v ?? '');
    setMatrixColumns(nextColumns);
    writeDomValue(findLegacyRoot(), '[data-matrix-random-columns]', nextColumns);
  }, []);

  const handleInsert = useCallback(() => {
    const root = findLegacyRoot();
    if (!root) return;
    writeDomValue(root, '[data-structure-input]', input);
    writeDomValue(root, '[data-array-random-count]', String(count));
    writeDomValue(root, '[data-matrix-random-rows]', String(matrixRows));
    writeDomValue(root, '[data-matrix-random-columns]', String(matrixColumns));
    clickLegacyBtn(root, '[data-structure-insert]');
    ctx.setStructurePanelVisible?.(false);
  }, [input, count, matrixRows, matrixColumns, ctx]);

  const handleCancel = useCallback(() => {
    clickLegacyBtn(findLegacyRoot(), '[data-structure-cancel]');
    ctx.setStructurePanelVisible?.(false);
  }, [ctx]);

  if (!visible) return null;

  return (
    <>
      <div
        data-structure-panel-backdrop
        style={{ position: 'fixed', inset: 0, zIndex: 30 }}
        onClick={handleCancel}
      />
      <div
        className="structure-panel-react"
        style={{
          position: 'fixed', zIndex: 31, bottom: 76, left: '50%',
          transform: 'translateX(-50%)', width: 392,
        }}
      >
        <Card
          bordered={false}
          shadows="always"
          style={{ borderRadius: 16, overflow: 'visible' }}
          headerStyle={{ padding: '16px 20px 0' }}
          bodyStyle={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}
          footerLine={false}
          footerStyle={{ padding: '0 20px 16px' }}
          title={
            <Text weight="bold" style={{ fontSize: 15, color: 'var(--semi-color-text-0)' }}>
              结构模板
            </Text>
          }
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button theme="borderless" type="tertiary" style={{ borderRadius: 8 }} onClick={handleCancel}>取消</Button>
              <Button theme="solid" type="primary" style={{ borderRadius: 8 }} onClick={handleInsert}>插入</Button>
            </div>
          }
        >
          {/* Structure type card grid */}
          <div className="structure-type-grid">
            {STRUCTURE_ITEMS.map(item => (
              <button
                key={item.id}
                type="button"
                className={`structure-type-card${activeType === item.id ? ' active' : ''}`}
                onClick={() => handleTypeChange(item.id)}
              >
                {STRUCTURE_ICON_MAP[item.id] && (
                  <span
                    className="icon-wrapper"
                    dangerouslySetInnerHTML={{ __html: icon(STRUCTURE_ICON_MAP[item.id]) }}
                  />
                )}
                <span className="structure-type-label">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Segmented control for init mode */}
          {supportsRandom && (
            <div className="segmented-control">
              <div
                className="segmented-slider"
                style={{ transform: `translateX(${initMode === 'manual' ? 0 : 100}%)` }}
              />
              <button
                type="button"
                className={`segmented-btn${initMode === 'manual' ? ' active' : ''}`}
                onClick={() => handleModeChange('manual')}
              >
                手填结构
              </button>
              <button
                type="button"
                className={`segmented-btn${initMode === 'random' ? ' active' : ''}`}
                onClick={() => handleModeChange('random')}
              >
                随机生成
              </button>
            </div>
          )}

          {/* Manual input area */}
          {showInput && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Text style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                初始结构
              </Text>
              <PresetHeightTextArea
                value={input}
                onChange={handleInputChange}
                presetValue={getStructureItem(activeType).defaultInput}
                resetKey={activeType}
                rows={1}
                spellCheck={false}
                placeholder={getStructureItem(activeType).placeholder}
              />
            </div>
          )}

          {/* Random count input */}
          {supportsRandom && initMode === 'random' && !isMatrix && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Text style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                {randomCountLabel}
              </Text>
              <Input
                type="number"
                min={1}
                max={64}
                step={1}
                value={count}
                onChange={handleCountChange}
                size="small"
                style={{ width: '100%' }}
              />
            </div>
          )}

          {isMatrix && initMode === 'random' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Text style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                  行数
                </Text>
                <Input
                  aria-label="行数"
                  type="number"
                  min={1}
                  max={32}
                  step={1}
                  value={matrixRows}
                  onChange={handleMatrixRowsChange}
                  size="small"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Text style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                  列数
                </Text>
                <Input
                  aria-label="列数"
                  type="number"
                  min={1}
                  max={32}
                  step={1}
                  value={matrixColumns}
                  onChange={handleMatrixColumnsChange}
                  size="small"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
