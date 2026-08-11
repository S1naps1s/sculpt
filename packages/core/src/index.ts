import { DiagramError, type Diagnostic, type DiagramAst } from '@sculpt/ast';
import { parseFlowchart } from '@sculpt/flowchart';
import { DagreLayoutEngine, resolveLayout, type LayoutEngine, type LayoutOptions, type LayoutResult } from '@sculpt/layout';
import { detectType } from '@sculpt/parser';
import { renderSvg } from '@sculpt/renderer-svg';
import { themes, type DiagramTheme } from '@sculpt/themes';
import type { LayoutMetadata } from '@sculpt/workspace';
export interface InitializeOptions { layoutEngine?: LayoutEngine; theme?: DiagramTheme }
export interface RenderOptions { theme?: keyof typeof themes | DiagramTheme; layout?: LayoutOptions; metadata?: LayoutMetadata }
export interface RenderResult { svg: string; ast: DiagramAst; layout: LayoutResult; width: number; height: number }
export interface ValidationResult { valid: boolean; diagnostics: Diagnostic[]; ast?: DiagramAst }
let defaults: Required<InitializeOptions> = { layoutEngine: new DagreLayoutEngine(), theme: themes.light };
export function initialize(options: InitializeOptions = {}): void { defaults = { layoutEngine: options.layoutEngine ?? defaults.layoutEngine, theme: options.theme ?? defaults.theme }; }
export { detectType };
export function parse(source: string): DiagramAst { const type = detectType(source); if (type === 'flowchart') return parseFlowchart(source); throw new DiagramError({ code: 'PARSE_UNSUPPORTED', message: `No parser registered for ${String(type)}.`, stage: 'parse', severity: 'error' }); }
export function validate(source: string): ValidationResult { try { return { valid: true, diagnostics: [], ast: parse(source) }; } catch (error) { const diagnostic = error instanceof DiagramError ? error.diagnostic : { code: 'INTERNAL', message: error instanceof Error ? error.message : 'Unknown error', stage: 'parse' as const, severity: 'error' as const }; return { valid: false, diagnostics: [diagnostic] }; } }
export function render(id: string, source: string, options: RenderOptions = {}): RenderResult { const ast = parse(source); const layout = resolveLayout(ast, defaults.layoutEngine.layout(ast, options.layout), options.metadata); const theme = typeof options.theme === 'string' ? themes[options.theme] : options.theme ?? defaults.theme; return { svg: renderSvg(ast, layout, { id, theme }), ast, layout, width: layout.width, height: layout.height }; }
export type { Diagnostic, DiagramAst } from '@sculpt/ast';
