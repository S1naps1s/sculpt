# SCULPT

Schematic Composition with User-Controlled Layout & Precision Topology

**Write the structure. Sculpt the diagram.**

## Overview

SCULPT is an open-source, browser-first text-to-diagram engine and precision visual editor. It is designed for strong Mermaid flowchart syntax compatibility while adding manual presentation controls that remain separate from diagram source.

SCULPT is an independent project and is not affiliated with or endorsed by Mermaid.

## Current capabilities

- Mermaid-compatible flowchart detection and parsing for `flowchart` and `graph`
- Automatic directed-graph layout through a replaceable Dagre adapter
- Manual node dragging and exact diagram-space X/Y positioning
- Node position locking and keyboard nudging
- Configurable visual grid and snap-to-grid
- Manual layout metadata stored separately from source
- Stable edge identities plus anchor, waypoint, and orthogonal-routing foundations
- Editor, preview, split, inspector, and presentation views
- Same-browser multi-window workspace synchronization
- Local IndexedDB workspace persistence
- Framework-independent TypeScript engine with deterministic SVG output
- Structured diagnostics and sanitization of untrusted labels and geometry

## Quick start

Requirements: a current Node.js LTS release and npm.

```sh
npm install
npm run dev
```

Vite prints the local development URL. The default route resolves to the local workspace; explicit views use URLs such as `/workspace/local?view=split` and `/workspace/local?view=preview`.

## Development commands

```sh
npm run dev          # start the browser editor
npm run typecheck    # strict TypeScript validation
npm run lint         # ESLint
npm test             # unit, compatibility, renderer, and security tests
npm run build        # production web build
npm run test:visual  # Playwright visual regression suite
```

The visual suite requires Playwright Chromium (`npx playwright install chromium`).

## Repository architecture

```text
apps/web                 React/Vite editor and workspace views
packages/ast             common typed diagram representation
packages/parser          diagram detection and parser contracts
packages/flowchart       Mermaid-compatible flowchart parser
packages/layout          Dagre adapter and manual geometry resolution
packages/renderer-svg    deterministic framework-independent SVG renderer
packages/themes          diagram themes
packages/core            reusable parsing/rendering API
packages/workspace       workspace, persistence, and synchronization layer
packages/cli             early command-line entry point
tests                    unit, compatibility, renderer, security, and visual tests
examples                 representative diagram source
```

The engine pipeline remains independent of React:

```text
source -> detection -> parser -> AST + layout metadata -> layout -> SVG
```

See [docs/architecture.md](docs/architecture.md) for ownership boundaries and coordinate semantics.

## Mermaid compatibility philosophy

Existing Mermaid flowchart definitions should render without modification wherever the supported subset permits. SCULPT currently supports the five primary directions, common node shapes, comments, labels, and the initial link forms documented in the example and tests.

Manual positions and routes are workspace metadata. SCULPT does not add proprietary coordinates to Mermaid source. Unsupported syntax produces diagnostics instead of being silently reinterpreted.

Mermaid compatibility describes accepted syntax only; no Mermaid branding, logos, or assets are used.

## Security philosophy

Diagram source and layout metadata are untrusted input. SCULPT does not execute diagram content, escapes SVG text, normalizes generated identifiers, validates finite geometry, and rejects invalid manual routes before rendering. Browser persistence is local-only and no accounts, backend, or remote synchronization are included.

## Project status

Phases 1 and 2 establish the flowchart engine, live editor, local workspaces, multi-window views, and initial precision-layout tools. The project is early-stage. Advanced constrained hybrid layout, interactive waypoint editing, multi-selection alignment, additional diagram types, and cloud collaboration are not currently implemented.

## License

SCULPT is available under the [MIT License](LICENSE).
