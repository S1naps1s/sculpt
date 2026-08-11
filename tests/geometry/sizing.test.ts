import { expect, it } from 'vitest';
import { automaticNodeSize } from '@sculpt/layout';
import { render } from '@sculpt/core';
import { createWorkspace } from '@sculpt/workspace';
it('uses larger automatic minimum rectangle dimensions', () => { expect(automaticNodeSize('A', 'rectangle')).toEqual({ width: 120, height: 64 }); });
it('expands long labels', () => { expect(automaticNodeSize('A very long department label', 'rectangle').width).toBeGreaterThan(240); });
it('sizes special shapes with additional height', () => { expect(automaticNodeSize('Data', 'database').height).toBe(72); expect(automaticNodeSize('Decision', 'diamond').height).toBe(80); expect(automaticNodeSize('Circle', 'circle').height).toBe(84); });
it('keeps manual width and height authoritative', () => { const source = 'flowchart LR\nA --> B'; const workspace = createWorkspace('manual-size'); workspace.layout.nodes.A = { width: 222, height: 111, sizing: 'manual' }; expect(render('manual-size', source, { metadata: workspace.layout }).layout.nodes.find((node) => node.id === 'A')).toMatchObject({ width: 222, height: 111 }); });
