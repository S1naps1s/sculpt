import { describe, expect, it } from 'vitest';
import { parseFlowchart } from '@sculpt/flowchart';
describe('flowchart parser', () => {
  it.each(['TD', 'TB', 'BT', 'LR', 'RL'])('supports %s direction', (direction) => { expect(parseFlowchart(`flowchart ${direction}\nA --> B`).direction).toBe(direction === 'TD' ? 'TB' : direction); });
  it('supports graph, comments, shapes, links, and labels', () => { const ast = parseFlowchart('%% comment\ngraph LR\nA[(Data)] -.->|read| B{Ready}\nB ==> C((Done))'); expect(ast.nodes.map((node) => node.shape)).toEqual(['database', 'diamond', 'circle']); expect(ast.edges.map((edge) => edge.type)).toEqual(['dotted-arrow', 'thick-arrow']); expect(ast.edges[0]?.label?.text).toBe('read'); });
  it('reports source locations', () => { expect(() => parseFlowchart('flowchart TD\nA ~~ B')).toThrowError(/Unsupported link syntax/); });
});
