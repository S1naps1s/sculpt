import type { LayoutResult, Point, PositionedNode } from '@sculpt/layout';
import { selectionBounds, type AlignmentGuide, type EditorSelection, type ResizeHandle, type Workspace } from '@sculpt/workspace';

const handles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const handlePoint = (node: PositionedNode, handle: ResizeHandle): Point => ({ x: node.x + (handle.includes('e') ? node.width / 2 : handle.includes('w') ? -node.width / 2 : 0), y: node.y + (handle.includes('s') ? node.height / 2 : handle.includes('n') ? -node.height / 2 : 0) });
const svgPoints = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ');
interface Props { layout: LayoutResult; workspace: Workspace; selection: EditorSelection; scale: number; guides: AlignmentGuide[]; marquee?: { start: Point; end: Point } }
export function EditorOverlay({ layout, workspace, selection, scale, guides, marquee }: Props) {
  const selectedIds = selection?.type === 'nodes' ? selection.nodeIds : []; const selectedEdge = selection?.type === 'edge' ? selection.edgeId : undefined; const selectedWaypoints = selectedEdge ? workspace.layout.edges[selectedEdge]?.waypoints ?? [] : []; const selectedNodes = layout.nodes.filter((node) => selectedIds.includes(node.id)); const bounds = selectionBounds(selectedNodes.map((node) => ({ ...node, locked: false }))); const only = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
  return <svg className="interaction-overlay" viewBox={`${layout.x} ${layout.y} ${layout.width} ${layout.height}`} aria-label="Diagram interaction layer">
    {layout.edges.map((edge) => <g key={edge.id}><polyline data-overlay-edge={edge.id} className="edge-hit" points={svgPoints(edge.points)}/>{selectedEdge === edge.id && <polyline className="edge-selected" points={svgPoints(edge.points)}/>}</g>)}
    {layout.nodes.map((node) => <rect key={node.id} data-overlay-node={node.id} className={`node-hit ${selectedIds.includes(node.id) ? 'selected' : ''} ${workspace.layout.nodes[node.id]?.positionLocked ? 'locked' : ''}`} x={node.x - node.width / 2} y={node.y - node.height / 2} width={node.width} height={node.height} rx="5"/>)}
    {bounds && selectedNodes.length > 1 && <rect data-selection-bounds className="selection-bounds" x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height}/>} 
    {only && handles.map((handle) => { const point = handlePoint(only, handle); return <circle key={handle} tabIndex={0} role="button" aria-label={`Resize ${handle}`} data-resize-handle={handle} className={`resize-handle resize-${handle}`} cx={point.x} cy={point.y} r={7 / scale}/>; })}
    {guides.map((guide, index) => guide.axis === 'x' ? <line key={`${guide.axis}-${guide.position}-${index}`} data-alignment-guide="x" className="alignment-guide" x1={guide.position} x2={guide.position} y1={layout.y} y2={layout.y + layout.height}/> : <line key={`${guide.axis}-${guide.position}-${index}`} data-alignment-guide="y" className="alignment-guide" x1={layout.x} x2={layout.x + layout.width} y1={guide.position} y2={guide.position}/>)}
    {selectedEdge && selectedWaypoints.map((point, index) => <circle key={`${selectedEdge}-${index}`} data-waypoint={`${selectedEdge}:${index}`} className={`waypoint ${selection?.type === 'edge' && selection.waypointIndex === index ? 'selected' : ''}`} cx={point.x} cy={point.y} r={6 / scale}/>)}
    {marquee && <rect className="marquee" x={Math.min(marquee.start.x, marquee.end.x)} y={Math.min(marquee.start.y, marquee.end.y)} width={Math.abs(marquee.end.x - marquee.start.x)} height={Math.abs(marquee.end.y - marquee.start.y)}/>} 
  </svg>;
}
