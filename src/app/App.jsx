import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { WhiteboardContext } from './WhiteboardContext';
import { createWhiteboardApp } from './whiteboard-app.js';
import { TOOLS } from '../ui/config.js';
import { isNativeTextEditingTarget } from '../tools/interaction-rules.js';
import {
  getWhiteboardContextMenuRequest,
  getContextMenuPosition,
  getContextMenuScope,
} from './context-menu/controller.js';
import Topbar from './components/Topbar';
import ToolDock from './components/ToolDock';
import StatusBar from './components/StatusBar';
import StylePanel from './components/StylePanel';
import LayerPanel from './components/LayerPanel';
import { LayerPanelToggle } from './components/LayerPanel';
import ContextMenu from './components/ContextMenu';
import StructurePanel from './components/StructurePanel';

const TOOL_IDS = new Set(Object.values(TOOLS));
const ZOOM_STEP = 1.25;

export default function App() {
  const appShellRef = useRef(null);
  const legacyRootRef = useRef(null);
  const legacyAppRef = useRef(null);

  const initializedRef = useRef(false);
  const contextMenuVisibleRef = useRef(false);
  const statusClearTimerRef = useRef(null);
  const lastStatusRef = useRef('就绪');
  const shiftRef = useRef(false);
  const ctrlRef = useRef(false);

  const [statusMessage, setStatusMessage] = useState('就绪');
  const [fileName, setFileName] = useState('未命名白板');
  const [currentTool, setCurrentTool] = useState(TOOLS.PEN);
  const [keepToolActive, setKeepToolActive] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [backgroundMode, setBackgroundModeState] = useState('plain');
  const [stylePanelTitle, setStylePanelTitle] = useState('属性');
  const [panelMode, setPanelMode] = useState('hidden');
  const [activeShape, setActiveShape] = useState('rect');
  const [layers, setLayers] = useState([]);
  const [selectedLayerIds, setSelectedLayerIds] = useState([]);
  const [structureSelection, setStructureSelection] = useState('none');
  const [graphDirected, setGraphDirected] = useState(false);
  const [shapePopoverVisible, setShapePopoverVisible] = useState(false);
  const [structurePanelVisible, setStructurePanelVisible] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuDisabledActions, setContextMenuDisabledActions] = useState({});
  const [contextMenuScope, setContextMenuScope] = useState('object');
  const [selectionCaps, setSelectionCaps] = useState({});

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
  const syncPropertyToInput = useCallback((controlName, value, isChecked, { dispatch = true } = {}) => {
    const root = getLegacyRoot();
    if (!root) return;
    const input = root.querySelector(`[data-control="${controlName}"]`);
    if (!input) return;
    if (input.type === 'checkbox') {
      input.checked = Boolean(isChecked ?? value);
    } else {
      input.value = String(value);
    }
    if (!dispatch) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, [getLegacyRoot]);

  // Wrapped setters that also sync to hidden inputs
  const setBrushColorSynced = useCallback((v) => { setBrushColor(v); syncPropertyToInput('color', v); }, [syncPropertyToInput]);
  const setBrushWidthSynced  = useCallback((v) => { setBrushWidth(v); syncPropertyToInput('width', v); }, [syncPropertyToInput]);
  const setBrushOpacitySynced = useCallback((v) => { setBrushOpacity(v); syncPropertyToInput('brush-opacity', v); }, [syncPropertyToInput]);
  const setBrushCapSynced    = useCallback((v) => { setBrushCap(v); syncPropertyToInput('brush-cap', v); }, [syncPropertyToInput]);
  const setBrushStyleSynced  = useCallback((v) => { setBrushStyle(v); syncPropertyToInput('brush-style', v); }, [syncPropertyToInput]);
  const setFillColorSynced   = useCallback((v) => {
    setFillColor(v);
    setFillTransparent(false);
    syncPropertyToInput('fill-transparent', null, false, { dispatch: false });
    syncPropertyToInput('fill', v);
  }, [syncPropertyToInput]);
  const setFillTransparentSynced = useCallback((v) => { setFillTransparent(v); syncPropertyToInput('fill-transparent', null, v); }, [syncPropertyToInput]);
  const setTextColorSynced   = useCallback((v) => { setTextColor(v); syncPropertyToInput('color', v); }, [syncPropertyToInput]);
  const setFontSizeSynced    = useCallback((v) => { setFontSize(v); syncPropertyToInput('font-size', v); }, [syncPropertyToInput]);
  const setFontFamilySynced  = useCallback((v) => { setFontFamily(v); syncPropertyToInput('font-family', v); }, [syncPropertyToInput]);
  const setArrowDoubleEndedSynced = useCallback((v) => { setArrowDoubleEnded(v); syncPropertyToInput('arrow-double-ended', null, v); }, [syncPropertyToInput]);
  const setStickyBgColorSynced = useCallback((v) => {
    setStickyBgColor(v);
    setFillTransparent(false);
    syncPropertyToInput('fill-transparent', null, false, { dispatch: false });
    syncPropertyToInput('fill', v);
  }, [syncPropertyToInput]);
  const setStickyTextColorSynced = useCallback((v) => { setStickyTextColor(v); syncPropertyToInput('color', v); }, [syncPropertyToInput]);
  const setStickyFontFamilySynced = useCallback((v) => { setStickyFontFamily(v); syncPropertyToInput('font-family', v); }, [syncPropertyToInput]);
  const setStickyFontSizeSynced = useCallback((v) => { setStickyFontSize(v); syncPropertyToInput('font-size', v); }, [syncPropertyToInput]);
  const setCoordinateUnitSizeSynced = useCallback((v) => { setCoordinateUnitSize(v); syncPropertyToInput('coordinate-unit-size', v); }, [syncPropertyToInput]);
  const setCoordinateShowGridSynced = useCallback((v) => { setCoordinateShowGrid(v); syncPropertyToInput('coordinate-show-grid', null, v); }, [syncPropertyToInput]);
  const setCoordinateShowTicksSynced = useCallback((v) => { setCoordinateShowTicks(v); syncPropertyToInput('coordinate-show-ticks', null, v); }, [syncPropertyToInput]);
  const setCoordinateShowLabelsSynced = useCallback((v) => { setCoordinateShowLabels(v); syncPropertyToInput('coordinate-show-labels', null, v); }, [syncPropertyToInput]);
  const setCoordinateGridColorSynced = useCallback((v) => { setCoordinateGridColor(v); syncPropertyToInput('coordinate-grid-color', v); }, [syncPropertyToInput]);
  const setCoordinateAxisColorSynced = useCallback((v) => { setCoordinateAxisColor(v); syncPropertyToInput('coordinate-axis-color', v); }, [syncPropertyToInput]);
  const setCoordinateLabelColorSynced = useCallback((v) => { setCoordinateLabelColor(v); syncPropertyToInput('coordinate-label-color', v); }, [syncPropertyToInput]);
  const setTextStyleSynced = useCallback((style) => {
    const root = getLegacyRoot();
    root?.querySelector(`[data-text-style="${style}"]`)?.click();
    if (style === 'bold') setTextBold(b => !b);
    if (style === 'italic') setTextItalic(i => !i);
    if (style === 'underline') setTextUnderline(u => !u);
    if (style === 'strike') setTextStrike(s => !s);
  }, [getLegacyRoot]);

  useEffect(() => {
    if (!legacyRootRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const legacyRoot = legacyRootRef.current;
    const legacyApp = createWhiteboardApp(legacyRoot);
    legacyAppRef.current = legacyApp;

    // 被 React 取代的遗留 chrome 由 styles.css 的 .legacy-chrome-hidden 规则隐藏。
    // 这些容器是 shell 模板一次性生成的,不会重建,所以不需要 MutationObserver 反复补隐藏。
    legacyRoot.classList.add('legacy-chrome-hidden');

    // Sync state from whiteboard to React
    const syncState = () => {
      try {
        const readControl = (name) => legacyRoot.querySelector(`[data-control="${name}"]`);
        const syncStringState = (setter, value) => {
          if (value === undefined || value === null) return;
          setter((prev) => (prev !== value ? value : prev));
        };
        const syncNumberState = (setter, value) => {
          const next = Number(value);
          if (!Number.isFinite(next)) return;
          setter((prev) => (prev !== next ? next : prev));
        };
        const syncBooleanState = (setter, value) => {
          setter((prev) => (prev !== value ? value : prev));
        };
        const isTextStyleActive = (style) => {
          const button = legacyRoot.querySelector(`[data-text-style="${style}"]`);
          return Boolean(button?.classList?.contains("active") || button?.getAttribute?.("aria-pressed") === "true");
        };

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
        const caps = {
          text: legacyRoot.dataset.selectionHasText === 'true',
          sticky: legacyRoot.dataset.selectionHasSticky === 'true',
          drawing: legacyRoot.dataset.selectionHasDrawing === 'true',
          stroke: legacyRoot.dataset.selectionHasStroke === 'true',
          fillShape: legacyRoot.dataset.selectionHasFillShape === 'true',
          arrow: legacyRoot.dataset.selectionHasArrow === 'true',
          coordinate: legacyRoot.dataset.selectionHasCoordinate === 'true',
        };
        setSelectionCaps((prev) => {
          const keys = Object.keys(caps);
          for (const k of keys) { if (prev[k] !== caps[k]) return caps; }
          for (const k of Object.keys(prev)) { if (caps[k] === undefined) return caps; }
          return prev;
        });
        const colorInput = readControl("color");
        if (colorInput) {
          const nextColor = colorInput.value || '#111827';
          syncStringState(setBrushColor, nextColor);
          syncStringState(setTextColor, nextColor);
          syncStringState(setStickyTextColor, nextColor);
        }
        const widthInput = readControl("width");
        if (widthInput) syncNumberState(setBrushWidth, widthInput.value);
        const brushOpacityInput = readControl("brush-opacity");
        if (brushOpacityInput) syncNumberState(setBrushOpacity, brushOpacityInput.value);
        const brushCapInput = readControl("brush-cap");
        if (brushCapInput) syncStringState(setBrushCap, brushCapInput.value || 'round');
        const brushStyleInput = readControl("brush-style");
        if (brushStyleInput) syncStringState(setBrushStyle, brushStyleInput.value || 'solid');
        const arrowDoubleEndedInput = readControl("arrow-double-ended");
        if (arrowDoubleEndedInput) syncBooleanState(setArrowDoubleEnded, Boolean(arrowDoubleEndedInput.checked));
        const fillInput = readControl("fill");
        if (fillInput) {
          const nextFillColor = fillInput.value || '#ffffff';
          syncStringState(setFillColor, nextFillColor);
          syncStringState(setStickyBgColor, nextFillColor);
        }
        const fillTransparentInput = readControl("fill-transparent");
        if (fillTransparentInput) syncBooleanState(setFillTransparent, Boolean(fillTransparentInput.checked));
        const fontFamilyInput = readControl("font-family");
        if (fontFamilyInput) {
          const nextFontFamily = fontFamilyInput.value || 'Inter, system-ui, sans-serif';
          syncStringState(setFontFamily, nextFontFamily);
          syncStringState(setStickyFontFamily, nextFontFamily);
        }
        const fontSizeInput = readControl("font-size");
        if (fontSizeInput) {
          syncNumberState(setFontSize, fontSizeInput.value);
          syncNumberState(setStickyFontSize, fontSizeInput.value);
        }
        const coordinateUnitSizeInput = readControl("coordinate-unit-size");
        if (coordinateUnitSizeInput) syncNumberState(setCoordinateUnitSize, coordinateUnitSizeInput.value);
        const coordinateShowGridInput = readControl("coordinate-show-grid");
        if (coordinateShowGridInput) syncBooleanState(setCoordinateShowGrid, Boolean(coordinateShowGridInput.checked));
        const coordinateShowTicksInput = readControl("coordinate-show-ticks");
        if (coordinateShowTicksInput) syncBooleanState(setCoordinateShowTicks, Boolean(coordinateShowTicksInput.checked));
        const coordinateShowLabelsInput = readControl("coordinate-show-labels");
        if (coordinateShowLabelsInput) syncBooleanState(setCoordinateShowLabels, Boolean(coordinateShowLabelsInput.checked));
        const coordinateGridColorInput = readControl("coordinate-grid-color");
        if (coordinateGridColorInput) syncStringState(setCoordinateGridColor, coordinateGridColorInput.value || '#e5e7eb');
        const coordinateAxisColorInput = readControl("coordinate-axis-color");
        if (coordinateAxisColorInput) syncStringState(setCoordinateAxisColor, coordinateAxisColorInput.value || '#111827');
        const coordinateLabelColorInput = readControl("coordinate-label-color");
        if (coordinateLabelColorInput) syncStringState(setCoordinateLabelColor, coordinateLabelColorInput.value || '#64748b');
        syncBooleanState(setTextBold, isTextStyleActive("bold"));
        syncBooleanState(setTextItalic, isTextStyleActive("italic"));
        syncBooleanState(setTextUnderline, isTextStyleActive("underline"));
        syncBooleanState(setTextStrike, isTextStyleActive("strike"));
        const structure = legacyRoot.dataset.structureSelection || 'none';
        setStructureSelection((prev) => (prev !== structure ? structure : prev));
        const directed = legacyRoot.dataset.graphDirected === 'true';
        setGraphDirected((prev) => (prev !== directed ? directed : prev));
        const nextKeepToolActive = legacyRoot.dataset.keepToolActive === 'true';
        setKeepToolActive((prev) => (prev !== nextKeepToolActive ? nextKeepToolActive : prev));
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
              const prevLayer = prev[i];
              const nextLayer = layersData[i];
              if (
                prevLayer?.id !== nextLayer.id
                || prevLayer?.name !== nextLayer.name
                || prevLayer?.level !== nextLayer.level
                || prevLayer?.type !== nextLayer.type
                || Boolean(prevLayer?.locked) !== Boolean(nextLayer.locked)
                || (prevLayer?.groupId ?? null) !== (nextLayer.groupId ?? null)
              ) return layersData;
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

    const readContextMenuDisabledActions = (options) => legacyRoot._getContextMenuActionStates?.(options) ?? {};

    // Context menu: block browser-native menus inside the whiteboard and route by context.
    const handleContextMenu = (e) => {
      const stageContainer = legacyRoot.querySelector('#stage-container');
      const request = getWhiteboardContextMenuRequest({
        target: e.target,
        appRoot: appShellRef.current,
        legacyRoot,
        stageContainer,
        isNativeTextEditingTarget,
      });
      if (request.type === 'outside' || request.type === 'input') return;
      e.preventDefault();
      if (request.type === 'menu') return;

      if (request.type !== 'canvas') {
        legacyRoot._commitActiveTextEditor?.();
        setContextMenuVisible(false);
        contextMenuVisibleRef.current = false;
        return;
      }

      const targetId = legacyRoot._getLastContextMenuTargetId?.() ?? null;
      setContextMenuScope(getContextMenuScope({ targetId }));
      setContextMenuDisabledActions(readContextMenuDisabledActions({ targetId }));
      const pos = getContextMenuPosition({
        clientX: e.clientX, clientY: e.clientY,
        menuBox: { width: 168, height: 478 },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
      setContextMenuPos({ x: pos.left, y: pos.top });
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
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      legacyApp?.destroy?.();
    };
  }, []);

  // Bridge: 直接调引擎命令,不经过遗留 DOM
  const getCommands = useCallback(() => legacyAppRef.current?.commands, []);

  const runAction = useCallback((action) => {
    getCommands()?.runAction(action);
  }, [getCommands]);

  const setTool = useCallback((tool) => {
    const commands = getCommands();
    if (!commands) return;
    setCurrentTool(tool);
    if (tool !== 'shape') setShapePopoverVisible(false);
    if (tool !== 'structure') setStructurePanelVisible(false);
    // 工具栏里 import-image / toggle-tool-lock 不是工具而是动作
    if (TOOL_IDS.has(tool)) commands.setTool(tool);
    else commands.runToolAction(tool);
  }, [getCommands]);

  const toggleKeepToolActive = useCallback(() => {
    const root = getLegacyRoot();
    getCommands()?.runToolAction('toggle-tool-lock');
    setKeepToolActive(root?.dataset.keepToolActive === 'true');
  }, [getCommands, getLegacyRoot]);

  const selectShape = useCallback((shapeTool) => {
    getCommands()?.selectShapeTool(shapeTool);
    setShapePopoverVisible(false);
  }, [getCommands]);

  const zoomBy = useCallback((dir) => {
    getCommands()?.zoomBy(dir < 0 ? 1 / ZOOM_STEP : ZOOM_STEP);
  }, [getCommands]);

  const setZoomAtCenter = useCallback((level) => {
    getCommands()?.setZoomAtCenter(level);
  }, [getCommands]);

  const handleSetBackgroundMode = useCallback((mode) => {
    setBackgroundModeState(mode);
    getCommands()?.setBackgroundMode(mode);
  }, [getCommands]);

  const runContextAction = useCallback((action) => {
    getCommands()?.runContextAction(action);
  }, [getCommands]);

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

  const openLayerItemContextMenu = useCallback((id, point) => {
    const root = getLegacyRoot();
    if (!root) return;
    root._commitActiveTextEditor?.();
    const selectedIds = root._getSelectedIds?.() ?? [];
    if (!selectedIds.includes(id)) {
      root._selectLayerItemById?.(id, 'none');
    }
    setContextMenuScope('object');
    setContextMenuDisabledActions(root._getContextMenuActionStates?.({ targetId: id }) ?? {});
    const position = getContextMenuPosition({
      clientX: point?.clientX ?? 0,
      clientY: point?.clientY ?? 0,
      menuBox: { width: 168, height: 478 },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
    setContextMenuPos({ x: position.left, y: position.top });
    setContextMenuVisible(true);
    contextMenuVisibleRef.current = true;
  }, [getLegacyRoot]);

  const zoomPercent = Math.round(currentZoom * 100);

  const contextValue = useMemo(() => ({
    statusMessage, fileName, currentTool, keepToolActive, currentZoom, zoomPercent,
    backgroundMode, stylePanelCollapsed, stylePanelTitle, panelMode, activeShape,
    layerPanelCollapsed, layers, structureSelection, shapePopoverVisible, structurePanelVisible,
    graphDirected,
    contextMenuVisible, contextMenuPos, contextMenuScope,
    contextMenuDisabledActions, selectionCaps,
    brushColor, brushWidth, brushOpacity, brushCap, brushStyle,
    fillColor, fillTransparent, textColor, fontFamily, fontSize,
    textBold, textItalic, textUnderline, textStrike,
    stickyBgColor, stickyTextColor, stickyFontFamily, stickyFontSize,
    coordinateUnitSize, coordinateShowGrid, coordinateShowTicks, coordinateShowLabels,
    coordinateGridColor, coordinateAxisColor, coordinateLabelColor, arrowDoubleEnded,
    selectedLayerIds,
    runAction, setTool, toggleKeepToolActive, zoomBy, setZoomAtCenter,
    runContextAction, hideContextMenu, selectLayerItem,
    openLayerItemContextMenu,
    selectShape,
    setBackgroundMode: handleSetBackgroundMode,
    setStylePanelCollapsed, setLayerPanelCollapsed,
    setBrushColor: setBrushColorSynced, setBrushWidth: setBrushWidthSynced,
    setBrushOpacity: setBrushOpacitySynced, setBrushCap: setBrushCapSynced, setBrushStyle: setBrushStyleSynced,
    setFillColor: setFillColorSynced, setFillTransparent: setFillTransparentSynced,
    setTextColor: setTextColorSynced, setFontFamily: setFontFamilySynced, setFontSize: setFontSizeSynced,
    setArrowDoubleEnded: setArrowDoubleEndedSynced,
    setTextStyle: setTextStyleSynced,
    setStickyBgColor: setStickyBgColorSynced,
    setStickyTextColor: setStickyTextColorSynced,
    setStickyFontFamily: setStickyFontFamilySynced,
    setStickyFontSize: setStickyFontSizeSynced,
    setCoordinateUnitSize: setCoordinateUnitSizeSynced,
    setCoordinateShowGrid: setCoordinateShowGridSynced,
    setCoordinateShowTicks: setCoordinateShowTicksSynced,
    setCoordinateShowLabels: setCoordinateShowLabelsSynced,
    setCoordinateGridColor: setCoordinateGridColorSynced,
    setCoordinateAxisColor: setCoordinateAxisColorSynced,
    setCoordinateLabelColor: setCoordinateLabelColorSynced,
    setShapePopoverVisible, setStructurePanelVisible,
  }), [
    statusMessage, fileName, currentTool, keepToolActive, currentZoom, zoomPercent,
    backgroundMode, stylePanelCollapsed, stylePanelTitle, panelMode, activeShape,
    layerPanelCollapsed, layers, structureSelection, shapePopoverVisible, structurePanelVisible,
    graphDirected,
    contextMenuVisible, contextMenuPos, contextMenuScope,
    contextMenuDisabledActions, selectionCaps,
    brushColor, brushWidth, brushOpacity, brushCap, brushStyle,
    fillColor, fillTransparent, textColor, fontFamily, fontSize,
    textBold, textItalic, textUnderline, textStrike,
    stickyBgColor, stickyTextColor, stickyFontFamily, stickyFontSize,
    coordinateUnitSize, coordinateShowGrid, coordinateShowTicks, coordinateShowLabels,
    coordinateGridColor, coordinateAxisColor, coordinateLabelColor, arrowDoubleEnded,
    selectedLayerIds,
    runAction, setTool, toggleKeepToolActive, zoomBy, setZoomAtCenter,
    runContextAction, hideContextMenu, selectLayerItem,
    openLayerItemContextMenu,
    selectShape,
    handleSetBackgroundMode,
    setStylePanelCollapsed, setLayerPanelCollapsed,
    setBrushColorSynced, setBrushWidthSynced, setBrushOpacitySynced, setBrushCapSynced, setBrushStyleSynced,
    setFillColorSynced, setFillTransparentSynced, setTextColorSynced, setFontFamilySynced, setFontSizeSynced,
    setArrowDoubleEndedSynced,
    setStickyBgColorSynced, setStickyTextColorSynced, setStickyFontFamilySynced, setStickyFontSizeSynced,
    setTextStyleSynced,
    setCoordinateUnitSizeSynced, setCoordinateShowGridSynced, setCoordinateShowTicksSynced, setCoordinateShowLabelsSynced,
    setCoordinateGridColorSynced, setCoordinateAxisColorSynced, setCoordinateLabelColorSynced,
  ]);

  return (
    <WhiteboardContext.Provider value={contextValue}>
      <div className="app-shell" ref={appShellRef}>
        <Topbar />
        <StylePanel />
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
