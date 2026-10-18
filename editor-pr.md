## Summary

On a high-density phone, zooming the map editor magnifies a bitmap rendered only at the container's CSS width. The original image is available, but fine details become blurred. Across and Down also lack a convenient way to make a small, repeatable alignment adjustment.

```diff
- Rasterize at layout width, then stretch with camera zoom
+ Rasterize for device pixel ratio and zoom; keep layout/pointer coordinates in CSS pixels
- Adjust Across / Down only through a 0.25-step slider
+ Add minus/plus buttons and use 0.1 steps
```

Canvas allocation is capped at 8 megapixels and an 8192-pixel edge. Offset buttons respect the existing bounds and saving state; decimal rounding avoids floating-point drift. These are shortcuts for existing fields in **Map editor → Align picture**, with no new preference or default change.

## Evidence

- **Before:** at DPR 2 and 156.25% zoom, a 456.25 CSS-pixel image was backed by a 292-pixel canvas.
  **After:** the same view uses a 912-pixel canvas. Browser checks also confirmed that both offset buttons save exactly `+0.1` and `-0.1`.
- `node scripts/test-map-editor-resolution.mjs`: phone/desktop layouts, fractional zoom, DPR 1–3, aspect ratio and allocation bounds pass.
- `node scripts/test-map-backdrop.mjs`: 19 assertions pass.

Each PR branch passes TypeScript and focused ESLint checks. A combined checkout of this four-PR mobile UI series also passed the production build, full ESLint, three focused script suites under Vitest, and four phone/desktop browser runs. The full repository test suite was not run locally.

## Merge Danger

**Door:** Two-way — reverting restores the previous editor behavior; no migration.

**Blast Radius:** Editor. Raster resolution changes rendering cost, bounded by the allocation cap. Shared range rows show buttons only when requested.

### Settings and options

- [x] This adds no new setting, toggle or option.
- [ ] This adds one: a screenshot of it is below, with where it lives and its default.
