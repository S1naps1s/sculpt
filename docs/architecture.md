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

## Precision selection and editor overlays

Phase 3 selection is a view-local discriminated union: either an ordered unique node set with a primary node, one edge with an optional waypoint, or no selection. Normal node click replaces selection; Ctrl/Cmd-click toggles membership while retaining a valid primary. Edge selection clears nodes. Selection is never stored in Workspace, persisted, or broadcast.

Marquee selection uses node bounding-box intersection in diagram space. A plain marquee replaces selection and a Ctrl/Cmd marquee adds to it. Empty-canvas primary-button drag creates a marquee; Alt-drag or middle-button drag pans. Node/edge hit regions, selection halos, marquee rectangles, and waypoint handles live in a React-owned SVG overlay aligned to the renderer viewBox. They are absent from `RenderResult.svg` and exported diagrams.

## Precision geometry operations

`@sculpt/workspace/precision` contains pure transformations for group translation, sizing, alignment, distribution, match-size, anchors, and waypoints. React supplies resolved node frames; operations produce a new Workspace.

Alignment uses the complete selection bounds: left/top use the minimum edge, right/bottom the maximum edge, and center operations the selection bounds center. Locked nodes participate in reference bounds but do not move. Distribution sorts by center then stable ID, preserves the outer boundaries, and calculates equal bounding-box gaps. Locked members remain fixed; Phase 3 does not solve constrained redistribution around multiple locked intermediate nodes. Match Width/Height uses the primary node and position locks do not restrict sizing.

Group translation applies one common delta to movable nodes. When snapping is enabled, the primary node determines the snapped group delta so relative spacing is preserved. Resizing sets `sizing: manual` without forcing auto-positioned nodes into manual positioning.

## Edge editing

The interaction overlay provides non-visible wide edge hit strokes without changing exported appearance. The inspector edits anchors, auto/straight/orthogonal/manual routing, and routing locks. Adding a waypoint switches to manual routing. Selected waypoints are draggable and Delete removes them; locked routes reject changes. Orthogonal routes without explicit waypoints resolve through deterministic elbows. Orthogonal waypoint dragging chooses a valid corner from adjacent route segments, preventing diagonal segments.

## Undo and synchronization

Each editing View owns a bounded `WorkspaceHistory`; history is not synchronized. Undo and redo restore workspace snapshots through the normal `WorkspaceController.update` path, so the resulting revision persists and broadcasts. Remote workspace events clear local history to prevent stale redo from overwriting newer shared state.

Pointer-down begins a history transaction, pointer moves publish live workspace updates, and pointer-up commits one entry. No-op gestures are ignored. Numeric, alignment, distribution, sizing, anchor, routing, and waypoint commands create ordinary history entries. Source text keeps native textarea undo behavior; workspace shortcuts ignore text inputs.

## Canvas bounds

Resolved layout contains an explicit `x`, `y`, `width`, and `height`. Bounds include full node extents, routed edge points, waypoints, and padding, including negative coordinates. SVG uses these values directly as its viewBox rather than clipping geometry to a zero origin.
