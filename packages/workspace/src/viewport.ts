export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 0.15;
export interface ViewportSize { width: number; height: number }
export interface DiagramSize { width: number; height: number }
export function clampZoom(value: number): number { return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)); }
export function calculateFitScale(viewport: ViewportSize, diagram: DiagramSize, padding = 48): number { if (viewport.width <= 0 || viewport.height <= 0 || diagram.width <= 0 || diagram.height <= 0) return 1; const availableWidth = Math.max(1, viewport.width - padding * 2); const availableHeight = Math.max(1, viewport.height - padding * 2); return clampZoom(Math.min(1.5, availableWidth / diagram.width, availableHeight / diagram.height)); }
