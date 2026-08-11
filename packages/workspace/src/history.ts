import type { EdgeGeometry, LayoutMode, NodeGeometry, Workspace } from './index';

export interface PrecisionHistoryState {
  mode: LayoutMode;
  nodes: Record<string, NodeGeometry>;
  edges: Record<string, EdgeGeometry>;
}
interface HistoryEntry { previous: PrecisionHistoryState; next: PrecisionHistoryState }
export function projectPrecisionState(workspace: Workspace): PrecisionHistoryState { return structuredClone({ mode: workspace.layout.mode, nodes: workspace.layout.nodes, edges: workspace.layout.edges }); }
export function applyPrecisionState(workspace: Workspace, state: PrecisionHistoryState): Workspace { return { ...workspace, layout: { ...workspace.layout, mode: state.mode, nodes: structuredClone(state.nodes), edges: structuredClone(state.edges) } }; }
const stateValue = (state: PrecisionHistoryState) => JSON.stringify(state);
export class WorkspaceHistory {
  private undoEntries: HistoryEntry[] = []; private redoEntries: HistoryEntry[] = []; private transactionStart: PrecisionHistoryState | undefined;
  constructor(private readonly limit = 100) {}
  get canUndo(): boolean { return this.undoEntries.length > 0; } get canRedo(): boolean { return this.redoEntries.length > 0; }
  push(previous: Workspace, next: Workspace): void { const previousState = projectPrecisionState(previous); const nextState = projectPrecisionState(next); if (stateValue(previousState) === stateValue(nextState)) return; this.undoEntries.push({ previous: previousState, next: nextState }); if (this.undoEntries.length > this.limit) this.undoEntries.shift(); this.redoEntries = []; }
  begin(workspace: Workspace): void { if (!this.transactionStart) this.transactionStart = projectPrecisionState(workspace); }
  commit(workspace: Workspace): void { const previous = this.transactionStart; this.transactionStart = undefined; if (!previous) return; const next = projectPrecisionState(workspace); if (stateValue(previous) === stateValue(next)) return; this.undoEntries.push({ previous, next }); if (this.undoEntries.length > this.limit) this.undoEntries.shift(); this.redoEntries = []; }
  cancel(): void { this.transactionStart = undefined; }
  undo(current: Workspace): Workspace | undefined { const entry = this.undoEntries.pop(); if (!entry) return undefined; this.redoEntries.push(entry); return applyPrecisionState(current, entry.previous); }
  redo(current: Workspace): Workspace | undefined { const entry = this.redoEntries.pop(); if (!entry) return undefined; this.undoEntries.push(entry); return applyPrecisionState(current, entry.next); }
  clear(): void { this.undoEntries = []; this.redoEntries = []; this.transactionStart = undefined; }
}
