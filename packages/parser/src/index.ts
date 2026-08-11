import { DiagramError, type DiagramAst } from '@sculpt/ast';
export type DiagramType = 'flowchart';
export interface DiagramParser { readonly type: DiagramType; parse(source: string): DiagramAst }
export function detectType(source: string): DiagramType {
  const lines = source.split(/\r?\n/); const index = lines.findIndex((line) => line.trim() && !line.trim().startsWith('%%'));
  const text = index >= 0 ? lines[index]?.trim() ?? '' : '';
  const range = { start: { line: index + 1 || 1, column: 1 }, end: { line: index + 1 || 1, column: text.length + 1 } };
  if (!text) throw new DiagramError({ code: 'DETECT_EMPTY', message: 'Diagram source is empty.', stage: 'detection', severity: 'error', range });
  if (/^(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\b/i.test(text)) return 'flowchart';
  throw new DiagramError({ code: 'DETECT_UNKNOWN', message: `Unsupported diagram declaration: ${text}`, stage: 'detection', severity: 'error', range });
}
