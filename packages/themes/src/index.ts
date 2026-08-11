export interface DiagramTheme { name: string; background: string; nodeFill: string; nodeStroke: string; text: string; edge: string; accent: string; fontFamily: string }
export const lightTheme: DiagramTheme = { name: 'light', background: '#ffffff', nodeFill: '#f7f8ff', nodeStroke: '#5865d8', text: '#202234', edge: '#555b70', accent: '#7657d6', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' };
export const darkTheme: DiagramTheme = { name: 'dark', background: '#151622', nodeFill: '#24263a', nodeStroke: '#aeb6ff', text: '#f3f4ff', edge: '#c7cae0', accent: '#bfa7ff', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' };
export const themes = { light: lightTheme, dark: darkTheme } as const;
