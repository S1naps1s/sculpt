import { DiagramError, type DiagramAst, type DiagramNode, type Direction, type EdgeType, type NodeShape, type SourceRange } from '@sculpt/ast';
const ID = '[A-Za-z_][A-Za-z0-9_-]*';
const nodePattern = new RegExp(`^(${ID})(?:\\(\\[([^\\]]*)\\]\\)|\\[\\[([^\\]]*)\\]\\]|\\[\\(([^)]*)\\)\\]|\\(\\(([^)]*)\\)\\)|\\(([^)]*)\\)|\\{([^}]*)\\}|\\[([^\\]]*)\\])?`);
const edgePattern = /^(?:\|([^|]*)\|\s*)?(-->|---|-\.->|==>)\s*(?:\|([^|]*)\|\s*)?/;
const shapes: NodeShape[] = ['stadium', 'subroutine', 'database', 'circle', 'rounded', 'diamond', 'rectangle'];
const edgeTypes: Record<string, EdgeType> = { '-->': 'arrow', '---': 'line', '-.->': 'dotted-arrow', '==>': 'thick-arrow' };
function edgeId(from: string, to: string, type: EdgeType, label: string, occurrence: number): string { let hash = 2166136261; for (const char of `${from}\0${to}\0${type}\0${label}`) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return `edge-${(hash >>> 0).toString(36)}-${occurrence}`; }
function range(line: number, length: number): SourceRange { return { start: { line, column: 1 }, end: { line, column: length + 1 } }; }
function parseNode(input: string, line: number): { node: DiagramNode; rest: string } | undefined {
  const match = nodePattern.exec(input.trimStart()); if (!match) return undefined; const id = match[1]; if (!id) return undefined;
  const labelIndex = match.slice(2).findIndex((value) => value !== undefined); const label = labelIndex >= 0 ? match[labelIndex + 2] ?? id : id;
  return { node: { id, label: { text: label }, shape: labelIndex >= 0 ? shapes[labelIndex] ?? 'rectangle' : 'rectangle', classes: [], metadata: {}, source: range(line, match[0].length) }, rest: input.trimStart().slice(match[0].length).trim() };
}
function fail(message: string, line: number, text: string): never { throw new DiagramError({ code: 'FLOW_PARSE', message, stage: 'parse', severity: 'error', range: range(line, text.length) }); }
export function parseFlowchart(source: string): DiagramAst {
  const lines = source.split(/\r?\n/); let headerSeen = false; let direction: Direction = 'TB'; const nodeMap = new Map<string, DiagramNode>(); const edges: DiagramAst['edges'] = []; const occurrences = new Map<string, number>();
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? ''; const text = raw.trim(); const line = index + 1; if (!text || text.startsWith('%%')) continue;
    if (!headerSeen) { const header = /^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\s*$/i.exec(text); if (!header) fail('Expected a flowchart declaration.', line, raw); direction = (header[1]?.toUpperCase() === 'TD' ? 'TB' : header[1]?.toUpperCase()) as Direction; headerSeen = true; continue; }
    const left = parseNode(text, line); if (!left) fail(`Invalid flowchart statement: ${text}`, line, raw); const previous = nodeMap.get(left.node.id); nodeMap.set(left.node.id, previous && left.node.label.text === left.node.id ? previous : left.node); if (!left.rest) continue;
    const edge = edgePattern.exec(left.rest); if (!edge) fail(`Unsupported link syntax: ${left.rest}`, line, raw);
    const right = parseNode(left.rest.slice(edge[0].length), line); if (!right || right.rest) fail('Expected a node after the link.', line, raw);
    const existing = nodeMap.get(right.node.id); nodeMap.set(right.node.id, existing && right.node.label.text === right.node.id ? existing : right.node);
    const label = edge[1] ?? edge[3]; const token = edge[2] ?? '-->';
    const type = edgeTypes[token] ?? 'arrow'; const cleanLabel = label?.trim() ?? ''; const key = `${left.node.id}\0${right.node.id}\0${type}\0${cleanLabel}`; const occurrence = (occurrences.get(key) ?? 0) + 1; occurrences.set(key, occurrence);
    edges.push({ id: edgeId(left.node.id, right.node.id, type, cleanLabel, occurrence), from: left.node.id, to: right.node.id, type, ...(cleanLabel ? { label: { text: cleanLabel } } : {}), classes: [], metadata: {}, source: range(line, raw.length) });
  }
  if (!headerSeen) fail('Diagram source is empty.', 1, '');
  return { kind: 'diagram', version: 1, diagramType: 'flowchart', direction, nodes: [...nodeMap.values()], edges, groups: [], styles: [], classes: {}, metadata: {}, config: { direction } };
}
