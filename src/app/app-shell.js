import {
  BACKGROUND_ICON,
  ZOOM_IN_ICON,
  ZOOM_OUT_ICON,
  contextMenuMarkup,
  MENU_ICON,
  PANEL_ICON,
  TEXT_FORMAT_ICONS,
  icon,
  menuItemsMarkup,
  shapePopoverMarkup,
  structurePanelMarkup,
  toolButtonsMarkup,
  zoomMenuMarkup,
} from "../ui/ui-config.js";

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
        <div class="panel-title">
          ${icon(PANEL_ICON)}<span>属性</span>
          <button type="button" class="panel-toggle" data-panel-toggle="style" title="收起/展开属性" aria-label="收起/展开属性">‹</button>
        </div>
        <label class="control-line">
          颜色
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
        <label class="control-brush-opacity">
          不透明度
          <input data-control="brush-opacity" type="range" min="10" max="100" value="100" />
        </label>
        <label class="control-brush-smoothing">
          平滑
          <input data-control="brush-smoothing" type="range" min="0" max="100" value="45" />
        </label>
        <label class="control-brush-cap">
          笔头
          <select data-control="brush-cap">
            <option value="round">圆头</option>
            <option value="square">方头</option>
          </select>
        </label>
        <label class="control-brush-style">
          线型
          <select data-control="brush-style">
            <option value="solid">实线</option>
            <option value="dash">虚线</option>
            <option value="dot">点线</option>
          </select>
        </label>
        <label class="control-font">
          字号
          <input data-control="font-size" type="range" min="12" max="96" value="28" />
        </label>
        <label class="control-font-family">
          字体
          <select data-control="font-family">
            <option value="Inter, system-ui, sans-serif">Inter</option>
            <option value="Arial, Helvetica, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Times New Roman', Times, serif">Times</option>
            <option value="'Courier New', Courier, monospace">Courier</option>
            <option value="'Noto Sans SC', 'Microsoft YaHei', sans-serif">中文黑体</option>
          </select>
        </label>
        <div class="control-text-format" role="group" aria-label="文字样式">
          <button type="button" data-text-style="bold" title="加粗" aria-label="加粗">${icon(TEXT_FORMAT_ICONS.bold)}</button>
          <button type="button" data-text-style="italic" title="斜体" aria-label="斜体">${icon(TEXT_FORMAT_ICONS.italic)}</button>
          <button type="button" data-text-style="underline" title="下划线" aria-label="下划线">${icon(TEXT_FORMAT_ICONS.underline)}</button>
          <button type="button" data-text-style="strike" title="删除线" aria-label="删除线">${icon(TEXT_FORMAT_ICONS.strike)}</button>
        </div>
        <div class="quick-actions">
          <button type="button" data-action="array-insert-start">数组前插</button>
          <button type="button" data-action="array-insert-end">数组后插</button>
          <button type="button" data-action="array-insert-at">指定插入</button>
          <button type="button" data-action="array-delete-at">指定删除</button>
          <button type="button" data-action="array-set-value">修改元素</button>
          <button type="button" data-action="array-swap">交换元素</button>
          <button type="button" data-action="array-move">移动元素</button>
          <button type="button" data-action="array-highlight">数组高亮</button>
          <button type="button" data-action="array-clear-highlight">清除高亮</button>
          <button type="button" data-action="array-mode-array">数组模式</button>
          <button type="button" data-action="array-mode-stack">栈模式</button>
          <button type="button" data-action="array-mode-queue">队列模式</button>
          <button type="button" data-action="array-mode-deque">双端队列</button>
          <button type="button" data-action="array-delete-end">删末项</button>
          <button type="button" data-action="array-reload">数组重载</button>
          <button type="button" data-action="graph-add-node">加点</button>
          <button type="button" data-action="graph-add-edge">连边</button>
          <button type="button" data-action="graph-connect-mode">点选连边</button>
          <button type="button" data-action="graph-add-edge-input">输入连边</button>
          <button type="button" data-action="graph-delete-node">删点</button>
          <button type="button" data-action="graph-delete-edge">删边</button>
          <button type="button" data-action="graph-edit-edge">改边</button>
          <button type="button" data-action="graph-directed-on">默认有向</button>
          <button type="button" data-action="graph-directed-off">默认无向</button>
          <button type="button" data-action="graph-highlight">图高亮</button>
          <button type="button" data-action="graph-clear-highlight">清高亮</button>
          <button type="button" data-action="graph-layout-circle">环形布局</button>
          <button type="button" data-action="graph-layout-grid">网格布局</button>
          <button type="button" data-action="graph-layout-layered">分层布局</button>
          <button type="button" data-action="graph-layout-force">力导向</button>
          <button type="button" data-action="graph-export-edge-list">导出边表</button>
          <button type="button" data-action="graph-export-adjacency-list">导出邻接表</button>
          <button type="button" data-action="graph-export-adjacency-matrix">导出矩阵</button>
          <button type="button" data-action="graph-import-adjacency-list">导入邻接表</button>
          <button type="button" data-action="graph-import-adjacency-matrix">导入矩阵</button>
          <button type="button" data-action="graph-reload">图重载</button>
          <button type="button" data-action="tree-add-node">树加点</button>
          <button type="button" data-action="tree-add-left">加左儿子</button>
          <button type="button" data-action="tree-add-right">加右儿子</button>
          <button type="button" data-action="tree-set-value">改节点值</button>
          <button type="button" data-action="tree-delete-subtree">删子树</button>
          <button type="button" data-action="tree-highlight-level">层序高亮</button>
          <button type="button" data-action="tree-highlight-preorder">前序高亮</button>
          <button type="button" data-action="tree-highlight-inorder">中序高亮</button>
          <button type="button" data-action="tree-highlight-postorder">后序高亮</button>
          <button type="button" data-action="tree-step-next">遍历下一步</button>
          <button type="button" data-action="tree-step-prev">遍历上一步</button>
          <button type="button" data-action="tree-clear-highlight">清除高亮</button>
          <button type="button" data-action="tree-collapse-subtree">折叠子树</button>
          <button type="button" data-action="tree-expand-subtree">展开子树</button>
          <button type="button" data-action="tree-copy-subtree">复制子树</button>
          <button type="button" data-action="tree-move-subtree">移动子树</button>
          <button type="button" data-action="tree-delete-node">删节点</button>
          <button type="button" data-action="tree-reload">树重载</button>
          <button type="button" data-action="bring-front">置顶</button>
          <button type="button" data-action="send-back">置底</button>
          <button type="button" data-action="toggle-lock">锁定</button>
          <button type="button" data-action="group">分组</button>
          <button type="button" data-action="ungroup">取消组</button>
          <button type="button" data-action="delete-selection">删除</button>
        </div>
      </aside>

      <aside class="layer-panel is-collapsed" data-layer-panel aria-label="图层">
        <div class="panel-title">
          ${icon(PANEL_ICON)}<span>图层</span>
          <button type="button" class="panel-toggle" data-panel-toggle="layers" title="收起/展开图层" aria-label="收起/展开图层">›</button>
        </div>
        <div class="layer-list" data-layer-list></div>
      </aside>

      <button type="button" class="edge-panel-toggle edge-panel-toggle-left" data-panel-edge="style" data-panel-toggle="style" title="展开属性" aria-label="展开属性">›</button>
      <button type="button" class="edge-panel-toggle edge-panel-toggle-right" data-panel-edge="layers" data-panel-toggle="layers" title="展开图层" aria-label="展开图层">‹</button>

      <main id="stage-container" class="stage-container"></main>
      <input data-image-input type="file" accept="image/*" hidden />

      <div class="shape-popover" data-shape-popover hidden>
        ${shapePopoverMarkup()}
      </div>

      <div class="structure-panel" data-structure-panel hidden>
        ${structurePanelMarkup()}
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
