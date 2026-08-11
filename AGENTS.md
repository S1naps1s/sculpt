# SCULPT Contributor Guide

SCULPT means **Schematic Composition with User-Controlled Layout & Precision Topology**.

## Durable architecture rules

- Preserve Mermaid-compatible source wherever practical; manual geometry never belongs in Mermaid source.
- Workspace and View are different concepts. Workspace state is shared and persistent; selection, zoom, pan, and cursor state are view-local.
- Keep parser, AST, layout, renderer, persistence, synchronization, and UI separated.
- The SVG renderer stays deterministic, sanitized, and framework-independent.
- Local features must not introduce accounts, servers, databases, WebSockets, or cloud dependencies.
- Avoid deprecated TypeScript options and keep TypeScript 7 compatibility in mind.
- Treat source and layout metadata as untrusted. Validate finite numeric geometry before layout or rendering.
- Stable node/edge identities—not DOM positions or array indexes—key persistent geometry.
- Add tests when extending syntax, geometry resolution, persistence, synchronization, or rendering.
- Do not copy Mermaid branding or assets.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Visual changes also require `npm run test:visual` when Playwright Chromium is installed.

