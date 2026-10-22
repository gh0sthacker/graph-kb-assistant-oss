# Graph Explorer UI contract

## User job and direction

- **Job:** choose one registered local Caido project, locate an HTTP endpoint,
  inspect a bounded graph neighborhood, and read safe node metadata plus local
  provenance links.
- **Audience:** one analyst running the assistant on their workstation.
- **Tone:** dense, quiet, technical; the graph is the primary working surface.
- **Memorable detail:** graph node colors match the persistent type legend and
  the endpoint list remains beside the graph by default, with a one-click focus
  mode for the dense graph view.
- **Primary action:** select an endpoint, then follow graph links from a node.
- **Hierarchy:** project and read-only state → endpoint list → graph and edge
  labels → selected-node properties and capture references → coverage limits.
- **Viewports:** desktop `1440x900`; narrow mobile `390x844`.
- **Reference observations:** local Go `SurfacePage` is a bounded structural
  index page; `GraphSlice` returns typed entities/assertions and explicit
  truncation/incompleteness; project instructions forbid raw traffic in graph
  labels and reports. The screen exposes those limits instead of implying full
  Caido-history coverage. The user's screenshot showed a route masked as
  `/{value}` and a dense graph capped at 250%; dynamic route values can include
  identifiers or secrets, while static path segments should remain readable.

## State contract

| State | Trigger | Visible feedback | Safe next action |
|---|---|---|---|
| Loading | Project list, endpoint page, or graph request is in flight | Stable three-pane layout and a specific loading message | Wait, choose another project after list load, or refresh |
| Empty | No project, no indexed endpoint, or no graph seeds | Explains which local data is missing | Register/import a project, or select another endpoint |
| Error | Registry, schema, index, or graph read fails | Generic local read error without file paths or body data | Check local project compatibility and refresh |
| Partial | Surface page is bounded, graph is incomplete/truncated, or endpoint lacks graph mapping | Coverage labels and source gaps remain visible | Load another surface page or select a mapped endpoint |
| Success | Endpoint and graph neighborhood load | Node/edge counts, typed graph, safe properties, provenance references | Select a node and open its neighborhood |
| Permission | HTTP request has non-local Host or mismatched Origin | Request is rejected; no graph data is returned | Open the `127.0.0.1` URL printed by the CLI |

## Interaction and access constraints

- Read-only GET API. Project-list pages read registry identities only; a
  project database is opened only after the user selects that project.
- Loopback listener only; no cookies, permissive CORS, remote assets, or target
  traffic. Embedded assets use a same-origin content security policy.
- No raw request/response bytes, header values, body values, secrets, or local
  filesystem paths are rendered.
- Endpoint search, bounded page continuation, graph zoom/pan/fit, keyboard
  activation, and selected-node inspector are available without a framework.
- Dynamic URL values display as `{параметр}` with static path segments preserved.
  Graph counts describe the selected route's graph slice, not total project
  traffic. Focus mode hides the side panels temporarily; Escape restores them.
- The default **Обзор** view is scoped to the selected endpoint and its direct
  capture/field neighborhood. It hides per-capture observations and request/
  response shapes so the host, endpoint, and connected fields remain readable.
  **Все узлы** restores the full graph slice. Type chips show counts for the
  active view and toggle each kind independently; graph counts distinguish
  visible nodes from the active view. Type filtering preserves zoom and pan.
  Switching between endpoint overview and the full slice refits the graph.
- Edge relation labels can be hidden independently from node labels.
- Route values are deliberately removed during graph projection, so the UI
  cannot unmask a raw URL from a graph node. The inspector identifies a route
  as a grouped template and points to Caido provenance for the source request.
- Zoom ranges from 35% to 1000%; wheel zoom anchors at the pointer, the toolbar
  and `+`/`-` keys zoom around the canvas center, dragging pans, and `0` or
  **Вписать** resets the view.
