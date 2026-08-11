import { useEffect, useMemo, useState } from 'react';
import { BroadcastChannelTransport, IndexedDbWorkspaceRepository, WorkspaceController, parseWorkspaceLocation, type Workspace } from '@sculpt/workspace';
const randomId = (): string => globalThis.crypto?.randomUUID?.() ?? `view-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function useWorkspace() {
  const route = useMemo(() => parseWorkspaceLocation(window.location), []);
  const controller = useMemo(() => new WorkspaceController(new IndexedDbWorkspaceRepository(), new BroadcastChannelTransport(), { workspaceId: route.workspaceId, viewId: randomId(), viewType: route.viewType }), [route]);
  const [workspace, setWorkspace] = useState<Workspace>();
  useEffect(() => { const unsubscribe = controller.subscribe(setWorkspace); void controller.load(); const flush = () => void controller.flush(); window.addEventListener('pagehide', flush); return () => { unsubscribe(); window.removeEventListener('pagehide', flush); void controller.flush(); controller.disconnect(); }; }, [controller]);
  return { workspace, controller, viewType: route.viewType };
}
