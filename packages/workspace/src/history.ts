import type { Workspace } from './index';
interface HistoryEntry { previous: Workspace; next: Workspace }
const documentValue = (workspace: Workspace) => JSON.stringify({ ...workspace, revision: 0, updatedAt: 0 });
export class WorkspaceHistory {
  private undoEntries: HistoryEntry[] = []; private redoEntries: HistoryEntry[] = []; private transactionStart: Workspace | undefined;
  constructor(private readonly limit = 100) {}
  get canUndo(): boolean { return this.undoEntries.length > 0; } get canRedo(): boolean { return this.redoEntries.length > 0; }
  push(previous: Workspace, next: Workspace): void { if (previous === next || documentValue(previous) === documentValue(next)) return; this.undoEntries.push({ previous: structuredClone(previous), next: structuredClone(next) }); if (this.undoEntries.length > this.limit) this.undoEntries.shift(); this.redoEntries = []; }
  begin(workspace: Workspace): void { if (!this.transactionStart) this.transactionStart = structuredClone(workspace); }
  commit(workspace: Workspace): void { const previous = this.transactionStart; this.transactionStart = undefined; if (previous) this.push(previous, workspace); }
  cancel(): void { this.transactionStart = undefined; }
  undo(): Workspace | undefined { const entry = this.undoEntries.pop(); if (!entry) return undefined; this.redoEntries.push(entry); return structuredClone(entry.previous); }
  redo(): Workspace | undefined { const entry = this.redoEntries.pop(); if (!entry) return undefined; this.undoEntries.push(entry); return structuredClone(entry.next); }
  clear(): void { this.undoEntries = []; this.redoEntries = []; this.transactionStart = undefined; }
}
