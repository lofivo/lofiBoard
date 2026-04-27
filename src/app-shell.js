import {
  BACKGROUND_ICON,
  ZOOM_IN_ICON,
  ZOOM_OUT_ICON,
  contextMenuMarkup,
  MENU_ICON,
  PANEL_ICON,
  icon,
  menuItemsMarkup,
  shapePopoverMarkup,
  toolButtonsMarkup,
  zoomMenuMarkup,
} from "./ui-config.js";

export function renderShell() {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-menu">
          <button type="button" class="board-trigger" data-menu-trigger aria-haspopup="true" aria-expanded="false">
            <span class="brand-mark"></span>
            <span class="board-title">
              <strong>lofiBoard</strong>
              <span data-file-name>未命名白板</span>
            </span>
            <span class="menu-chevron">${icon(MENU_ICON)}</span>
          </button>
          <div class="main-menu" data-main-menu hidden>
            <div class="menu-section">
              ${menuItemsMarkup()}
            </div>
            <div class="menu-section">
              <div class="menu-heading">${icon(BACKGROUND_ICON)}<span>画布背景</span></div>
              <div class="segmented-control" role="group" aria-label="画布背景">
                <button type="button" data-background-mode="dots">点阵</button>
                <button type="button" data-background-mode="plain">纯白</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <aside class="style-panel" data-style-panel aria-label="属性">
        <div class="panel-title">${icon(PANEL_ICON)}<span>属性</span></div>
        <label class="control-line">
          线条
          <input data-control="color" type="color" value="#111827" />
        </label>
        <label class="control-fill">
          填充
          <input data-control="fill" type="color" value="#ffffff" />
        </label>
        <label class="control-fill-transparent">
          <input data-control="fill-transparent" type="checkbox" checked />
          透明填充
        </label>
        <label class="control-width">
          粗细
          <input data-control="width" type="range" min="1" max="28" value="6" />
        </label>
        <label class="control-font">
          字号
          <input data-control="font-size" type="range" min="12" max="96" value="28" />
        </label>
        <div class="quick-actions">
          <button type="button" data-action="bring-front">置顶</button>
          <button type="button" data-action="send-back">置底</button>
          <button type="button" data-action="delete-selection">删除</button>
        </div>
      </aside>

      <main id="stage-container" class="stage-container"></main>

      <div class="shape-popover" data-shape-popover hidden>
        ${shapePopoverMarkup()}
      </div>

      <div class="context-menu" data-context-menu hidden>
        ${contextMenuMarkup()}
      </div>

      <nav class="tool-dock" aria-label="白板工具">
        ${toolButtonsMarkup()}
      </nav>

      <footer class="statusbar">
        <span data-status>就绪</span>
        <div class="zoom-controls" aria-label="缩放控制">
          <button type="button" class="zoom-step" data-zoom-out title="缩小" aria-label="缩小">
            ${icon(ZOOM_OUT_ICON)}
          </button>
          <button type="button" class="zoom-trigger" data-zoom data-zoom-trigger aria-haspopup="true" aria-expanded="false">
            100%
          </button>
          <button type="button" class="zoom-step" data-zoom-in title="放大" aria-label="放大">
            ${icon(ZOOM_IN_ICON)}
          </button>
          <div class="zoom-menu" data-zoom-menu hidden>
            ${zoomMenuMarkup()}
          </div>
        </div>
      </footer>
    </div>
  `;
}
