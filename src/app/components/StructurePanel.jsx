import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, TextArea, Input, Card, Typography } from '@douyinfe/semi-ui';
import {
  BetweenHorizontalEnd, Layers, ListOrdered, ArrowLeftRight,
  Share2, GitFork, Binary,
} from 'lucide-static';
import { useWhiteboardContext } from '../WhiteboardContext';
import { STRUCTURE_ITEMS } from '../../structures/types.js';
import { icon } from '../../ui/config.js';

const { Text } = Typography;

const LINEAR_TYPES = new Set(['array', 'stack', 'queue', 'deque', 'tree', 'binary-tree']);

const STRUCTURE_ICON_MAP = {
  array: BetweenHorizontalEnd,
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
  const initializedRef = useRef(false);

  const supportsRandom = LINEAR_TYPES.has(activeType);
  const showInput = !(supportsRandom && initMode === 'random');

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

  const handleInsert = useCallback(() => {
    const root = findLegacyRoot();
    if (!root) return;
    writeDomValue(root, '[data-structure-input]', input);
    writeDomValue(root, '[data-array-random-count]', String(count));
    clickLegacyBtn(root, '[data-structure-insert]');
    ctx.setStructurePanelVisible?.(false);
  }, [input, count, ctx]);

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
              <TextArea
                value={input}
                onChange={handleInputChange}
                rows={3}
                spellCheck={false}
                resize="vertical"
                placeholder={getStructureItem(activeType).placeholder}
              />
            </div>
          )}

          {/* Random count input */}
          {supportsRandom && initMode === 'random' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Text style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                元素数量
              </Text>
              <Input
                value={count}
                onChange={handleCountChange}
                size="small"
                style={{ width: '100%' }}
              />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
