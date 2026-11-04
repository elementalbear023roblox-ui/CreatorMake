# CreatorMake Functionality Audit

Audit date: 2026-11-03 (America/New_York)  
Repository checkpoint: `checkpoint/functionality-audit-20261103` at `dd3ee9394d9a2f8508679cfc9d26179c20ce3fdc`  
Scope: repair and verification of existing functionality only; no product feature expansion.

## Status definitions

- **WORKING** — implementation was exercised by an applicable automated or real-browser test in this audit.
- **PARTIALLY WORKING** — useful behavior is implemented and tested, but an important part is absent or externally unverified.
- **BROKEN** — a normal supported workflow still fails reproducibly.
- **PLACEHOLDER** — visible UI has no underlying implementation.
- **NOT IMPLEMENTED** — the repository has no implementation or visible claim for the requested capability.
- **UNVERIFIED** — implementation exists, but credentials, Roblox Studio, or another external dependency was unavailable.

## Executive result

The P0 interface regression shown in the supplied screenshot is repaired. Its root cause was not a vague responsive-design problem: `TopToolbar.tsx` had been replaced with semantic groups (`brand-project`, `area-navigation`, `context-toolstrip`, `large-tool`, and others) that had no corresponding CSS. The legacy shell simultaneously forced an 840px minimum width and permanent side-panel columns. Browsers therefore laid toolbar content out as unstyled inline material and forced the editor wider than compact viewports.

The repair adds the missing toolbar layout contract, removes the shell minimum-width trap, gives compact viewports a contained two-row toolbar, converts panels to mutually exclusive drawers below 840px, contains the precision-control dock on phones, and adds multi-viewport collision/overflow assertions. The browser suite captures actual screenshots at 1440×900, 1024×768, 607×420 (the reported regression width), and 390×844.

No currently supported automated test is failing. Live Google Drive, live Roblox Open Cloud publishing, and an actual Roblox Studio import were not performed and are explicitly not classified as working.

## Feature inventory

