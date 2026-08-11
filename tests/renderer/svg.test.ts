import { expect, it } from 'vitest';
import { render, validate } from '@sculpt/core';
it('renders deterministic accessible SVG', () => { const result = render('fixture', 'flowchart TD\nA[Hello] --> B((World))'); expect(result.svg).toContain('<svg id="fixture"'); expect(result.svg).toContain('aria-label='); expect(result.svg).toMatchSnapshot(); });
it('escapes untrusted labels', () => { const result = render('safe', 'flowchart TD\nA[<script>alert(1)</script>]'); expect(result.svg).not.toContain('<script>'); expect(result.svg).toContain('&lt;script&gt;'); });
it('validates without throwing', () => { const result = validate('flowchart TD\nA ~~ B'); expect(result.valid).toBe(false); expect(result.diagnostics[0]?.range?.start.line).toBe(2); });
it('keeps editor interaction overlays out of exported SVG', () => { const svg = render('export', 'flowchart LR\nA --> B').svg; expect(svg).not.toContain('interaction-overlay'); expect(svg).not.toContain('edge-hit'); expect(svg).not.toContain('waypoint'); expect(svg).not.toContain('marquee'); });
