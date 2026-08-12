import type { Point, Workspace } from './index';
import type { NodeFrame } from './precision';
import { clampZoom, type ViewportSize } from './viewport';

export type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export interface Bounds { left: number; right: number; top: number; bottom: number; x: number; y: number; width: number; height: number }
export interface ResizeResult { x: number; y: number; width: number; height: number }
export type GuideAxis = 'x' | 'y';
export interface AlignmentGuide { axis: GuideAxis; position: number; source: 'start' | 'center' | 'end'; targetId: string }
export interface SnapResult { dx: number; dy: number; guides: AlignmentGuide[] }
export type SnapTarget = { id: string; bounds: Bounds };
export interface RouteProjection { point: Point; segmentIndex: number; distance: number }
export interface ViewportTransform { scale: number; panX: number; panY: number }
export interface CanvasGridTransform { size: number; offsetX: number; offsetY: number }

const finite = (...values: number[]) => values.every(Number.isFinite);
export function nodeBounds(frame: Pick<NodeFrame, 'x' | 'y' | 'width' | 'height'>): Bounds | undefined {
  if (!finite(frame.x, frame.y, frame.width, frame.height) || frame.width <= 0 || frame.height <= 0) return undefined;
  return { left: frame.x - frame.width / 2, right: frame.x + frame.width / 2, top: frame.y - frame.height / 2, bottom: frame.y + frame.height / 2, x: frame.x, y: frame.y, width: frame.width, height: frame.height };
}
export function selectionBounds(frames: Pick<NodeFrame, 'x' | 'y' | 'width' | 'height'>[]): Bounds | undefined {
  const values = frames.map(nodeBounds); if (!values.length || values.some((value) => !value)) return undefined; const bounds = values as Bounds[];
  const left = Math.min(...bounds.map((value) => value.left)); const right = Math.max(...bounds.map((value) => value.right)); const top = Math.min(...bounds.map((value) => value.top)); const bottom = Math.max(...bounds.map((value) => value.bottom));
  return { left, right, top, bottom, x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top };
}
export function resizeFromHandle(frame: Pick<NodeFrame, 'x' | 'y' | 'width' | 'height'>, handle: ResizeHandle, dx: number, dy: number, minimum = { width: 40, height: 30 }): ResizeResult | undefined {
  const bounds = nodeBounds(frame); if (!bounds || !finite(dx, dy, minimum.width, minimum.height) || minimum.width <= 0 || minimum.height <= 0) return undefined;
  let { left, right, top, bottom } = bounds;
  if (handle.includes('e')) right = Math.max(left + minimum.width, right + dx);
  if (handle.includes('w')) left = Math.min(right - minimum.width, left + dx);
  if (handle.includes('s')) bottom = Math.max(top + minimum.height, bottom + dy);
  if (handle.includes('n')) top = Math.min(bottom - minimum.height, top + dy);
  return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top };
}
export function applyNodeResize(workspace: Workspace, id: string, result: ResizeResult, original?: Pick<NodeFrame, 'x' | 'y'>): Workspace {
  if (!finite(result.x, result.y, result.width, result.height) || result.width <= 0 || result.height <= 0) return workspace; const current = workspace.layout.nodes[id] ?? {};
  const center = current.positionLocked && original && finite(original.x, original.y) ? { x: original.x, y: original.y } : { x: result.x, y: result.y }; return { ...workspace, layout: { ...workspace.layout, mode: workspace.layout.mode === 'auto' ? 'hybrid' : workspace.layout.mode, nodes: { ...workspace.layout.nodes, [id]: { ...current, ...result, ...center, positioning: 'manual', sizing: 'manual' } } } };
}
type Candidate = { adjustment: number; kind: 'edge' | 'center'; position: number; targetId: string };
function axisCandidates(moving: Bounds, targets: SnapTarget[], axis: GuideAxis): Candidate[] {
  const movingValues = axis === 'x' ? [{ value: moving.left, kind: 'edge' as const }, { value: moving.x, kind: 'center' as const }, { value: moving.right, kind: 'edge' as const }] : [{ value: moving.top, kind: 'edge' as const }, { value: moving.y, kind: 'center' as const }, { value: moving.bottom, kind: 'edge' as const }];
  return targets.flatMap(({ id, bounds }) => { const targetValues = axis === 'x' ? [{ value: bounds.left, kind: 'edge' as const }, { value: bounds.x, kind: 'center' as const }, { value: bounds.right, kind: 'edge' as const }] : [{ value: bounds.top, kind: 'edge' as const }, { value: bounds.y, kind: 'center' as const }, { value: bounds.bottom, kind: 'edge' as const }]; return movingValues.flatMap((source) => targetValues.map((target) => ({ adjustment: target.value - source.value, kind: source.kind === target.kind ? source.kind : 'edge', position: target.value, targetId: id }))); });
}
function bestCandidate(candidates: Candidate[], tolerance: number): Candidate | undefined { return candidates.filter((value) => Math.abs(value.adjustment) <= tolerance).sort((a, b) => Math.abs(a.adjustment) - Math.abs(b.adjustment) || (a.kind === b.kind ? 0 : a.kind === 'center' ? -1 : 1) || a.targetId.localeCompare(b.targetId) || a.position - b.position)[0]; }
export function snapBounds(moving: Bounds, targets: SnapTarget[], scale: number, tolerancePx = 6, grid?: { enabled: boolean; spacing: number; reference?: Point }): SnapResult {
  const tolerance = tolerancePx / Math.max(scale, 0.0001); const objectX = bestCandidate(axisCandidates(moving, targets, 'x'), tolerance); const objectY = bestCandidate(axisCandidates(moving, targets, 'y'), tolerance);
  const gridPoint = grid?.reference ?? moving; const gridX = grid?.enabled && grid.spacing > 0 ? Math.round(gridPoint.x / grid.spacing) * grid.spacing - gridPoint.x : undefined; const gridY = grid?.enabled && grid.spacing > 0 ? Math.round(gridPoint.y / grid.spacing) * grid.spacing - gridPoint.y : undefined;
  const choose = (object: Candidate | undefined, gridValue: number | undefined) => gridValue !== undefined && Math.abs(gridValue) < Math.abs(object?.adjustment ?? Infinity) ? { adjustment: gridValue } : object;
  const x = choose(objectX, gridX); const y = choose(objectY, gridY); const guides: AlignmentGuide[] = [];
  if (x && 'position' in x) guides.push({ axis: 'x', position: x.position, source: x.kind === 'center' ? 'center' : 'start', targetId: x.targetId });
  if (y && 'position' in y) guides.push({ axis: 'y', position: y.position, source: y.kind === 'center' ? 'center' : 'start', targetId: y.targetId });
  return { dx: x?.adjustment ?? 0, dy: y?.adjustment ?? 0, guides };
}
function activeResizeCandidate(intended: Bounds, handle: ResizeHandle, targets: SnapTarget[], axis: GuideAxis, tolerance: number): Candidate | undefined {
  const source = axis === 'x' ? handle.includes('e') ? intended.right : handle.includes('w') ? intended.left : undefined : handle.includes('s') ? intended.bottom : handle.includes('n') ? intended.top : undefined; if (source === undefined) return undefined;
  const candidates = targets.flatMap(({ id, bounds }) => (axis === 'x' ? [bounds.left, bounds.x, bounds.right] : [bounds.top, bounds.y, bounds.bottom]).map((position, index) => ({ adjustment: position - source, kind: index === 1 ? 'center' as const : 'edge' as const, position, targetId: id })));
  return bestCandidate(candidates, tolerance);
}
function attainableResizeAdjustment(intended: Bounds, handle: ResizeHandle, axis: GuideAxis, adjustment: number, minimum: { width: number; height: number }, centerLocked: boolean): boolean { if (axis === 'x') { const sizeChange = adjustment * (handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0) * (centerLocked ? 2 : 1); return intended.width + sizeChange >= minimum.width; } const sizeChange = adjustment * (handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0) * (centerLocked ? 2 : 1); return intended.height + sizeChange >= minimum.height; }
export function snapResize(original: Bounds, intended: Bounds, handle: ResizeHandle, targets: SnapTarget[], scale: number, tolerancePx = 6, grid?: { enabled: boolean; spacing: number }, minimum = { width: 40, height: 30 }, centerLocked = false): SnapResult {
  if (!finite(original.left, original.right, original.top, original.bottom, intended.left, intended.right, intended.top, intended.bottom)) return { dx: 0, dy: 0, guides: [] }; const tolerance = tolerancePx / Math.max(scale, 0.0001);
  const rawObjectX = activeResizeCandidate(intended, handle, targets, 'x', tolerance); const rawObjectY = activeResizeCandidate(intended, handle, targets, 'y', tolerance); const objectX = rawObjectX && attainableResizeAdjustment(intended, handle, 'x', rawObjectX.adjustment, minimum, centerLocked) ? rawObjectX : undefined; const objectY = rawObjectY && attainableResizeAdjustment(intended, handle, 'y', rawObjectY.adjustment, minimum, centerLocked) ? rawObjectY : undefined;
  const activeX = handle.includes('e') ? intended.right : handle.includes('w') ? intended.left : undefined; const activeY = handle.includes('s') ? intended.bottom : handle.includes('n') ? intended.top : undefined;
  const rawGridX = activeX !== undefined && grid?.enabled && grid.spacing > 0 ? Math.round(activeX / grid.spacing) * grid.spacing - activeX : undefined; const rawGridY = activeY !== undefined && grid?.enabled && grid.spacing > 0 ? Math.round(activeY / grid.spacing) * grid.spacing - activeY : undefined; const gridX = rawGridX !== undefined && attainableResizeAdjustment(intended, handle, 'x', rawGridX, minimum, centerLocked) ? rawGridX : undefined; const gridY = rawGridY !== undefined && attainableResizeAdjustment(intended, handle, 'y', rawGridY, minimum, centerLocked) ? rawGridY : undefined;
  const choose = (object: Candidate | undefined, gridValue: number | undefined) => gridValue !== undefined && Math.abs(gridValue) < Math.abs(object?.adjustment ?? Infinity) ? { adjustment: gridValue } : object; const x = choose(objectX, gridX); const y = choose(objectY, gridY); const guides: AlignmentGuide[] = [];
  if (x && 'position' in x) guides.push({ axis: 'x', position: x.position, source: 'end', targetId: x.targetId }); if (y && 'position' in y) guides.push({ axis: 'y', position: y.position, source: 'end', targetId: y.targetId }); return { dx: x?.adjustment ?? 0, dy: y?.adjustment ?? 0, guides };
}
export function effectiveResizeDelta(original: Bounds, intended: Bounds, handle: ResizeHandle): Point { return { x: handle.includes('e') ? intended.right - original.right : handle.includes('w') ? intended.left - original.left : 0, y: handle.includes('s') ? intended.bottom - original.bottom : handle.includes('n') ? intended.top - original.top : 0 }; }
export function centerLockedResize(frame: Pick<NodeFrame, 'x' | 'y' | 'width' | 'height'>, result: ResizeResult): ResizeResult { return { ...result, x: frame.x, y: frame.y }; }
export function applyResizeSnap(frame: Pick<NodeFrame, 'x' | 'y' | 'width' | 'height'>, intended: ResizeResult, handle: ResizeHandle, snap: Pick<SnapResult, 'dx' | 'dy'>, centerLocked = false, minimum = { width: 40, height: 30 }): ResizeResult | undefined { const original = nodeBounds(frame); const intendedBounds = nodeBounds(intended); if (!original || !intendedBounds) return undefined; if (centerLocked) { const width = Math.max(minimum.width, intended.width + snap.dx * (handle.includes('e') ? 2 : handle.includes('w') ? -2 : 0)); const height = Math.max(minimum.height, intended.height + snap.dy * (handle.includes('s') ? 2 : handle.includes('n') ? -2 : 0)); return { x: frame.x, y: frame.y, width, height }; } const effective = effectiveResizeDelta(original, intendedBounds, handle); return resizeFromHandle(frame, handle, effective.x + snap.dx, effective.y + snap.dy, minimum); }
export function nearestPointOnSegment(point: Point, start: Point, end: Point): { point: Point; distance: number } | undefined { if (!finite(point.x, point.y, start.x, start.y, end.x, end.y)) return undefined; const dx = end.x - start.x; const dy = end.y - start.y; const lengthSquared = dx * dx + dy * dy; const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)); const projected = { x: start.x + dx * ratio, y: start.y + dy * ratio }; return { point: projected, distance: Math.hypot(point.x - projected.x, point.y - projected.y) }; }
export function nearestRouteSegment(point: Point, route: Point[]): RouteProjection | undefined { return route.slice(1).map((end, index) => { const projected = nearestPointOnSegment(point, route[index]!, end); return projected ? { ...projected, segmentIndex: index } : undefined; }).filter((value): value is RouteProjection => value !== undefined).sort((a, b) => a.distance - b.distance || a.segmentIndex - b.segmentIndex)[0]; }
export function insertEdgeWaypoint(workspace: Workspace, edgeId: string, point: Point, segmentIndex: number): Workspace { const current = workspace.layout.edges[edgeId] ?? { routing: 'auto' as const }; if (current.routingLocked || current.routing === 'orthogonal' || current.routing === 'bezier' || !finite(point.x, point.y) || !Number.isInteger(segmentIndex) || segmentIndex < 0) return workspace; const waypoints = current.routing === 'manual' ? [...(current.waypoints ?? [])] : []; waypoints.splice(current.routing === 'manual' ? Math.min(segmentIndex, waypoints.length) : 0, 0, point); return { ...workspace, layout: { ...workspace.layout, edges: { ...workspace.layout.edges, [edgeId]: { ...current, routing: 'manual', waypoints } } } }; }
export function boundsFromPoints(points: Point[]): Bounds | undefined { if (!points.length || points.some((point) => !finite(point.x, point.y))) return undefined; const left = Math.min(...points.map((point) => point.x)); const right = Math.max(...points.map((point) => point.x)); const top = Math.min(...points.map((point) => point.y)); const bottom = Math.max(...points.map((point) => point.y)); return { left, right, top, bottom, x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top }; }
export function calculateViewportTransform(viewport: ViewportSize, diagram: Bounds, target: Bounds, padding = 48): ViewportTransform { const width = Math.max(target.width, 1); const height = Math.max(target.height, 1); const scale = clampZoom(Math.min(1.5, Math.max(1, viewport.width - padding * 2) / width, Math.max(1, viewport.height - padding * 2) / height)); const panX = -(target.x - diagram.x) * scale; const panY = -(target.y - diagram.y) * scale; return { scale, panX: Object.is(panX, -0) ? 0 : panX, panY: Object.is(panY, -0) ? 0 : panY }; }
export function calculateCanvasGridTransform(layout: Pick<Bounds, 'x' | 'y' | 'width' | 'height'>, spacing: number, scale: number, pan: Point): CanvasGridTransform | undefined { if (!finite(layout.x, layout.y, layout.width, layout.height, spacing, scale, pan.x, pan.y) || spacing <= 0 || scale <= 0) return undefined; return { size: spacing * scale, offsetX: pan.x - (layout.x + layout.width / 2) * scale, offsetY: pan.y - (layout.y + layout.height / 2) * scale }; }
