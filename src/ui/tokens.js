// 浮层 chrome（工具栏 / 侧栏 / 菜单 / 状态栏）的唯一设计令牌来源。
// 颜色一律走 Semi 令牌或 --board-* 变量，组件内不再写死 hex，
// 这样暗色模式只需在 styles.css 里翻转变量，不用逐个组件改。

// 圆角只有四档，按容器层级取值，不要在组件里临时发明新值：
//   xs 色板 / 小徽章  sm 按钮、菜单项、贴边把手  md 浮层容器  lg 侧边面板外角
export const RADIUS = { xs: 6, sm: 8, md: 12, lg: 16 };

// 阴影只有两档：贴边小控件用 raised，主浮层用 overlay。
export const SHADOW = {
  raised: '0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 20px rgba(15, 23, 42, 0.06)',
  overlay: '0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 40px rgba(15, 23, 42, 0.08)',
};

export const TEXT = {
  primary: 'var(--semi-color-text-0)',
  secondary: 'var(--semi-color-text-2)',
  tertiary: 'var(--semi-color-text-3)',
};

export const ACCENT = 'var(--semi-color-primary)';
export const ACCENT_SOFT = 'var(--semi-color-primary-light-default)';
export const BORDER = 'var(--semi-color-border)';
export const SURFACE = 'var(--board-surface)';
export const STROKE = 'var(--board-stroke)';

// 毛玻璃浮层底座。所有固定浮层展开这个对象，保证边框/底色/模糊/阴影完全一致。
export const GLASS = {
  border: `1px solid ${STROKE}`,
  background: SURFACE,
  boxShadow: SHADOW.overlay,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

// 贴边把手（面板收起后的拉手）比主浮层轻一档。
export const GLASS_EDGE = {
  ...GLASS,
  boxShadow: SHADOW.raised,
};

export const PANEL_MOTION =
  'opacity 180ms cubic-bezier(0.33, 0, 0.2, 1), transform 220ms cubic-bezier(0.33, 0, 0.2, 1)';