| Feature | Status | Problem / limitation found | Repair | Test result |
| --- | --- | --- | --- | --- |
| Application load and production bundle | WORKING | None reproduced | None | Vite production build passed |
| Editor toolbar and area navigation | WORKING | P0: replacement markup had no matching styles; text and controls collided | Added semantic grid/flex styles and responsive containment | Playwright at 4 viewports passed |
| Compact editor layout | WORKING | P0: shell/topbar enforced 840px minimum width | Removed minimum-width trap; added compact grid | 607px and 390px screenshots passed collision and overflow assertions |
| Left/right panels | WORKING | Both fixed columns could exceed the viewport | Compact panels now open as one contained drawer at a time | Compact drawer browser test passed |
| Panel resizing | WORKING | No failure reproduced at desktop sizes | Preserved existing bounded resize logic | Static/TypeScript verification; desktop layout test passed |
| Canvas positioning, grid, rulers, zoom, fit commands | WORKING | Phone precision dock was clipped after the first P0 repair | Made the dock viewport-contained and horizontally scrollable | Phone screenshot and dock-bound assertion passed |
| Frame creation | WORKING | Toolbar accessibility label was missing | Restored `aria-label="Create frame"` | Browser insertion/undo test passed |
| Text creation and editing model | WORKING | No data-model failure reproduced | None | Core tests cover text geometry, sizing, fonts, rotation, save/export |
| Button creation | WORKING | No failure reproduced | None | Browser inserted a button; Roblox tests cover TextButton/ImageButton paths |
| Image import and placement | WORKING | No failure reproduced | None | Browser imported a real PNG; image schema/export tests passed |
| Rectangles, ellipses, polygons, stars | WORKING | No failure reproduced | None | Geometry suite and browser shape insertion passed |
| Custom paths and node editing | WORKING | No failure reproduced | None | Geometry/path normalization and conversion tests passed |
| Mathematical curves, surfaces, and implicit geometry | WORKING | No failure reproduced | None | Expression, parametric, implicit mesh, invalid-input, and cache-key tests passed |
| Selection and multiple selection | WORKING | No failure reproduced | None | Layout, reparent, snapping, and transform suites passed |
| Drag, resize, rotate, and nudge | WORKING | No failure reproduced | None | Constraint, multi-resize, rotation, snapping, and precision suites passed |
| Duplicate, copy, paste, and delete | WORKING | No failure reproduced | None | Editor command implementation inspected; browser undo round trip passed; hierarchy clone tests passed |
| Group, ungroup, wrap, and reparent | WORKING | No failure reproduced | None | Reparent/world-position, wrap, group hierarchy, and cycle-rejection tests passed |
| Lock and hide | WORKING | No failure reproduced | None | Context actions and export hidden-parent behavior are covered by core tests |
| Layer ordering and hierarchy | WORKING | No failure reproduced | None | Reparent/order and Roblox parent-first serialization tests passed |
| Align, distribute, stack, auto layout, repeat grid | WORKING | No failure reproduced | None | Exact/fractional/negative spacing and repeat-grid suites passed |
| Undo and redo | WORKING | No failure reproduced | None | Real browser create → undo passed; transaction tests passed |
| Fill, opacity, and blend modes | WORKING | No failure reproduced in saved/rendered state | None | Element normalization and renderer suites passed |
| Linear/radial/freeform/four-corner gradients | WORKING | No failure reproduced | None | Gradient state, raster planning, and Roblox UIGradient coverage passed |
| Strokes and rounded/corner geometry | WORKING | No failure reproduced | None | Geometry, UIStroke/UICorner, and pixel-fidelity tests passed |
| Shadows, glow, blur, pixelation, texture, and effect stack | WORKING | No failure reproduced | None | Registry, parameter normalization, ordering, bounds, GPU-budget, save, and export tests passed |
| Effect enable/disable, presets, duplication, animation settings | WORKING | No failure reproduced | None | Effects tests passed; browser added Neon Glow and verified it after reload |
| General object timeline/keyframe animation | NOT IMPLEMENTED | Repository has effect animation controls, not a general animation timeline | None | No visible general timeline or keyframe engine found |
| Clip Contents and scrolling frames | WORKING | No failure reproduced | None | Nested crop, scrolling semantics, canvas size, and Roblox export tests passed |
| Arbitrary vector masks | NOT IMPLEMENTED | Clip Contents and effect overlays exist; a general mask-layer system was not found | None | Repository inspection |
| Native text | WORKING | No failure reproduced | None | Native TextLabel, wrapping, fixed/responsive size, stroke, rotation, and export tests passed |
| Image text | WORKING | No failure reproduced in automated renderer/export paths | None | Image-text insert mode, raster text, font embedding, and PNG export tests passed |
| Native/Image text conversion | PARTIALLY WORKING | Both modes and per-object export choices exist; no dedicated two-way conversion command was found | None | Modes/export decisions tested; conversion UI absent |
| Font library and loading | WORKING | No failure reproduced | None | 100+ unique open families, variant resolution, failure handling, and Roblox mapping tests passed |
| 3D object creation/rendering | WORKING | Historical white-rectangle/background issues were regression risks | Existing transparent GPU surface and lifecycle retained | Browser created/reloaded a 3D object; 3D lifecycle/bounds/context-loss tests passed |
| 3D transforms, materials, lighting, fit, and save/reload | WORKING | No failure reproduced in automated paths | None | Finite transform, independent state, projected bounds, normalization, and export fallback tests passed |
| Native Roblox 3D instance export | NOT IMPLEMENTED | 3D is deliberately exported as an image-based fallback, not Roblox 3D geometry | None | Honest fallback assertion passed |
| Components and Roblox component library | WORKING | No failure reproduced | None | Component insertion and editable hierarchy tests passed |
| Design kits and demonstrations | WORKING | No failure reproduced | None | Five distinct kits, three full demonstrations, editable-layer tests passed |
| Templates/presets | WORKING | No failure reproduced | None | Preset insertion, isolation, and project-manifest exclusion tests passed |
| PNG/JPEG/WebP/GIF/SVG asset import | WORKING | No failure reproduced | None | Import accept list, PNG browser import, SVG path conversion, and persistence tests passed |
| Local project create/name/save/load/duplicate/delete/recovery | WORKING | No failure reproduced | None | IndexedDB-compatible lifecycle, recovery snapshots, duplication, migration tests passed |
| Save/reload data integrity | WORKING | No failure reproduced | None | Mixed browser project retained six objects and Neon Glow across reload; schema 17 tests passed |
| Project backup import/export | WORKING | No failure reproduced | None | Browser downloaded and parsed project JSON; `.creatormake` schema round-trip tests passed |
| Per-object transparent PNG export | WORKING | No failure reproduced | None | Browser downloaded a generated PNG and Sharp verified format, dimensions, and alpha |
| Full-canvas PNG export | NOT IMPLEMENTED | Current UI exports per-object Roblox visual PNGs, not a flattened full-canvas image | None | No such control/API found |
| JPEG, WebP, SVG, and PDF output | NOT IMPLEMENTED | These are accepted/imported in some cases, but not offered as document export formats | None | Repository/UI inspection |
| Generic 3D file export | NOT IMPLEMENTED | No GLTF/GLB/OBJ/FBX output path exists | None | Repository inspection |
| Roblox native/adaptive/pixel-accurate export | WORKING | No failure reproduced | None | Classification, bounds, alpha, text split, responsive scaling, and fidelity suites passed |
| Generated Roblox Lua and hierarchy | WORKING | No failure reproduced | None | Browser downloaded Lua; syntax/return checks and manifest hierarchy tests passed |
| Roblox responsive sizing | WORKING | No failure reproduced in serializer/device matrix | None | 9-viewport text/layout matrix and responsive-preview diagnostics passed |
| Incremental sync and project isolation | WORKING | No failure reproduced | None | Stable IDs, delta updates, deletion authority, per-project history tests passed |
| Local Studio Sync bridge | WORKING | Sandboxed run initially blocked localhost with EACCES; this was environment policy, not product behavior | Reran outside restricted sandbox | All bridge health, staging, PNG transport, retry, and history tests passed |
| Studio plugin generation/version protocol | WORKING | No failure reproduced | None | Generated artifact matches source; protocol/project scoping tests passed |
| Actual Roblox Studio initialization/import/re-import | UNVERIFIED | Roblox Studio was not controlled for an end-to-end import in this audit | None | Plugin/bridge automated tests passed only |
| Multiple GUI coexistence inside a real Studio place | UNVERIFIED | Serializer and plugin isolate projects, but no live Studio place was used | None | Project-scope automated tests passed only |
| Roblox Open Cloud request and permission logic | WORKING | No failure in mocked protocol path | None | Multipart upload, operation polling, permissions, reuse, and retry tests passed |
| Live Roblox asset publishing | UNVERIFIED | No user Roblox credentials/experience authorization was used | None | Mocked tests only; not claimed live |
| CreatorMake local account registration/login/logout | WORKING | No failure reproduced | None | Password validation, salted PBKDF2, session/bundle tests passed |
| Portable CreatorMake account/project bundle | WORKING | No failure reproduced | None | Cross-device key verification and project merge tests passed |
| Password reset | NOT IMPLEMENTED | No server-backed reset/recovery workflow exists | None | Repository inspection |
| Server-side account ownership/private project isolation | NOT IMPLEMENTED | CreatorMake accounts are local portable identities, not a multi-tenant backend | None | Repository inspection |
| Google OAuth and Drive appData cloud sync | UNVERIFIED | Merge/client-ID logic is tested, but no live Google session was authorized | None | Unit tests passed; live cloud unverified |
| OpenAI-assisted generation | PARTIALLY WORKING | Provider/tool/validation code exists, but the shipped editor feature flag is off unless configured | None | Agent/provider tests passed; live API generation not run |
| Dialog opening/closing | WORKING | Project/account/export/settings dialogs did not all close on Escape | Added one capture-phase Escape close path for modal editor dialogs | Browser project dialog Escape test passed |
| Keyboard shortcuts | WORKING | No failure reproduced for tested core shortcuts | None | Browser Ctrl+Z/Ctrl+K/Escape passed; command implementation inspected |
| Accessibility labels for primary insert tools | WORKING | Frame/text/image/3D controls lacked complete explicit labels | Added labels | Options-quality test passed |

