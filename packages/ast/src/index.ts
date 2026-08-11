export type Direction = 'TB' | 'BT' | 'LR' | 'RL';
export type NodeShape = 'rectangle' | 'rounded' | 'stadium' | 'subroutine' | 'database' | 'circle' | 'diamond';
export type EdgeType = 'arrow' | 'line' | 'dotted-arrow' | 'thick-arrow';
export interface SourcePosition { line: number; column: number }
export interface SourceRange { start: SourcePosition; end: SourcePosition }
export interface Label { text: string }
export interface DiagramNode { id: string; label: Label; shape: NodeShape; classes: string[]; metadata: Record<string, string>; source?: SourceRange }
export interface DiagramEdge { id: string; from: string; to: string; type: EdgeType; label?: Label; classes: string[]; metadata: Record<string, string>; source?: SourceRange }
export interface DiagramGroup { id: string; label?: Label; nodeIds: string[]; groupIds: string[]; classes: string[]; metadata: Record<string, string> }
export interface DiagramStyle { target: string; properties: Record<string, string> }
export interface DiagramConfig { direction: Direction; theme?: string; layout?: string }
export interface DiagramAst { kind: 'diagram'; version: 1; diagramType: string; direction: Direction; nodes: DiagramNode[]; edges: DiagramEdge[]; groups: DiagramGroup[]; styles: DiagramStyle[]; classes: Record<string, Record<string, string>>; metadata: Record<string, string>; config: DiagramConfig }
export type ErrorStage = 'detection' | 'parse' | 'layout' | 'render';
export interface Diagnostic { code: string; message: string; stage: ErrorStage; severity: 'error' | 'warning'; range?: SourceRange }
export class DiagramError extends Error { readonly diagnostic: Diagnostic; constructor(diagnostic: Diagnostic) { super(diagnostic.message); this.name = 'DiagramError'; this.diagnostic = diagnostic; } }
