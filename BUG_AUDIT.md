# CreatorMake Stability Audit — 2026-10-04

## Scope

This pass focused on editor hierarchy clarity, inline layer naming, text-transform fidelity, explicit container clipping, project persistence, Roblox manifest output, and production-build regressions. It intentionally avoided unrelated feature work.

## Findings

| ID | Severity | Area | Finding | Resolution |
| --- | --- | --- | --- | --- |
| CM-001 | Critical | Studio plugin | A malformed generated Lua plugin previously prevented reliable startup. | Fixed before this pass and retained in the regression baseline. |
| CM-002 | High | Containers | Ordinary frames and containers silently clipped descendants by default, despite having no visible clipping control. | Schema 10 defaults ordinary containers to `Clip Contents: Off`; scrolling frames remain clipped. |
| CM-003 | High | Editor/Studio parity | Descendant clipping was represented in Roblox output but was not visible on the flat editor canvas. | Added ancestor clip-bound calculation to the canvas preview and regression coverage for nested clipping. |
| CM-004 | High | Text export | Native text must share its parent object's transform instead of receiving an independent rotation. | Confirmed the shared transform-root architecture and expanded tests for rotated labels, buttons, and nested parents. |
| CM-005 | Medium | Layers | Renaming was technically available but lacked a complete keyboard workflow. | F2 and double-click now select the full name; Enter commits, Escape cancels, and Tab/Shift+Tab moves through visible layers. |
| CM-006 | Medium | Editor clarity | Object types and inspector categories were difficult to distinguish at a glance. | Added semantic type colors in Layers and semantic category accents in Properties for both dark and light themes. |
| CM-007 | Medium | Appearance masks | A container's descendant clipping and an object's own image/custom-geometry mask risked being treated as one behavior. | Kept surface masking local to the rendered surface while `Clip Contents` controls descendants only. |

## Automated regression coverage

- Schema migration and explicit clipping persistence
- Default clipping behavior for frames, containers, buttons, image buttons, and scrolling frames
- Nested editor clip-path calculation
- Roblox `ClipsDescendants` and content-wrapper behavior
- Fixed and responsive text sizing
- Shared transform roots for rotated native text and buttons
- Text-only manifest diffs
- Project import/export and recovery behavior
- Production type checking, linting, plugin build, and static-site build

## Manual validation boundary

The browser production build can be exercised locally. A Roblox multi-client Start Server session and a live cloud publish require Roblox Studio's authenticated interactive environment and remain manual validation steps when that environment is available.
