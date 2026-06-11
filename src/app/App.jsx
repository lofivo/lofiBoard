import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { WhiteboardContext } from './WhiteboardContext';
import { createWhiteboardApp } from './whiteboard-app.js';
import { TOOLS } from '../ui/config.js';
import Topbar from './components/Topbar';
import ToolDock from './components/ToolDock';
import StatusBar from './components/StatusBar';
import StylePanel from './components/StylePanel';
import { StylePanelToggle } from './components/StylePanel';
import LayerPanel from './components/LayerPanel';
import { LayerPanelToggle } from './components/LayerPanel';
import ContextMenu from './components/ContextMenu';
import StructurePanel from './components/StructurePanel';

export default function App() {
  const legacyRootRef = useRef(null);
  const initializedRef = useRef(false);
  const contextMenuVisibleRef = useRef(false);
  const statusClearTimerRef = useRef(null);
  const lastStatusRef = useRef('就绪');
  const shiftRef = useRef(false);
  const ctrlRef = useRef(false);

  const [statusMessage, setStatusMessage] = useState('就绪');
  const [fileName, setFileName] = useState('未命名白板');
  const [currentTool, setCurrentTool] = useState(TOOLS.PEN);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [backgroundMode, setBackgroundModeState] = useState('plain');
  const [stylePanelTitle, setStylePanelTitle] = useState('属性');
  const [panelMode, setPanelMode] = useState('hidden');
  const [activeShape, setActiveShape] = useState('rect');
  const [layers, setLayers] = useState([]);
  const [selectedLayerIds, setSelectedLayerIds] = useState([]);
  const [structureSelection, setStructureSelection] = useState('none');
  const [shapePopoverVisible, setShapePopoverVisible] = useState(false);
  const [structurePanelVisible, setStructurePanelVisible] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const [brushColor, setBrushColor] = useState('#111827');
  const [brushWidth, setBrushWidth] = useState(6);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushCap, setBrushCap] = useState('round');
  const [brushStyle, setBrushStyle] = useState('solid');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [fillTransparent, setFillTransparent] = useState(true);
  const [textColor, setTextColor] = useState('#111827');
  const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');
  const [fontSize, setFontSize] = useState(28);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textStrike, setTextStrike] = useState(false);
  const [stickyBgColor, setStickyBgColor] = useState('#fef08a');
  const [stickyTextColor, setStickyTextColor] = useState('#111827');
  const [stickyFontFamily, setStickyFontFamily] = useState('Inter, system-ui, sans-serif');
  const [stickyFontSize, setStickyFontSize] = useState(24);
  const [coordinateUnitSize, setCoordinateUnitSize] = useState(40);
  const [coordinateShowGrid, setCoordinateShowGrid] = useState(true);
  const [coordinateShowTicks, setCoordinateShowTicks] = useState(true);
  const [coordinateShowLabels, setCoordinateShowLabels] = useState(true);
  const [coordinateGridColor, setCoordinateGridColor] = useState('#e5e7eb');
  const [coordinateAxisColor, setCoordinateAxisColor] = useState('#111827');
  const [coordinateLabelColor, setCoordinateLabelColor] = useState('#64748b');
  const [arrowDoubleEnded, setArrowDoubleEnded] = useState(false);
  const [stylePanelCollapsed, setStylePanelCollapsed] = useState(false);
  const [layerPanelCollapsed, setLayerPanelCollapsed] = useState(true);
  const getLegacyRoot = useCallback(() => legacyRootRef.current, []);

  // Sync a property value to the corresponding hidden input in the whiteboard's property storage
  const syncPropertyToInput = useCallback((controlName, value, isChecked) => {
    const root = getLegacyRoot();
    if (!root) return;
    const input = root.querySelector(`[data-control="${controlName}"]`);
    if (!input) return;
    if (input.type === 'checkbox') {
      input.checked = Boolean(isChecked ?? value);
    } else {
      input.value = String(value);
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, [getLegacyRoot]);

  // Wrapped setters that also sync to hidden inputs
  const setBrushColorSynced = useCallback((v) => { setBrushColor(v); syncPropertyToInput('color', v); }, [syncPropertyToInput]);
  const setBrushWidthSynced  = useCallback((v) => { setBrushWidth(v); syncPropertyToInput('width', v); }, [syncPropertyToInput]);
  const setBrushOpacitySynced = useCallback((v) => { setBrushOpacity(v); syncPropertyToInput('brush-opacity', v); }, [syncPropertyToInput]);
  const setBrushCapSynced    = useCallback((v) => { setBrushCap(v); syncPropertyToInput('brush-cap', v); }, [syncPropertyToInput]);
  const setBrushStyleSynced  = useCallback((v) => { setBrushStyle(v); syncPropertyToInput('brush-style', v); }, [syncPropertyToInput]);
  const setFillColorSynced   = useCallback((v) => { setFillColor(v); syncPropertyToInput('fill', v); }, [syncPropertyToInput]);
  const setFillTransparentSynced = useCallback((v) => { setFillTransparent(v); syncPropertyToInput('fill-transparent', null, v); }, [syncPropertyToInput]);
  const setTextColorSynced   = useCallback((v) => { setTextColor(v); syncPropertyToInput('color', v); }, [syncPropertyToInput]);
  const setFontSizeSynced    = useCallback((v) => { setFontSize(v); syncPropertyToInput('font-size', v); }, [syncPropertyToInput]);
  const setFontFamilySynced  = useCallback((v) => { setFontFamily(v); syncPropertyToInput('font-family', v); }, [syncPropertyToInput]);
  const setArrowDoubleEndedSynced = useCallback((v) => { setArrowDoubleEnded(v); syncPropertyToInput('arrow-double-ended', null, v); }, [syncPropertyToInput]);
  const setCoordinateUnitSizeSynced = useCallback((v) => { setCoordinateUnitSize(v); syncPropertyToInput('coordinate-unit-size', v); }, [syncPropertyToInput]);
  const setCoordinateShowGridSynced = useCallback((v) => { setCoordinateShowGrid(v); syncPropertyToInput('coordinate-show-grid', null, v); }, [syncPropertyToInput]);
  const setCoordinateShowTicksSynced = useCallback((v) => { setCoordinateShowTicks(v); syncPropertyToInput('coordinate-show-ticks', null, v); }, [syncPropertyToInput]);
  const setCoordinateShowLabelsSynced = useCallback((v) => { setCoordinateShowLabels(v); syncPropertyToInput('coordinate-show-labels', null, v); }, [syncPropertyToInput]);

  useEffect(() => {
    if (!legacyRootRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const legacyRoot = legacyRootRef.current;
    createWhiteboardApp(legacyRoot);

    // Hide original UI elements that React replaces
    const hideSelectors = [
      '.topbar', '.tool-dock',
      '.style-panel', '.layer-panel',
      '.context-menu',
      '.shape-popover', '.structure-panel',
      '.edge-panel-toggle-left', '.edge-panel-toggle-right',
    ];
    const applyHide = () => {
      hideSelectors.forEach((sel) => {
        const el = legacyRoot.querySelector(sel);
        if (el) el.style.display = 'none';
      });
      // Statusbar: hide visually but keep layout so zoom buttons/labels still work
      const statusbar = legacyRoot.querySelector('.statusbar');
      if (statusbar) {
        statusbar.style.opacity = '0';
        statusbar.style.pointerEvents = 'none';
      }
    };
    // Apply immediately and keep applying on DOM changes
    applyHide();
    const observer = new MutationObserver(() => applyHide());
    observer.observe(legacyRoot, { childList: true, subtree: true });

    // Sync state from whiteboard to React
    const syncState = () => {
      try {
        const zoomEl = legacyRoot.querySelector('[data-zoom]');
        if (zoomEl) {
          const text = zoomEl.textContent || '100%';
          const zoom = parseFloat(text) / 100 || 1;
          setCurrentZoom((prev) => (Math.abs(prev - zoom) > 0.001 ? zoom : prev));
        }
        const fileLabel = legacyRoot.querySelector('[data-file-name]');
        if (fileLabel) {
          const name = fileLabel.textContent || '未命名白板';
          setFileName((prev) => (prev !== name ? name : prev));
        }
        const styleTitle = legacyRoot.querySelector('[data-style-panel-title]');
        if (styleTitle) {
          const title = styleTitle.textContent || '属性';
          setStylePanelTitle((prev) => (prev !== title ? title : prev));
        }
        // Panel mode is set on root.dataset.panelMode by the whiteboard inspector controller
        const mode = legacyRoot.dataset.panelMode || 'hidden';
        setPanelMode((prev) => (prev !== mode ? mode : prev));
        const shape = legacyRoot.dataset.activeShape || 'rect';
        setActiveShape((prev) => (prev !== shape ? shape : prev));
        const structure = legacyRoot.dataset.structureSelection || 'none';
        setStructureSelection((prev) => (prev !== structure ? structure : prev));
        const container = legacyRoot.querySelector('#stage-container');
        if (container) {
          const bg = container.dataset.background || 'plain';
          setBackgroundModeState((prev) => (prev !== bg ? bg : prev));
          const tool = container.dataset.tool;
          if (tool) setCurrentTool((prev) => (prev !== tool ? tool : prev));
        }
        const layersData = legacyRoot._getLayersData?.();
        if (layersData) {
          setLayers((prev) => {
            if (prev.length !== layersData.length) return layersData;
            for (let i = 0; i < layersData.length; i++) {
              if (prev[i]?.id !== layersData[i].id || prev[i]?.name !== layersData[i].name) return layersData;
            }
            return prev;
          });
        }
        const selectedIds = legacyRoot._getSelectedIds?.();
        if (selectedIds) {
          setSelectedLayerIds((prev) => {
            if (prev.length !== selectedIds.length) return selectedIds;
            for (let i = 0; i < selectedIds.length; i++) {
              if (prev[i] !== selectedIds[i]) return selectedIds;
            }
            return prev;
          });
        }
        const statusEl = legacyRoot.querySelector('[data-status]');
        if (statusEl) {
          const msg = statusEl.textContent || '';
          if (msg !== lastStatusRef.current) {
            lastStatusRef.current = msg;
            setStatusMessage(msg);
            clearTimeout(statusClearTimerRef.current);
            if (msg !== '' && msg !== '就绪') {
              statusClearTimerRef.current = setTimeout(() => {
                lastStatusRef.current = msg;
                setStatusMessage('');
              }, 3000);
            }
          }
        }
      } catch (_) {}
    };
    const interval = setInterval(syncState, 100);

    // Context menu: listen for right-click on stage container
    const handleContextMenu = (e) => {
      const stageContainer = legacyRoot.querySelector('#stage-container');
      if (!stageContainer || !stageContainer.contains(e.target)) return;
      e.preventDefault();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setContextMenuVisible(true);
      contextMenuVisibleRef.current = true;
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // Click outside to close context menu (use ref to avoid stale closure)
    const handleClickOutside = () => {
      if (contextMenuVisibleRef.current) {
        setContextMenuVisible(false);
        contextMenuVisibleRef.current = false;
      }
    };
    document.addEventListener('click', handleClickOutside);

    const handleKeyDown = (e) => { shiftRef.current = e.shiftKey; ctrlRef.current = e.ctrlKey || e.metaKey; };
    const handleKeyUp = (e) => { shiftRef.current = e.shiftKey; ctrlRef.current = e.ctrlKey || e.metaKey; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      clearInterval(interval);
      clearTimeout(statusClearTimerRef.current);
      observer.disconnect();
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Bridge: trigger clicks on legacy DOM elements
  const runAction = useCallback((action) => {
    const root = getLegacyRoot();
    if (!root) return;
    const btn = root.querySelector(`[data-action="${action}"]`);
    if (btn) btn.click();
  }, [getLegacyRoot]);

  const setTool = useCallback((tool) => {
    const root = getLegacyRoot();
    if (!root) return;
    setCurrentTool(tool);
    if (tool !== 'shape') setShapePopoverVisible(false);
    if (tool !== 'structure') setStructurePanelVisible(false);
    const btn = root.querySelector(`[data-tool="${tool}"]`);
    if (btn) {
      btn.click();
      return;
    }
    const actionBtn = root.querySelector(`[data-tool-action="${tool}"]`);
    if (actionBtn) actionBtn.click();
  }, [getLegacyRoot]);

  const selectShape = useCallback((shapeTool) => {
    const root = getLegacyRoot();
    if (!root) return;
    const btn = root.querySelector(`[data-shape-tool="${shapeTool}"]`);
    if (btn) btn.click();
    setShapePopoverVisible(false);
  }, [getLegacyRoot]);

  const zoomBy = useCallback((dir) => {
    const root = getLegacyRoot();
    if (!root) return;
    const sel = dir < 0 ? '[data-zoom-out]' : '[data-zoom-in]';
    root.querySelector(sel)?.click();
  }, [getLegacyRoot]);

  const setZoomAtCenter = useCallback((level) => {
    const root = getLegacyRoot();
    if (!root) return;
    const btn = root.querySelector(`[data-zoom-level="${level}"]`);
    if (btn) btn.click();
  }, [getLegacyRoot]);

  const handleSetBackgroundMode = useCallback((mode) => {
    const root = getLegacyRoot();
    if (!root) return;
    setBackgroundModeState(mode);
    const btn = root.querySelector(`[data-background-mode="${mode}"]`);
    if (btn) btn.click();
  }, [getLegacyRoot]);

  const runContextAction = useCallback((action) => {
    const root = getLegacyRoot();
    if (!root) return;
    const btn = root.querySelector(`[data-context-action="${action}"]`);
    if (btn) btn.click();
  }, [getLegacyRoot]);

  const hideContextMenu = useCallback(() => {
    setContextMenuVisible(false);
    contextMenuVisibleRef.current = false;
  }, []);

  const selectLayerItem = useCallback((id) => {
    const root = getLegacyRoot();
    if (!root) return;
    const modifier = shiftRef.current ? 'shift' : (ctrlRef.current ? 'ctrl' : 'none');
    root._selectLayerItemById?.(id, modifier);
  }, [getLegacyRoot]);

  const zoomPercent = Math.round(currentZoom * 100);

  const contextValue = useMemo(() => ({
    statusMessage, fileName, currentTool, currentZoom, zoomPercent,
    backgroundMode, stylePanelCollapsed, stylePanelTitle, panelMode, activeShape,
    layerPanelCollapsed, layers, structureSelection, shapePopoverVisible, structurePanelVisible,
    contextMenuVisible, contextMenuPos,
    brushColor, brushWidth, brushOpacity, brushCap, brushStyle,
    fillColor, fillTransparent, textColor, fontFamily, fontSize,
    textBold, textItalic, textUnderline, textStrike,
    stickyBgColor, stickyTextColor, stickyFontFamily, stickyFontSize,
    coordinateUnitSize, coordinateShowGrid, coordinateShowTicks, coordinateShowLabels,
    coordinateGridColor, coordinateAxisColor, coordinateLabelColor, arrowDoubleEnded,
    selectedLayerIds,
    runAction, setTool, zoomBy, setZoomAtCenter,
    runContextAction, hideContextMenu, selectLayerItem,
    selectShape,
    setBackgroundMode: handleSetBackgroundMode,
    setStylePanelCollapsed, setLayerPanelCollapsed,
    setBrushColor: setBrushColorSynced, setBrushWidth: setBrushWidthSynced,
    setBrushOpacity: setBrushOpacitySynced, setBrushCap: setBrushCapSynced, setBrushStyle: setBrushStyleSynced,
    setFillColor: setFillColorSynced, setFillTransparent: setFillTransparentSynced,
    setTextColor: setTextColorSynced, setFontFamily: setFontFamilySynced, setFontSize: setFontSizeSynced,
    setArrowDoubleEnded: setArrowDoubleEndedSynced,
    setTextStyle: (s) => {
      if (s === 'bold') setTextBold(b => !b);
      if (s === 'italic') setTextItalic(i => !i);
      if (s === 'underline') setTextUnderline(u => !u);
      if (s === 'strike') setTextStrike(s => !s);
    },
    setStickyBgColor, setStickyTextColor, setStickyFontFamily, setStickyFontSize,
    setCoordinateUnitSize: setCoordinateUnitSizeSynced,
    setCoordinateShowGrid: setCoordinateShowGridSynced,
    setCoordinateShowTicks: setCoordinateShowTicksSynced,
    setCoordinateShowLabels: setCoordinateShowLabelsSynced,
    setCoordinateGridColor, setCoordinateAxisColor, setCoordinateLabelColor,
    setShapePopoverVisible, setStructurePanelVisible,
  }), [
    statusMessage, fileName, currentTool, currentZoom, zoomPercent,
    backgroundMode, stylePanelCollapsed, stylePanelTitle, panelMode, activeShape,
    layerPanelCollapsed, layers, structureSelection, shapePopoverVisible, structurePanelVisible,
    contextMenuVisible, contextMenuPos,
    brushColor, brushWidth, brushOpacity, brushCap, brushStyle,
    fillColor, fillTransparent, textColor, fontFamily, fontSize,
    textBold, textItalic, textUnderline, textStrike,
    stickyBgColor, stickyTextColor, stickyFontFamily, stickyFontSize,
    coordinateUnitSize, coordinateShowGrid, coordinateShowTicks, coordinateShowLabels,
    coordinateGridColor, coordinateAxisColor, coordinateLabelColor, arrowDoubleEnded,
    selectedLayerIds,
    runAction, setTool, zoomBy, setZoomAtCenter,
    runContextAction, hideContextMenu, selectLayerItem,
    selectShape,
    handleSetBackgroundMode,
    setStylePanelCollapsed, setLayerPanelCollapsed,
    setBrushColorSynced, setBrushWidthSynced, setBrushOpacitySynced, setBrushCapSynced, setBrushStyleSynced,
    setFillColorSynced, setFillTransparentSynced, setTextColorSynced, setFontFamilySynced, setFontSizeSynced,
    setArrowDoubleEndedSynced,
    setCoordinateUnitSizeSynced, setCoordinateShowGridSynced, setCoordinateShowTicksSynced, setCoordinateShowLabelsSynced,
  ]);

  return (
    <WhiteboardContext.Provider value={contextValue}>
      <div className="app-shell">
        <Topbar />
        <StylePanel />
        <StylePanelToggle collapsed={stylePanelCollapsed} onClick={() => setStylePanelCollapsed(false)} />
        <LayerPanel />
        <LayerPanelToggle collapsed={layerPanelCollapsed} onClick={() => setLayerPanelCollapsed(false)} />
        <div ref={legacyRootRef} style={{ position: 'fixed', inset: 0, zIndex: 'auto', overflow: 'hidden' }} />
        <ToolDock />
        <StructurePanel />
        <StatusBar />
        <ContextMenu />
      </div>
    </WhiteboardContext.Provider>
  );
}
