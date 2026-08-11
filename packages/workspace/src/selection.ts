import type { EditorSelection } from './index';

export function createNodeSelection(nodeIds: readonly string[], preferredPrimary?: string): EditorSelection {
  const uniqueIds = [...new Set(nodeIds)];
  if (uniqueIds.length === 0) return undefined;
  const primaryNodeId = preferredPrimary && uniqueIds.includes(preferredPrimary) ? preferredPrimary : uniqueIds[0]!;
  return { type: 'nodes', nodeIds: uniqueIds, primaryNodeId };
}

export function toggleNodeSelection(selection: EditorSelection, nodeId: string): EditorSelection {
  if (selection?.type !== 'nodes') return createNodeSelection([nodeId], nodeId);
  if (!selection.nodeIds.includes(nodeId)) return createNodeSelection([...selection.nodeIds, nodeId], selection.primaryNodeId);
  return createNodeSelection(selection.nodeIds.filter((id) => id !== nodeId), selection.primaryNodeId);
}