## Repairs made

### P0 — unusable responsive editor chrome

- Added the missing CSS contract for the new toolbar component groups.
- Removed `min-width: 840px` behavior from the active editor shell/topbar.
- Added explicit desktop, laptop, compact, and phone toolbar layouts.
- Prevented toolbar groups from wrapping into one another.
- Changed compact side panels from reserved grid columns to contained overlay drawers.
- Made compact panel toggles mutually exclusive and made area changes choose the appropriate drawer.
- Contained the phone canvas precision dock and enabled horizontal scrolling within its own bounds.

### P2 — modal Escape behavior

- Added consistent Escape handling for projects, account, export, settings, asset placement, and Roblox font-review dialogs.

### P3 — toolbar semantics/regression coverage

- Restored explicit insert-tool accessibility labels.
- Restored the visible Import, Roblox Check, and SYNC actions expected by the existing workflow contract.
- Removed unused toolbar imports introduced by earlier revisions.

## Browser and artifact evidence

`tests/e2e/editor-audit.spec.ts` performs the following in Microsoft Edge against the production static build:

1. Opens the real editor at 1440×900, 1024×768, 607×420, and 390×844.
2. Asserts no document/body horizontal overflow.
3. Computes bounding rectangles for the brand, area navigation, context tools, and action group and rejects collisions.
4. Verifies every toolbar region and the canvas-control dock stays within the viewport.
5. Captures one screenshot for each viewport under `test-results/`.
6. Inserts and undoes a frame.
7. Creates a frame, text, 3D object, button, imported PNG, and star.
8. Applies Neon Glow, waits for save, reloads, and verifies object/effect persistence.
9. Opens/closes command and project dialogs through real controls/keyboard input.
10. Opens Roblox export and downloads the actual project JSON, generated Lua, and a rendered transparent PNG.
11. Parses the project file, validates the Lua structure, and inspects the PNG with Sharp for format, positive dimensions, and alpha.

