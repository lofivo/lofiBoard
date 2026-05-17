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
      <div class="property-storage" hidden aria-hidden="true">
        <input data-control="color" type="color" value="#111827" />
        <input data-control="fill" type="color" value="#ffffff" />
        <input data-control="fill-transparent" type="checkbox" checked />
        <input data-control="width" type="range" min="1" max="28" value="6" />
        <input data-control="brush-opacity" type="range" min="10" max="100" value="100" />
        <input data-control="brush-smoothing" type="range" min="0" max="100" value="45" />
        <input data-control="brush-cap" type="text" value="round" />
        <input data-control="brush-style" type="text" value="solid" />
        <input data-control="font-size" type="range" min="12" max="96" value="28" />
        <input data-control="font-family" type="text" value="Inter, system-ui, sans-serif" />
      </div>

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
          ${icon(PANEL_ICON)}<span>属性</span>
          <button type="button" class="panel-toggle" data-panel-toggle="style" title="收起/展开属性" aria-label="收起/展开属性">‹</button>
        </div>
        <div class="panel-body" data-panel-body>
          <div class="inspector-section" data-inspector-section="appearance" data-panel-context="appearance">
            <div class="brush-inspector" aria-label="画笔样式">
              <div class="brush-preview-card" aria-hidden="true">
                <svg class="brush-preview-canvas" viewBox="0 0 280 48" focusable="false">
                  <path data-brush-preview-path d="M 14,24 C 72,10 132,38 266,24" fill="none" stroke="#111827" stroke-width="6" stroke-linecap="round" />
                </svg>
              </div>
              <div class="brush-field brush-field-color">
                <div class="brush-field-label">颜色</div>
                <div class="brush-color-grid" role="group" aria-label="画笔颜色">
                  <button type="button" class="brush-color-swatch" data-brush-color="#111827" style="--swatch-color: #111827" title="黑色" aria-label="黑色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#2563eb" style="--swatch-color: #2563eb" title="蓝色" aria-label="蓝色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#dc2626" style="--swatch-color: #dc2626" title="红色" aria-label="红色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#16a34a" style="--swatch-color: #16a34a" title="绿色" aria-label="绿色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#f59e0b" style="--swatch-color: #f59e0b" title="黄色" aria-label="黄色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#7c3aed" style="--swatch-color: #7c3aed" title="紫色" aria-label="紫色"></button>
                  <div class="brush-color-divider" aria-hidden="true"></div>
                  <label class="brush-custom-color" title="自定义颜色" aria-label="自定义颜色">
                    <input data-brush-custom-color type="color" value="#111827" />
                  </label>
                </div>
              </div>
              <div class="brush-field brush-field-width">
                <div class="brush-field-header">
                  <div class="brush-field-label">粗细</div>
                </div>
                <div class="brush-width-control">
                  <input data-brush-width-slider type="range" min="1" max="28" step="1" value="6" aria-label="画笔粗细" />
                </div>
              </div>
              <div class="brush-field brush-field-cap">
                <div class="brush-field-label">笔头</div>
                <div class="brush-preset-row brush-cap-row" role="group" aria-label="画笔笔头">
                  <button type="button" class="brush-preset-button brush-cap-preset" data-brush-cap-option="round" title="圆头" aria-label="圆头">
                    <span class="brush-cap-preview brush-cap-preview-round"></span>
                  </button>
                  <button type="button" class="brush-preset-button brush-cap-preset" data-brush-cap-option="square" title="平头" aria-label="平头">
                    <span class="brush-cap-preview brush-cap-preview-square"></span>
                  </button>
                </div>
              </div>
              <div class="brush-field brush-field-style">
                <div class="brush-field-label">线型</div>
                <div class="brush-preset-row brush-style-row" role="group" aria-label="画笔线型">
                  <button type="button" class="brush-preset-button brush-style-preset" data-brush-style-option="solid" title="实线" aria-label="实线"><span class="brush-style-line brush-style-line-solid"></span></button>
                  <button type="button" class="brush-preset-button brush-style-preset" data-brush-style-option="dash" title="虚线" aria-label="虚线"><span class="brush-style-line brush-style-line-dash"></span></button>
                  <button type="button" class="brush-preset-button brush-style-preset" data-brush-style-option="dot" title="点线" aria-label="点线"><span class="brush-style-line brush-style-line-dot"></span></button>
                </div>
              </div>
              <label class="brush-field brush-slider-field brush-field-opacity control-brush-opacity">
                <span class="brush-field-header">
                  <span class="brush-field-label">不透明度</span>
                </span>
                <span class="brush-slider-row">
                  <input data-control="brush-opacity" type="range" min="10" max="100" value="100" />
                </span>
              </label>
            </div>

            <div class="text-inspector" aria-label="文字样式">
              <div class="brush-field brush-field-color">
                <div class="brush-field-label">颜色</div>
                <div class="brush-color-grid" role="group" aria-label="文字颜色">
                  <button type="button" class="brush-color-swatch" data-brush-color="#111827" style="--swatch-color: #111827" title="黑色" aria-label="黑色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#2563eb" style="--swatch-color: #2563eb" title="蓝色" aria-label="蓝色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#dc2626" style="--swatch-color: #dc2626" title="红色" aria-label="红色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#16a34a" style="--swatch-color: #16a34a" title="绿色" aria-label="绿色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#f59e0b" style="--swatch-color: #f59e0b" title="黄色" aria-label="黄色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#7c3aed" style="--swatch-color: #7c3aed" title="紫色" aria-label="紫色"></button>
                  <div class="brush-color-divider" aria-hidden="true"></div>
                  <label class="brush-custom-color" title="自定义颜色" aria-label="自定义颜色">
                    <input data-ui-control="color" type="color" value="#111827" />
                  </label>
                </div>
              </div>
              <div class="brush-field brush-field-font-family">
                <div class="brush-field-label">字体</div>
                <select data-ui-control="font-family">
                  <option value="Inter, system-ui, sans-serif">Inter</option>
                  <option value="Arial, Helvetica, sans-serif">Arial</option>
                  <option value="'Noto Sans SC', 'Microsoft YaHei', sans-serif">中文黑体</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', Times, serif">Times</option>
                  <option value="'Courier New', Courier, monospace">Courier</option>
                </select>
              </div>
              <div class="brush-field brush-field-text-format">
                <div class="brush-field-label">样式</div>
                <div class="control-text-format" role="group" aria-label="文字样式">
                  <button type="button" data-text-style="bold" title="加粗" aria-label="加粗">${icon(TEXT_FORMAT_ICONS.bold)}</button>
                  <button type="button" data-text-style="italic" title="斜体" aria-label="斜体">${icon(TEXT_FORMAT_ICONS.italic)}</button>
                  <button type="button" data-text-style="underline" title="下划线" aria-label="下划线">${icon(TEXT_FORMAT_ICONS.underline)}</button>
                  <button type="button" data-text-style="strike" title="删除线" aria-label="删除线">${icon(TEXT_FORMAT_ICONS.strike)}</button>
                </div>
              </div>
              <div class="brush-field brush-field-font-size">
                <div class="brush-field-label">字号</div>
                <input data-ui-control="font-size" type="range" min="12" max="96" value="28" />
              </div>
            </div>

            <div class="sticky-inspector" aria-label="便签样式">
              <div class="brush-field brush-field-color">
                <div class="brush-field-label">背景颜色</div>
                <div class="brush-color-grid" role="group" aria-label="便签背景颜色">
                  <button type="button" class="brush-color-swatch" data-brush-color="#fef08a" style="--swatch-color: #fef08a" title="黄色" aria-label="黄色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#bbf7d0" style="--swatch-color: #bbf7d0" title="绿色" aria-label="绿色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#bfdbfe" style="--swatch-color: #bfdbfe" title="蓝色" aria-label="蓝色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#fecaca" style="--swatch-color: #fecaca" title="红色" aria-label="红色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#ddd6fe" style="--swatch-color: #ddd6fe" title="紫色" aria-label="紫色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-color="#fed7aa" style="--swatch-color: #fed7aa" title="橙色" aria-label="橙色"></button>
                  <div class="brush-color-divider" aria-hidden="true"></div>
                  <label class="brush-custom-color" title="自定义背景颜色" aria-label="自定义背景颜色">
                    <input data-ui-control="fill" type="color" value="#fef08a" />
                  </label>
                </div>
              </div>
              <div class="brush-field brush-field-text-color">
                <div class="brush-field-label">字体颜色</div>
                <div class="brush-color-grid" role="group" aria-label="便签字体颜色">
                  <button type="button" class="brush-color-swatch" data-brush-text-color="#111827" style="--swatch-color: #111827" title="黑色" aria-label="黑色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-text-color="#2563eb" style="--swatch-color: #2563eb" title="蓝色" aria-label="蓝色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-text-color="#dc2626" style="--swatch-color: #dc2626" title="红色" aria-label="红色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-text-color="#16a34a" style="--swatch-color: #16a34a" title="绿色" aria-label="绿色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-text-color="#f59e0b" style="--swatch-color: #f59e0b" title="黄色" aria-label="黄色"></button>
                  <button type="button" class="brush-color-swatch" data-brush-text-color="#7c3aed" style="--swatch-color: #7c3aed" title="紫色" aria-label="紫色"></button>
                  <div class="brush-color-divider" aria-hidden="true"></div>
                  <label class="brush-custom-color" title="自定义字体颜色" aria-label="自定义字体颜色">
                    <input data-ui-control="text-color" type="color" value="#1f2937" />
                  </label>
                </div>
              </div>
              <div class="brush-field brush-field-font-family">
                <div class="brush-field-label">字体</div>
                <select data-ui-control="sticky-font-family">
                  <option value="Inter, system-ui, sans-serif">Inter</option>
                  <option value="Arial, Helvetica, sans-serif">Arial</option>
                  <option value="'Noto Sans SC', 'Microsoft YaHei', sans-serif">中文黑体</option>
                  <option value="Georgia, serif">Georgia</option>
                </select>
              </div>
              <div class="brush-field brush-field-text-format">
                <div class="brush-field-label">样式</div>
                <div class="control-text-format" role="group" aria-label="文字样式">
                  <button type="button" data-text-style="bold" title="加粗" aria-label="加粗">${icon(TEXT_FORMAT_ICONS.bold)}</button>
                  <button type="button" data-text-style="italic" title="斜体" aria-label="斜体">${icon(TEXT_FORMAT_ICONS.italic)}</button>
                  <button type="button" data-text-style="underline" title="下划线" aria-label="下划线">${icon(TEXT_FORMAT_ICONS.underline)}</button>
                  <button type="button" data-text-style="strike" title="删除线" aria-label="删除线">${icon(TEXT_FORMAT_ICONS.strike)}</button>
                </div>
              </div>
              <div class="brush-field brush-field-font-size">
                <div class="brush-field-label">字号</div>
                <input data-ui-control="sticky-font-size" type="range" min="12" max="64" value="24" />
              </div>
            </div>
          </div>
          </div>

          <section class="inspector-section" data-inspector-section="linear" data-panel-context="linear">
            <button
              type="button"
              class="inspector-section-toggle"
              data-section-toggle="linear"
              aria-expanded="true"
            >
              <span class="inspector-section-title" data-linear-title>数组</span>
              <span class="inspector-section-chevron" aria-hidden="true">⌄</span>
            </button>
            <div class="inspector-section-content" data-section-content="linear">
              <div class="linear-structure-panel">
                ${linearGroupMarkup({
                  key: "highlight",
                  title: "高亮与下标",
                  expanded: true,
                  content: `
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
                  `,
                })}
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
              <div class="quick-actions quick-actions-graph">
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
              </div>
            </div>
          </section>

          <section class="inspector-section" data-inspector-section="tree" data-panel-context="tree">
            <button
              type="button"
              class="inspector-section-toggle"
              data-section-toggle="tree"
              aria-expanded="false"
            >
              <span class="inspector-section-title">树结构</span>
              <span class="inspector-section-chevron" aria-hidden="true">⌄</span>
            </button>
            <div class="inspector-section-content" data-section-content="tree">
              <div class="quick-actions quick-actions-tree">
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

function linearGroupMarkup({ key, title, expanded, content }) {
  return `
    <section class="linear-panel-group" data-linear-group="${key}" data-collapsed="${expanded ? "false" : "true"}">
      <button
        type="button"
        class="linear-panel-toggle"
        data-linear-toggle="${key}"
        aria-expanded="${expanded ? "true" : "false"}"
      >
        <span class="linear-panel-heading">${title}</span>
        <span class="linear-panel-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="linear-panel-content" data-linear-content="${key}" aria-hidden="${expanded ? "false" : "true"}">
        <div class="linear-panel-content-inner">
          ${content}
        </div>
      </div>
    </section>
  `;
}
