## Summary

A large world map can initially fit a phone at less than 0.4 zoom, but the old zoom controls clamp back to 0.4. Pressing minus can therefore enlarge the map. Location dots, names and hit areas also become too small at the fitted overview scale.

```diff
- Clamp every map to a fixed minimum zoom of 0.4
+ Derive zoom limits from the map's fit in the current viewport
- Scale location markers and captions down with terrain
+ Keep markers/captions screen-sized and provide a usable hit radius
```

The same zoom calculation serves buttons, wheel and pinch. Hidden zero-width panels defer fitting. Captions avoid marker/caption overlap, prioritize the current location and stay within the visible viewport.

## Evidence

- **Before:** a 192×137-tile map on a 336px-wide viewport fits at approximately 0.109, below the hard-coded 0.4 minimum; minus can jump inward. At 0.1 zoom, a 4.5px marker is only 0.45 screen pixels wide in radius.
  **After:** minus reduces the fitted zoom and can show the entire atlas with margin. Location dots retain a 5px screen radius and captions retain 11px text.
- `node scripts/test-overworld-visibility.mjs` passes: marker/text screen sizes and repeated zoom-out for 294px, 336px and 900px viewports.

Each PR branch passes TypeScript and focused ESLint checks. A combined checkout of this four-PR mobile UI series also passed the production build, full ESLint, three focused script suites under Vitest, and four phone/desktop browser runs. The full repository test suite was not run locally.

## Merge Danger

**Door:** Two-way — client rendering and camera behavior only; no stored map or location data changes.

**Blast Radius:** Atlas. Camera fitting, label placement and location hit testing change. Dense maps can omit a caption when no collision-free position is available; the marker remains visible.

### Settings and options

- [x] This adds no new setting, toggle or option.
- [ ] This adds one: a screenshot of it is below, with where it lives and its default.
