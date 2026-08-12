import type { DiagramAst, DiagramNode } from '@sculpt/ast';
import type { LayoutResult, Point, PositionedNode } from '@sculpt/layout';
import { lightTheme, type DiagramTheme } from '@sculpt/themes';
const escapeXml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char);
const safeId = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, '_');
const points = (items: Point[]) => items.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
function shape(node: DiagramNode, box: PositionedNode, theme: DiagramTheme): string {
  const common = `fill="${theme.nodeFill}" stroke="${theme.nodeStroke}" stroke-width="2"`;
  const x = box.x - box.width / 2; const y = box.y - box.height / 2;
  if (node.shape === 'diamond') return `<polygon points="${box.x},${y} ${x + box.width},${box.y} ${box.x},${y + box.height} ${x},${box.y}" ${common}/>`;
  if (node.shape === 'circle') return `<ellipse cx="${box.x}" cy="${box.y}" rx="${box.width / 2}" ry="${box.height / 2}" ${common}/>`;
  if (node.shape === 'database') return `<path d="M${x} ${y + 8} C${x} ${y - 2},${x + box.width} ${y - 2},${x + box.width} ${y + 8}V${y + box.height - 8}C${x + box.width} ${y + box.height + 2},${x} ${y + box.height + 2},${x} ${y + box.height - 8}Z" ${common}/>`;
  const radius = node.shape === 'rounded' || node.shape === 'stadium' ? box.height / 2 : 4;
  return `<rect x="${x}" y="${y}" width="${box.width}" height="${box.height}" rx="${radius}" ${common}/>`;
}
export interface SvgRenderOptions { id?: string; theme?: DiagramTheme; title?: string }
export function renderSvg(ast: DiagramAst, layout: LayoutResult, options: SvgRenderOptions = {}): string {
  const theme = options.theme ?? lightTheme; const byId = new Map(ast.nodes.map((node) => [node.id, node]));
  const marker = `arrow-${safeId(options.id ?? 'diagram')}`;
  const edges = ast.edges.map((edge) => { const route = layout.edges.find((item) => item.id === edge.id); if (!route) return ''; const dash = edge.type === 'dotted-arrow' ? ' stroke-dasharray="5 5"' : ''; const width = edge.type === 'thick-arrow' ? 3 : 2; const arrow = edge.type === 'line' ? '' : ` marker-end="url(#${marker})"`; const label = edge.label && route.label ? `<text x="${route.label.x}" y="${route.label.y - 5}" text-anchor="middle">${escapeXml(edge.label.text)}</text>` : ''; return `<g class="edge"><polyline points="${points(route.points)}" fill="none" stroke="${theme.edge}" stroke-width="${width}"${dash}${arrow}/>${label}</g>`; }).join('');
  const nodes = layout.nodes.map((box) => { const node = byId.get(box.id); if (!node) return ''; return `<g id="node-${safeId(node.id)}" data-node-id="${safeId(node.id)}" class="node">${shape(node, box, theme)}<text x="${box.x}" y="${box.y}" text-anchor="middle" dominant-baseline="central">${escapeXml(node.label.text)}</text></g>`; }).join('');
  const title = escapeXml(options.title ?? 'SCULPT flowchart');
  return `<svg id="${safeId(options.id ?? 'diagram')}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}" viewBox="${Math.floor(layout.x)} ${Math.floor(layout.y)} ${Math.ceil(layout.width)} ${Math.ceil(layout.height)}" style="color:${theme.text};font-family:${theme.fontFamily}"><title>${title}</title><defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${theme.edge}"/></marker></defs><g fill="${theme.text}">${edges}${nodes}</g></svg>`;
}
