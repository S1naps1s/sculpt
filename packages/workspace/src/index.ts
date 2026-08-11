export type LayoutMode = 'auto' | 'manual' | 'hybrid';
export type NodePositioning = 'auto' | 'manual';
export type NodeSizing = 'auto' | 'manual';
export type Anchor = 'auto' | 'north' | 'east' | 'south' | 'west';
export type EdgeRouting = 'auto' | 'straight' | 'orthogonal' | 'bezier' | 'manual';
export interface Point { x: number; y: number }
export interface NodeGeometry { x?: number; y?: number; width?: number; height?: number; positionLocked?: boolean; positioning?: NodePositioning; sizing?: NodeSizing }
export interface EdgeGeometry { sourceAnchor?: Anchor; targetAnchor?: Anchor; routing: EdgeRouting; waypoints?: Point[]; routingLocked?: boolean }
export interface GridConfiguration { visible: boolean; snap: boolean; spacing: number }
export interface LayoutMetadata { mode: LayoutMode; nodes: Record<string, NodeGeometry>; edges: Record<string, EdgeGeometry>; grid: GridConfiguration }
export interface WorkspaceConfiguration { layoutEngine: string }
export interface Workspace { id: string; name: string; source: string; diagramType?: string; configuration: WorkspaceConfiguration; layout: LayoutMetadata; theme: 'light' | 'dark'; revision: number; createdAt: number; updatedAt: number }
export type ViewType = 'editor' | 'preview' | 'split' | 'inspector' | 'presentation';
export interface WorkspaceView { workspaceId: string; viewId: string; viewType: ViewType }
export type EditorSelection = { type: 'nodes'; nodeIds: string[]; primaryNodeId: string } | { type: 'edge'; edgeId: string; waypointIndex?: number } | undefined;
export interface WorkspaceSummary { id: string; name: string; updatedAt: number }
export interface WorkspaceRepository { get(id: string): Promise<Workspace | undefined>; save(workspace: Workspace): Promise<void>; delete(id: string): Promise<void>; list(): Promise<WorkspaceSummary[]> }

const DEFAULT_SOURCE = 'flowchart LR\n  idea([Idea]) --> build[Build]\n  build ==> review{Ready?}\n  review --> launch((Launch))';
export function createWorkspace(id: string, now = Date.now()): Workspace { return { id, name: 'Untitled workspace', source: DEFAULT_SOURCE, configuration: { layoutEngine: 'dagre' }, layout: { mode: 'auto', nodes: {}, edges: {}, grid: { visible: true, snap: false, spacing: 20 } }, theme: 'dark', revision: 0, createdAt: now, updatedAt: now }; }
const finite = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value);
export function normalizeNodeGeometry(input: NodeGeometry): NodeGeometry {
  const result: NodeGeometry = { positioning: input.positioning ?? 'auto', sizing: input.sizing ?? 'auto', positionLocked: input.positionLocked ?? false };
  if (finite(input.x)) result.x = input.x; if (finite(input.y)) result.y = input.y;
  if (finite(input.width) && input.width > 0) result.width = input.width; if (finite(input.height) && input.height > 0) result.height = input.height;
  return result;
}
export function normalizePoint(input: Point): Point | undefined { return finite(input.x) && finite(input.y) ? { x: input.x, y: input.y } : undefined; }
export function normalizeWorkspace(input: Workspace): Workspace {
  const spacing = finite(input.layout.grid.spacing) && input.layout.grid.spacing > 0 ? input.layout.grid.spacing : 20;
  const nodes = Object.fromEntries(Object.entries(input.layout.nodes).map(([id, value]) => [id, normalizeNodeGeometry(value)]));
  const edges = Object.fromEntries(Object.entries(input.layout.edges).map(([id, edge]) => [id, { ...edge, routing: edge.routing ?? 'auto', ...(edge.waypoints ? { waypoints: edge.waypoints.map(normalizePoint).filter((point): point is Point => point !== undefined) } : {}) }]));
  return { ...input, revision: Math.max(0, Math.floor(input.revision)), layout: { ...input.layout, nodes, edges, grid: { ...input.layout.grid, spacing } } };
}
export function moveNode(workspace: Workspace, id: string, x: number, y: number, force = false): Workspace {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return workspace; const current = normalizeNodeGeometry(workspace.layout.nodes[id] ?? {}); if (current.positionLocked && !force) return workspace;
  const spacing = workspace.layout.grid.spacing; const snap = (value: number) => workspace.layout.grid.snap ? Math.round(value / spacing) * spacing : value;
  return { ...workspace, layout: { ...workspace.layout, mode: workspace.layout.mode === 'auto' ? 'hybrid' : workspace.layout.mode, nodes: { ...workspace.layout.nodes, [id]: { ...current, x: snap(x), y: snap(y), positioning: 'manual' } } } };
}

