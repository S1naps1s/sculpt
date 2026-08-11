import { describe, expect, it } from 'vitest';
import { createNodeSelection, createWorkspace, matchNodeSize, toggleNodeSelection, type NodeFrame } from '@sculpt/workspace';

describe('node selection invariants', () => {
  const selection = createNodeSelection(['a', 'b', 'c'], 'a');

  it('preserves the primary when removing a non-primary node', () => {
    expect(toggleNodeSelection(selection, 'b')).toEqual({ type: 'nodes', nodeIds: ['a', 'c'], primaryNodeId: 'a' });
  });

  it('chooses the first remaining node when removing the primary', () => {
    expect(toggleNodeSelection(selection, 'a')).toEqual({ type: 'nodes', nodeIds: ['b', 'c'], primaryNodeId: 'b' });
  });

  it('clears selection when removing the final node', () => {
    expect(toggleNodeSelection(createNodeSelection(['a'], 'a'), 'a')).toBeUndefined();
  });

  it('preserves the existing primary when adding a node', () => {
    expect(toggleNodeSelection(createNodeSelection(['a', 'b'], 'a'), 'c')).toEqual({ type: 'nodes', nodeIds: ['a', 'b', 'c'], primaryNodeId: 'a' });
  });

  it('uses the replacement primary for match width and height after removal', () => {
    const next = toggleNodeSelection(selection, 'a');
    expect(next?.type).toBe('nodes');
    if (next?.type !== 'nodes') return;
    const frames: NodeFrame[] = [
      { id: 'b', x: 0, y: 0, width: 80, height: 60, locked: false },
      { id: 'c', x: 100, y: 100, width: 30, height: 20, locked: false },
    ];
    const width = matchNodeSize(createWorkspace('match-width'), frames, next.primaryNodeId, 'width');
    const height = matchNodeSize(createWorkspace('match-height'), frames, next.primaryNodeId, 'height');
    expect(width.layout.nodes.c?.width).toBe(80);
    expect(height.layout.nodes.c?.height).toBe(60);
  });
});
