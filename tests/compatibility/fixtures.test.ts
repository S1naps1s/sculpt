import { expect, it } from 'vitest';
import { parse } from '@sculpt/core';
it('produces the expected common AST fixture', () => { const ast = parse('flowchart LR\nStart([Begin]) --> Stop[End]'); expect(ast).toMatchObject({ diagramType: 'flowchart', direction: 'LR', nodes: [{ id: 'Start', shape: 'stadium' }, { id: 'Stop', shape: 'rectangle' }], edges: [{ from: 'Start', to: 'Stop', type: 'arrow' }] }); });