export class MemoryWorkspaceRepository implements WorkspaceRepository {
  private readonly records = new Map<string, Workspace>();
  async get(id: string): Promise<Workspace | undefined> { return this.records.get(id); }
  async save(workspace: Workspace): Promise<void> { this.records.set(workspace.id, structuredClone(workspace)); }
  async delete(id: string): Promise<void> { this.records.delete(id); }
  async list(): Promise<WorkspaceSummary[]> { return [...this.records.values()].map(({ id, name, updatedAt }) => ({ id, name, updatedAt })).sort((a, b) => b.updatedAt - a.updatedAt); }
}
export class IndexedDbWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly databaseName = 'sculpt-workspaces') {}
  private open(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open(this.databaseName, 1); request.onupgradeneeded = () => request.result.createObjectStore('workspaces', { keyPath: 'id' }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  private async request<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> { const db = await this.open(); return new Promise((resolve, reject) => { const transaction = db.transaction('workspaces', mode); const request = action(transaction.objectStore('workspaces')); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); transaction.oncomplete = () => db.close(); }); }
  async get(id: string): Promise<Workspace | undefined> { const value = await this.request<Workspace | undefined>('readonly', (store) => store.get(id)); return value ? normalizeWorkspace(value) : undefined; }
  async save(workspace: Workspace): Promise<void> { await this.request<IDBValidKey>('readwrite', (store) => store.put(normalizeWorkspace(workspace))); }
  async delete(id: string): Promise<void> { await this.request<undefined>('readwrite', (store) => store.delete(id)); }
  async list(): Promise<WorkspaceSummary[]> { const values = await this.request<Workspace[]>('readonly', (store) => store.getAll()); return values.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })).sort((a, b) => b.updatedAt - a.updatedAt); }
}

export interface WorkspaceUpdatedEvent { type: 'workspace.updated'; eventId: string; workspaceId: string; originViewId: string; revision: number; workspace: Workspace }
export type WorkspaceEvent = WorkspaceUpdatedEvent;
export interface WorkspaceTransport { connect(workspaceId: string): void; publish(event: WorkspaceEvent): void; subscribe(handler: (event: WorkspaceEvent) => void): () => void; disconnect(): void }
export class BroadcastChannelTransport implements WorkspaceTransport {
  private channel: BroadcastChannel | undefined; private readonly handlers = new Set<(event: WorkspaceEvent) => void>();
  connect(workspaceId: string): void { this.disconnect(); this.channel = new BroadcastChannel(`sculpt:${workspaceId}`); this.channel.onmessage = (message: MessageEvent<WorkspaceEvent>) => { for (const handler of this.handlers) handler(message.data); }; }
  publish(event: WorkspaceEvent): void { this.channel?.postMessage(event); }
  subscribe(handler: (event: WorkspaceEvent) => void): () => void { this.handlers.add(handler); return () => this.handlers.delete(handler); }
  disconnect(): void { this.channel?.close(); this.channel = undefined; }
}
export class MemoryWorkspaceTransport implements WorkspaceTransport {
  private static channels = new Map<string, Set<MemoryWorkspaceTransport>>(); private workspaceId: string | undefined; private readonly handlers = new Set<(event: WorkspaceEvent) => void>();
  connect(workspaceId: string): void { this.disconnect(); this.workspaceId = workspaceId; const peers = MemoryWorkspaceTransport.channels.get(workspaceId) ?? new Set(); peers.add(this); MemoryWorkspaceTransport.channels.set(workspaceId, peers); }
  publish(event: WorkspaceEvent): void { if (!this.workspaceId) return; for (const peer of MemoryWorkspaceTransport.channels.get(this.workspaceId) ?? []) { if (peer !== this) for (const handler of peer.handlers) handler(event); } }
  subscribe(handler: (event: WorkspaceEvent) => void): () => void { this.handlers.add(handler); return () => this.handlers.delete(handler); }
  disconnect(): void { if (this.workspaceId) MemoryWorkspaceTransport.channels.get(this.workspaceId)?.delete(this); this.workspaceId = undefined; }
}

