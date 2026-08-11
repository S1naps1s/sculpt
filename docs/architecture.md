# SCULPT Architecture

SCULPT—Schematic Composition with User-Controlled Layout & Precision Topology—uses the principle: **Write the structure. Sculpt the diagram.** Mermaid compatibility describes accepted syntax; SCULPT has an independent identity.

## Engine pipeline

```text
Mermaid-compatible source -> detection -> parser -> common AST
                                            + layout metadata
                                            -> layout resolution -> SVG renderer
```

Parsing remains unaware of geometry. `@sculpt/layout` first obtains automatic Dagre geometry, then resolves trusted, normalized workspace metadata over it. `@sculpt/renderer-svg` consumes only AST and resolved geometry and remains independent of React and browser storage.

## Workspace and View

A Workspace is the shared local document: identity, source, theme, configuration, layout metadata, revision, and timestamps. A View identifies one browser window and its role (`editor`, `preview`, `split`, `inspector`, or `presentation`). Zoom, pan, selection, and editor focus remain view-local and are never persisted or broadcast as document changes.

`@sculpt/workspace` is framework-independent. `WorkspaceController` owns revisioned updates, deduplicates remote events, debounces repository writes, and publishes local changes through a `WorkspaceTransport`. React subscribes to it but is not canonical state.

## Persistence and synchronization

`WorkspaceRepository` defines get/save/delete/list. `IndexedDbWorkspaceRepository` stores complete documents in the `sculpt-workspaces` database; `MemoryWorkspaceRepository` supports tests and non-browser consumers. IndexedDB is canonical—localStorage is not used.

`WorkspaceTransport` abstracts connect/publish/subscribe/disconnect. `BroadcastChannelTransport` scopes channels by workspace. Events carry workspace ID, origin view ID, revision, event ID, type, and a complete workspace snapshot. A controller applies only newer remote revisions and never republishes received events, preventing loops. A future transport can implement the same contract.

Workspace URLs use `/workspace/{id}?view={type}` with Vite SPA fallback. Opening a view uses a normal browser window.

## Geometry convention

All coordinates are finite SVG viewBox/diagram-space units. Node `x` and `y` always mean **center**, matching Dagre. Width and height are diagram-space extents. This convention applies to resolution, SVG, dragging, inspection, nudging, persistence, and future alignment tools. Zoom, pan, and browser size never change persisted coordinates.

Layout mode is `auto`, `manual`, or `hybrid`. Each node independently records auto/manual positioning and locking, allowing hybrid layout to keep pinned nodes while a future constrained engine arranges unpinned nodes. Phase 2 overlays manual node geometry onto Dagre output; sophisticated collision-aware constrained layout is deferred.

Locked nodes reject dragging and keyboard nudging. Numeric inspector edits also require unlocking first, making every movement rule consistent. Snap-to-grid rounds center coordinates to the configured positive interval.

## Edge identity and routing

Flowchart edge IDs are deterministic hashes derived from source/target IDs, edge type, label, and occurrence count among identical logical edges. They remain stable when unrelated statements are reordered. Layout metadata can specify `auto`, `straight`, `orthogonal`, `bezier`, or `manual` routing, north/east/south/west/auto anchors, finite waypoints, and a routing lock.

The resolver converts anchors to node-boundary points. Explicit waypoints are preserved. Orthogonal routes are validated as horizontal/vertical; malformed routes produce structured layout errors. The renderer consumes resolved points, so waypoint editing will not require a renderer rewrite.

## Security and compatibility

Source and metadata are untrusted. Labels are XML-escaped, identifiers normalized, markup is never evaluated, and all coordinates, sizes, spacing, anchors, and waypoints are normalized or rejected before SVG interpolation. Existing diagrams without metadata resolve as auto layout and retain Phase 1 behavior.

