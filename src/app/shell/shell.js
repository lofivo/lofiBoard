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
} from "../../ui/config.js";

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
                <button type="button" data-background-mode="plain">纯白</button>
                <button type="button" data-background-mode="dots">点阵</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <aside class="style-panel" data-style-panel aria-label="属性">
        <div class="panel-title">
          ${icon(PANEL_ICON)}<span data-style-panel-title>属性</span>
          <button type="button" class="panel-toggle" data-panel-toggle="style" title="收起/展开属性" aria-label="收起/展开属性">‹</button>
        </div>
        <div class="panel-body" data-panel-body>
          <section class="inspector-section" data-inspector-section="linear" data-panel-context="linear">
            <div class="inspector-section-content" data-section-content="linear">
              <div class="linear-structure-panel">
                <div class="linear-panel-content-inner">
                  <div class="linear-values-field" data-linear-values-field>
                    <div class="linear-values-header">
                      <span data-linear-values-title>当前结构</span>
                      <button type="button" data-action="linear-apply-values" data-linear-values-action>应用结构</button>
                    </div>
                    <textarea data-linear-values-input rows="3" spellcheck="false" placeholder="1,2,3" aria-label="当前结构"></textarea>
                  </div>
                  <div class="linear-panel-fields linear-panel-fields-highlight">
                    <label class="linear-field">
                      高亮起点
                      <input data-linear-field="highlight-start" type="number" min="0" step="1" value="0" />
                    </label>
                    <label class="linear-field">
                      高亮终点
                      <input data-linear-field="highlight-end" type="number" min="0" step="1" value="0" />
                    </label>
                    <label class="linear-field">
                      指针
                      <input data-linear-field="highlight-pointer" type="number" min="0" step="1" value="0" />
                    </label>
                  </div>
                  <div class="quick-actions quick-actions-linear quick-actions-compact">
                    <button type="button" data-action="array-highlight">应用高亮</button>
                    <button type="button" data-action="array-clear-highlight">清除高亮</button>
                    <button type="button" data-action="linear-index-zero">0 下标</button>
                    <button type="button" data-action="linear-index-one">1 下标</button>
                    <button type="button" data-action="linear-index-show">显示下标</button>
                    <button type="button" data-action="linear-index-hide">隐藏下标</button>
                    <button type="button" data-action="linear-pointer-show">显示指针</button>
                    <button type="button" data-action="linear-pointer-hide">隐藏指针</button>
                  </div>
                  <div class="linear-algorithm-panel" data-linear-algorithm-panel>
                    <label class="algorithm-select-field">
                      <span>排序算法</span>
                      <select data-array-algorithm-select aria-label="数组算法">
                        <option value="bubble-sort">冒泡排序</option>
                        <option value="selection-sort">选择排序</option>
                        <option value="insertion-sort">插入排序</option>
                      </select>
                    </label>
                    <div class="algorithm-status" data-array-algorithm-status>选择数组后开始演示</div>
                    <div class="quick-actions quick-actions-algorithm quick-actions-compact">
                      <button type="button" data-action="array-algorithm-start">开始</button>
                      <button type="button" data-action="array-algorithm-prev">上一步</button>
                      <button type="button" data-action="array-algorithm-next">下一步</button>
                      <button type="button" data-action="array-algorithm-play">播放</button>
                      <button type="button" data-action="array-algorithm-reset">重置</button>
                      <button type="button" data-action="array-algorithm-stop">结束</button>
                    </div>
                    <label class="linear-field algorithm-speed-field">
                      速度
                      <input data-array-algorithm-speed type="range" min="0.5" max="3" step="0.5" value="1" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="inspector-section" data-inspector-section="graph" data-panel-context="graph">
            <button
              type="button"
              class="inspector-section-toggle"
              data-section-toggle="graph"
              aria-expanded="false"
            >
              <span class="inspector-section-title">图结构</span>
              <span class="inspector-section-chevron" aria-hidden="true">⌄</span>
            </button>
            <div class="inspector-section-content" data-section-content="graph">
              <label class="structure-values-field">
                <span class="structure-values-header">
                  <span>顶点与边关系</span>
                  <button type="button" data-action="graph-apply-structure">应用结构</button>
                </span>
                <textarea data-graph-structure-input rows="5" spellcheck="false" placeholder="A->B&#10;A-C"></textarea>
              </label>
              <div class="quick-actions quick-actions-graph">
                <button type="button" data-action="graph-directed-toggle">有向图</button>
              </div>
              <label class="linear-field graph-node-scale-field">
                <span>节点大小</span>
                <input data-graph-node-scale type="range" min="50" max="200" step="10" value="100" />
              </label>
              <button type="button" data-action="graph-node-scale-commit" hidden aria-hidden="true"></button>
            </div>
          </section>

          <section class="inspector-section" data-inspector-section="tree" data-panel-context="tree">
            <div class="inspector-section-content" data-section-content="tree">
              <label class="structure-values-field">
                <span class="structure-values-header">
                  <span>当前树结构</span>
                  <button type="button" data-action="tree-apply-structure">应用结构</button>
                </span>
                <textarea data-tree-structure-input rows="5" spellcheck="false" placeholder="A->B&#10;A->C"></textarea>
              </label>
              <div class="quick-actions quick-actions-tree">
                <button type="button" data-action="tree-highlight-level">层序遍历</button>
                <button type="button" data-action="tree-highlight-preorder">前序遍历</button>
                <button type="button" data-action="tree-highlight-postorder">后序遍历</button>
                <button type="button" data-action="tree-clear-highlight">清除高亮</button>
              </div>
              <div class="quick-actions quick-actions-binary-tree">
                <button type="button" data-action="tree-highlight-preorder">前序遍历</button>
                <button type="button" data-action="tree-highlight-inorder">中序遍历</button>
                <button type="button" data-action="tree-highlight-postorder">后序遍历</button>
                <button type="button" data-action="tree-clear-highlight">清除高亮</button>
              </div>
            </div>
          </section>
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
