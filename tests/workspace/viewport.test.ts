import { expect, it } from 'vitest';
import { MAX_ZOOM, MIN_ZOOM, calculateFitScale, clampZoom } from '@sculpt/workspace';
it('calculates fit scale with padding and a readable small-diagram cap', () => { expect(calculateFitScale({ width: 1000, height: 800 }, { width: 500, height: 400 }, 50)).toBe(1.5); expect(calculateFitScale({ width: 500, height: 400 }, { width: 1000, height: 800 }, 0)).toBe(.5); });
it('supports negative-coordinate and manually enlarged layouts through extent sizing', () => { expect(calculateFitScale({ width: 800, height: 600 }, { width: 1600, height: 1200 }, 0)).toBe(.5); });
it('clamps every zoom path to common limits', () => { expect(clampZoom(0)).toBe(MIN_ZOOM); expect(clampZoom(20)).toBe(MAX_ZOOM); expect(clampZoom(1)).toBe(1); });