Latest screenshot names are `desktop.png`, `laptop.png`, `reported-regression.png`, and `phone.png` inside their Playwright result directories. `test-results/` is intentionally ignored so audit artifacts do not pollute deployments; rerunning `npm run test:e2e` regenerates them.

## Test commands and results

| Command | Result |
| --- | --- |
| `npm run test:core` | **193 passed, 0 failed** |
| `npm run test:options` | **7 passed, 0 failed** |
| `npm run test:e2e` | **6 passed, 0 failed** after repairs |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed with 0 errors and 21 pre-existing warnings (mostly intentional raw image elements; also several existing hook/unused-state warnings) |
| `npm run build:site` | Passed; plugin and static production bundle generated |

The Studio bridge suite must run outside the restricted filesystem/network sandbox because it binds temporary localhost ports. Its first sandboxed run produced `connect EACCES`; the approved unrestricted run passed all 193 core tests.

## Remaining external verification

- Launch Roblox Studio, install/reload the generated v21 plugin, enable HTTP requests, and perform preview plus StarterGui deployment.
- Import two separate CreatorMake projects into one place and visually confirm both ScreenGuis remain independent.
- Authorize a real Roblox publishing account/experience and verify asset ownership, Use permission, and permanent image references.
- Authorize a real Google account and verify Drive appData sync across two physical browser profiles/devices.
- Run a live OpenAI generation only when server credentials and the feature flag are intentionally enabled.

## Known limitations

- CreatorMake does not provide a flattened full-canvas PNG/JPEG/WebP/SVG/PDF export. Its implemented PNG output is the transparent per-object visual pipeline used by Roblox export.
- CreatorMake local accounts are not a hosted multi-user authentication service. Password reset and server-enforced private project ownership are absent.
- General timeline/keyframe animation and arbitrary vector-mask layers are absent; effect animation and Clip Contents are implemented.
- 3D objects export to Roblox through an honest ImageLabel fallback rather than native Roblox 3D instances or generic 3D files.
- The static JavaScript bundle remains large; this audit did not perform unrelated code splitting because the request prohibited feature expansion/redesign and no load failure was reproduced.
- Lint reports warnings but no errors. The warnings are recorded rather than silently described as clean.

## Final acceptance disposition

The feasible local acceptance workflow passed: mixed-object creation, effect application, undo, save, reload, project download, Lua generation, PNG generation/inspection, and responsive browser verification. Automated Roblox serialization, hierarchy, multi-project isolation, Studio bridge, and Open Cloud protocol tests passed.

The workflow is **not** described as fully end-to-end in Roblox because no real Studio import or live asset publication occurred. Those steps remain **UNVERIFIED**, not working by assumption.