export type WorkspaceChangeOrigin = 'load' | 'local' | 'remote';
export class WorkspaceController {
  private workspace?: Workspace; private readonly listeners = new Set<(workspace: Workspace, origin: WorkspaceChangeOrigin) => void>(); private unsubscribe?: () => void; private saveTimer?: ReturnType<typeof setTimeout>;
  constructor(private readonly repository: WorkspaceRepository, private readonly transport: WorkspaceTransport, readonly view: WorkspaceView, private readonly saveDelay = 250) {}
  async load(): Promise<Workspace> { this.workspace = await this.repository.get(this.view.workspaceId) ?? createWorkspace(this.view.workspaceId); this.transport.connect(this.view.workspaceId); this.unsubscribe = this.transport.subscribe((event) => this.receive(event)); this.emit('load'); return this.workspace; }
  get current(): Workspace | undefined { return this.workspace; }
  subscribe(listener: (workspace: Workspace, origin: WorkspaceChangeOrigin) => void): () => void { this.listeners.add(listener); if (this.workspace) listener(this.workspace, 'load'); return () => this.listeners.delete(listener); }
  update(recipe: (workspace: Workspace) => Workspace): Workspace { if (!this.workspace) throw new Error('Workspace is not loaded.'); const now = Date.now(); this.workspace = normalizeWorkspace({ ...recipe(this.workspace), id: this.workspace.id, revision: this.workspace.revision + 1, updatedAt: now }); this.emit('local'); this.scheduleSave(); this.transport.publish({ type: 'workspace.updated', eventId: `${this.view.viewId}:${this.workspace.revision}`, workspaceId: this.workspace.id, originViewId: this.view.viewId, revision: this.workspace.revision, workspace: this.workspace }); return this.workspace; }
  async flush(): Promise<void> { if (this.saveTimer) clearTimeout(this.saveTimer); if (this.workspace) await this.repository.save(this.workspace); }
  disconnect(): void { this.unsubscribe?.(); this.transport.disconnect(); if (this.saveTimer) clearTimeout(this.saveTimer); }
  private receive(event: WorkspaceEvent): void { if (!this.workspace || event.workspaceId !== this.workspace.id || event.originViewId === this.view.viewId || event.revision <= this.workspace.revision) return; this.workspace = normalizeWorkspace(event.workspace); this.emit('remote'); this.scheduleSave(); }
  private emit(origin: WorkspaceChangeOrigin): void { if (this.workspace) for (const listener of this.listeners) listener(this.workspace, origin); }
  private scheduleSave(): void { if (this.saveTimer) clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => void this.flush(), this.saveDelay); }
}

export * from './precision';
export * from './history';
export * from './selection';

export function parseWorkspaceLocation(location: Pick<Location, 'pathname' | 'search'>): { workspaceId: string; viewType: ViewType } {
  const match = /^\/workspace\/([^/]+)/.exec(location.pathname); const workspaceId = decodeURIComponent(match?.[1] ?? 'local'); const candidate = new URLSearchParams(location.search).get('view'); const types: ViewType[] = ['editor', 'preview', 'split', 'inspector', 'presentation']; return { workspaceId, viewType: types.includes(candidate as ViewType) ? candidate as ViewType : 'split' };
}
