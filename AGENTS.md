# SCULPT Contributor Guide

SCULPT means **Schematic Composition with User-Controlled Layout & Precision Topology**.

## Durable architecture rules

- Preserve Mermaid-compatible source wherever practical; manual geometry never belongs in Mermaid source.
- Workspace and View are different concepts. Workspace state is shared and persistent; selection, zoom, pan, and cursor state are view-local.
- Keep parser, AST, layout, renderer, persistence, synchronization, and UI separated.
- The SVG renderer stays deterministic, sanitized, and framework-independent.
- The Canvas owns workspace background and grid presentation; generated diagram SVG remains transparent and must not render editor or view backgrounds.
- Local features must not introduce accounts, servers, databases, WebSockets, or cloud dependencies.
- Avoid deprecated TypeScript options and keep TypeScript 7 compatibility in mind.
- Treat source and layout metadata as untrusted. Validate finite numeric geometry before layout or rendering.
- Stable node/edge identities—not DOM positions or array indexes—key persistent geometry.
- Selection is view-local and must never be stored in or broadcast with a Workspace.
- Precision geometry operations belong in pure, browser-independent modules and require focused unit tests.
- Editor overlays and hit targets must remain separate from exported SVG.
- Drag and waypoint gestures produce one undo transaction, not one entry per pointer event.
- Precision history owns only layout mode and node/edge geometry; undo applies that projection to the current document.
- Capture one screen-to-diagram transform for a gesture and finalize transactions on pointer up, cancellation, or lost capture.
- Route interpolation uses polyline arc length for labels and waypoint insertion.
- At 100%, one diagram unit is one CSS pixel; Fit and manual zoom are view-local and never persisted.
- Resize gestures preserve center-coordinate semantics and produce one precision-history transaction.
- Smart-guide tolerance is screen-space; group snapping applies one common translation.
- Grid and object snapping compete by smallest adjustment instead of being applied sequentially.
- Resize snapping considers only the actively moving handle edges; locked selected nodes remain stationary snap references.
- Direct waypoint insertion requires an actual edge hit and must respect the edge's active routing mode.
- Editor guides, handles, and selection bounds never enter exported SVG.
- Viewport commands, including Fit Selection, never modify Workspace geometry.
- In editable Canvas views, generated SVG is visual-only; overlays own editing, and native browser selection or drag behavior must not participate in gestures.
- Locked objects never move implicitly; position locking does not imply size locking.
- DOM/screen coordinates are not diagram-space coordinates; transform through the SVG coordinate system.
- Preserve deterministic rendering and support negative diagram-space coordinates in bounds.
- Add tests when extending syntax, geometry resolution, persistence, synchronization, or rendering.
- Do not copy Mermaid branding or assets.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Visual changes also require `npm run test:visual` when Playwright Chromium is installed.
