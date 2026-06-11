import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Tabs, TextArea, Input, Card, Divider, Space } from '@douyinfe/semi-ui';
import { useWhiteboardContext } from '../WhiteboardContext';
import { STRUCTURE_ITEMS } from '../../structures/types.js';

const LINEAR_TYPES = new Set(['array', 'stack', 'queue', 'deque', 'tree', 'binary-tree']);

const STRUCTURE_TABS = STRUCTURE_ITEMS.map(item => ({ tab: item.label, itemKey: item.id }));

const INIT_MODE_TABS = [
  { tab: '手填结构', itemKey: 'manual' },
  { tab: '随机生成', itemKey: 'random' },
];

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
  const [count, setCount] = useState(5);
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
    const num = v || 5;
    setCount(num);
    writeDomValue(findLegacyRoot(), '[data-array-random-count]', String(num));
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => ctx.setStructurePanelVisible?.(false)} />
      <div style={{
        position: 'fixed', zIndex: 31, bottom: 76, left: '50%',
        transform: 'translateX(-50%)', width: 360,
      }}>
        <Card
          title="结构模板"
          bordered
          shadows="always"
          headerStyle={{ padding: '12px 16px' }}
          bodyStyle={{ padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
          footerLine
          footerStyle={{ padding: '8px 16px' }}
          footer={
            <Space spacing="medium" style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button size="small" theme="outline" type="tertiary" style={{ borderRadius: 8 }} onClick={handleCancel}>取消</Button>
              <Button size="small" theme="solid" type="primary" style={{ borderRadius: 8 }} onClick={handleInsert}>插入</Button>
            </Space>
          }
        >
          <Tabs
            activeKey={activeType}
            onChange={handleTypeChange}
            tabList={STRUCTURE_TABS}
            type="card"
            size="small"
            tabPaneMotion={false}
          />

          {supportsRandom && (
            <Tabs
              activeKey={initMode}
              onChange={handleModeChange}
              tabList={INIT_MODE_TABS}
              type="card"
              size="small"
              tabPaneMotion={false}
            />
          )}

          <Divider margin="4px" />

          {showInput && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: 'var(--semi-color-text-2)', fontSize: 12, fontWeight: 600 }}>初始结构</div>
              <TextArea
                value={input}
                onChange={handleInputChange}
                rows={3}
                spellCheck={false}
                resize="vertical"
                style={{ border: '1px solid var(--semi-color-border)', borderRadius: 6, background: 'var(--semi-color-fill-0)' }}
              />
            </div>
          )}

          {supportsRandom && initMode === 'random' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: 'var(--semi-color-text-2)', fontSize: 12, fontWeight: 600 }}>元素数量</div>
              <Input
                value={String(count)}
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
