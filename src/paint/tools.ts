export type ToolId =
  | 'freeSelect'
  | 'select'
  | 'eraser'
  | 'fill'
  | 'picker'
  | 'magnifier'
  | 'pencil'
  | 'brush'
  | 'airbrush'
  | 'text'
  | 'line'
  | 'curve'
  | 'rect'
  | 'polygon'
  | 'ellipse'
  | 'roundRect';

export interface ToolDef {
  id: ToolId;
  label: string;
  key?: string;
  hint: string;
  disabled?: boolean;
}

/** Classic Paint toolbox order (two columns, eight rows). */
export const TOOLS: ToolDef[] = [
  { id: 'freeSelect', label: '套索选择', key: 'W', hint: '沿目标绘制选区，然后输入提示词让 AI 重绘，也可以拖动选区。' },
  { id: 'select', label: '矩形选择', key: 'S', hint: '拖动创建矩形选区，然后输入提示词让 AI 重绘，也可以拖动选区。' },
  { id: 'eraser', label: '橡皮擦', key: 'E', hint: '拖动以背景色擦除。' },
  { id: 'fill', label: '油漆桶', key: 'F', hint: '点击区域，用当前颜色填充。' },
  { id: 'picker', label: '取色器', key: 'I', hint: '点击图片以拾取颜色。' },
  { id: 'magnifier', label: '放大镜', key: 'M', hint: '左键放大，右键缩小。' },
  { id: 'pencil', label: '铅笔', key: 'P', hint: '拖动绘制一像素宽的线条。' },
  { id: 'brush', label: '画笔', key: 'B', hint: '使用当前画笔形状拖动绘制。' },
  { id: 'airbrush', label: '喷枪', key: 'A', hint: '拖动喷涂颜色。' },
  { id: 'text', label: '文字', key: 'T', hint: '点击文字起始位置并输入；按 Ctrl+Enter 应用。' },
  { id: 'line', label: '直线', key: 'L', hint: '拖动绘制直线。' },
  { id: 'curve', label: '曲线', key: 'C', hint: '先拖动绘制线条，再最多拖动两次调整弯曲。' },
  { id: 'rect', label: '矩形', key: 'R', hint: '拖动绘制矩形。' },
  { id: 'polygon', label: '多边形', key: 'G', hint: '拖动绘制第一条边，点击添加顶点，双击完成。' },
  { id: 'ellipse', label: '椭圆', key: 'O', hint: '拖动绘制椭圆。' },
  { id: 'roundRect', label: '圆角矩形', key: 'U', hint: '拖动绘制圆角矩形。' },
];

export type BrushShape = 'round' | 'square' | 'slash';
export const BRUSH_SIZES = [8, 5, 2] as const;
export const ERASER_SIZES = [4, 6, 8, 10] as const;
export const AIRBRUSH_SIZES = [8, 16, 24] as const;
export const LINE_WIDTHS = [1, 2, 3, 4, 5] as const;
export const MAGNIFIER_ZOOMS = [1, 2, 6, 8] as const;
export type FillMode = 'outline' | 'both' | 'fill';

export type ShapeKind = 'rect' | 'ellipse' | 'roundRect' | 'line';

/**
 * Default palette: 30 colors in two rows of fifteen. Row 1 is a neutral ramp plus a warm earth ramp,
 * row 2 walks the hue wheel at matched lightness (Tailwind's 500 tones, designed to sit well together).
 */
export const PALETTE_NAMED: { hex: string; name: string }[] = [
  { hex: '#000000', name: '黑色' }, { hex: '#171717', name: '墨色' }, { hex: '#404040', name: '深灰' }, { hex: '#737373', name: '灰色' },
  { hex: '#a3a3a3', name: '银灰' }, { hex: '#e5e5e5', name: '浅灰' }, { hex: '#ffffff', name: '白色' },
  { hex: '#451a03', name: '浓咖' }, { hex: '#78350f', name: '胡桃' }, { hex: '#b45309', name: '青铜' }, { hex: '#d97706', name: '赭黄' },
  { hex: '#f59e0b', name: '琥珀' }, { hex: '#fcd34d', name: '蜂蜜' }, { hex: '#fde68a', name: '麦秆' }, { hex: '#fef3c7', name: '奶油' },
  { hex: '#ef4444', name: '红色' }, { hex: '#f43f5e', name: '玫红' }, { hex: '#ec4899', name: '粉色' }, { hex: '#d946ef', name: '紫红' },
  { hex: '#a855f7', name: '紫色' }, { hex: '#8b5cf6', name: '堇紫' }, { hex: '#6366f1', name: '靛蓝' }, { hex: '#3b82f6', name: '蓝色' },
  { hex: '#0ea5e9', name: '天蓝' }, { hex: '#06b6d4', name: '青色' }, { hex: '#14b8a6', name: '蓝绿' }, { hex: '#10b981', name: '翠绿' },
  { hex: '#22c55e', name: '绿色' }, { hex: '#84cc16', name: '青柠' }, { hex: '#f97316', name: '橙色' },
];
export const PALETTE: string[] = PALETTE_NAMED.map((c) => c.hex);

export const ZOOM_MIN = 0.125;
export const ZOOM_MAX = 8;

export function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}
