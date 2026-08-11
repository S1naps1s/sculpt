import dagre from '@dagrejs/dagre';
import { DiagramError, type DiagramAst } from '@sculpt/ast';
import type { Anchor, EdgeGeometry, LayoutMetadata } from '@sculpt/workspace';
export interface Point { x: number; y: number }
export interface PositionedNode extends Point { id: string; width: number; height: number }
export interface PositionedEdge { id: string; points: Point[]; label?: Point }
export interface LayoutResult { nodes: PositionedNode[]; edges: PositionedEdge[]; groups: []; width: number; height: number }
export interface LayoutOptions { nodeGap?: number; rankGap?: number; padding?: number }
export interface LayoutEngine { readonly name: string; layout(ast: DiagramAst, options?: LayoutOptions): LayoutResult }
const finitePoint = (point: Point): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);
function anchorPoint(node: PositionedNode, anchor: Anchor | undefined, toward: Point): Point {
  const resolved = anchor ?? 'auto'; if (resolved === 'north') return { x: node.x, y: node.y - node.height / 2 }; if (resolved === 'east') return { x: node.x + node.width / 2, y: node.y }; if (resolved === 'south') return { x: node.x, y: node.y + node.height / 2 }; if (resolved === 'west') return { x: node.x - node.width / 2, y: node.y };
  const dx = toward.x - node.x; const dy = toward.y - node.y; if (Math.abs(dx / node.width) > Math.abs(dy / node.height)) return { x: node.x + Math.sign(dx || 1) * node.width / 2, y: node.y }; return { x: node.x, y: node.y + Math.sign(dy || 1) * node.height / 2 };
}
function manualRoute(edge: EdgeGeometry, source: PositionedNode, target: PositionedNode): Point[] {
  const waypoints = edge.waypoints ?? []; if (!waypoints.every(finitePoint)) throw new DiagramError({ code: 'LAYOUT_INVALID_WAYPOINT', message: 'Edge waypoints must contain finite coordinates.', stage: 'layout', severity: 'error' });
  const firstTarget = waypoints[0] ?? target; const lastSource = waypoints.at(-1) ?? source; const route = [anchorPoint(source, edge.sourceAnchor, firstTarget), ...waypoints, anchorPoint(target, edge.targetAnchor, lastSource)];
  if (edge.routing === 'orthogonal' && route.some((point, index) => index > 0 && point.x !== route[index - 1]?.x && point.y !== route[index - 1]?.y)) throw new DiagramError({ code: 'LAYOUT_NON_ORTHOGONAL', message: 'Orthogonal routes may only contain horizontal or vertical segments.', stage: 'layout', severity: 'error' }); return route;
}
export function resolveLayout(ast: DiagramAst, automatic: LayoutResult, metadata?: LayoutMetadata): LayoutResult {
  if (!metadata) return automatic; const nodes = automatic.nodes.map((node) => { const geometry = metadata.nodes[node.id]; if (!geometry || geometry.positioning !== 'manual') return node; return { ...node, ...(Number.isFinite(geometry.x) ? { x: geometry.x! } : {}), ...(Number.isFinite(geometry.y) ? { y: geometry.y! } : {}), ...(Number.isFinite(geometry.width) && geometry.width! > 0 ? { width: geometry.width! } : {}), ...(Number.isFinite(geometry.height) && geometry.height! > 0 ? { height: geometry.height! } : {}) }; });
  const byId = new Map(nodes.map((node) => [node.id, node])); const edges = automatic.edges.map((edge) => { const geometry = metadata.edges[edge.id]; const astEdge = ast.edges.find((item) => item.id === edge.id); if (!geometry || geometry.routing === 'auto' || !astEdge) return edge; const source = byId.get(astEdge.from); const target = byId.get(astEdge.to); if (!source || !target) return edge; const route = manualRoute(geometry, source, target); const label = route[Math.floor(route.length / 2)]; return { ...edge, points: route, ...(label ? { label } : {}) }; });
  const padding = 24; const xs = nodes.flatMap((node) => [node.x - node.width / 2, node.x + node.width / 2]).concat(edges.flatMap((edge) => edge.points.map((point) => point.x))); const ys = nodes.flatMap((node) => [node.y - node.height / 2, node.y + node.height / 2]).concat(edges.flatMap((edge) => edge.points.map((point) => point.y))); return { ...automatic, nodes, edges, width: Math.max(automatic.width, ...xs) + padding, height: Math.max(automatic.height, ...ys) + padding };
}
export class DagreLayoutEngine implements LayoutEngine {
  readonly name = 'dagre';
  layout(ast: DiagramAst, options: LayoutOptions = {}): LayoutResult { const graph = new dagre.graphlib.Graph({ multigraph: true }); graph.setDefaultEdgeLabel(() => ({})); graph.setGraph({ rankdir: ast.direction, nodesep: options.nodeGap ?? 36, ranksep: options.rankGap ?? 60, marginx: options.padding ?? 24, marginy: options.padding ?? 24 }); for (const node of ast.nodes) graph.setNode(node.id, { width: Math.max(88, node.label.text.length * 8 + 32), height: node.shape === 'circle' ? 72 : 52 }); for (const edge of ast.edges) graph.setEdge(edge.from, edge.to, { label: edge.label?.text ?? '', width: edge.label ? edge.label.text.length * 8 + 12 : 0, height: edge.label ? 20 : 0 }, edge.id); dagre.layout(graph); const meta = graph.graph(); return { nodes: ast.nodes.map((node) => ({ id: node.id, ...graph.node(node.id) })), edges: ast.edges.map((edge) => { const value = graph.edge({ v: edge.from, w: edge.to, name: edge.id }); return { id: edge.id, points: value.points, ...(value.x !== undefined && value.y !== undefined ? { label: { x: value.x, y: value.y } } : {}) }; }), groups: [], width: meta.width ?? 0, height: meta.height ?? 0 }; }
}
