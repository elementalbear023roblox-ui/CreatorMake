# CreatorMake adaptive 3D resolution

CreatorMake now renders 3D objects at a substantially higher pixel resolution without keeping the GPU in a continuous render loop.

## Resolution modes

- Performance: up to 1.25x supersampling, with a 1.5 megapixel budget.
- Balanced: up to 2.5x supersampling, with a 3.5 megapixel budget.
- High: up to 4x supersampling, with a 7 megapixel budget.
- Ultra: up to 6x supersampling, with a 12 megapixel budget.
- Export: up to 8x supersampling, with an 18 megapixel budget.

Every mode is also limited by the browser's maximum GPU texture size. When several 3D renderers are active, CreatorMake automatically shares the preview pixel budget between them.

## Interaction strategy

While a property is changing, the renderer uses a lightweight 1x-1.5x interactive pass. After the browser becomes idle, CreatorMake performs one settled high-resolution render. New changes cancel stale refinement work, so dragging and inspector edits stay responsive. Geometry and material resources are reused, and no animation loop runs while the scene is unchanged.

## Verification

- 201 core tests passed.
- 7 quality/options tests passed.
- 8 browser workflows passed, including a real 6x Ultra-resolution WebGL assertion.
- TypeScript and the production site build passed.
- ESLint completed with zero errors; its 21 warnings are pre-existing repository warnings.
