import { expect, it } from 'vitest';
import { pointAlongRoute, routeMidpoint } from '@sculpt/layout';
it('finds the midpoint of a straight route', () => { expect(routeMidpoint([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toEqual({ x: 5, y: 0 }); });
it('interpolates across multiple unequal segments by arc length', () => { expect(routeMidpoint([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 8 }])).toEqual({ x: 2, y: 3 }); expect(pointAlongRoute([{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 30, y: 10 }], .75)).toEqual({ x: 20, y: 10 }); });
it('handles empty, one-point, duplicate, and zero-length routes', () => { expect(routeMidpoint([])).toBeUndefined(); expect(routeMidpoint([{ x: 2, y: 3 }])).toEqual({ x: 2, y: 3 }); expect(routeMidpoint([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }])).toEqual({ x: 5, y: 0 }); expect(routeMidpoint([{ x: 4, y: 5 }, { x: 4, y: 5 }])).toEqual({ x: 4, y: 5 }); });
