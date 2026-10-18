## Summary

Zooming the battle map also magnifies its token action menu and hover card. On a phone, the buttons can cover most of the map and the portrait/name can extend outside the clipped viewport.

```diff
- Token overlays inherit the board camera's scale
+ Counter-scale overlays to retain their screen size
+ Keep action targets and the entire card inside the visible board
```

Action buttons stay 40px wide. Cards retain their existing phone/desktop widths and shrink only when needed to fit a smaller viewport. Positioning follows camera movement and resizing; action handlers and card content are unchanged.

## Evidence

- **Before:** at roughly 244% map zoom, 40px buttons grew to about 98px; a 136px card grew to 332px and was clipped.
  **After:** buttons stay 40px and the card stays 136px when space permits. A 320px viewport also fits the full card.
- Added `mobile-token-overlays` to the existing browser runner. It checks card width, button width and viewport bounds after real camera zoom on phone and desktop.
- `node scripts/browser/run.mjs --only mobile-token-overlays`: both viewports pass on the combined integration build.

| Card at zoom | Actions at zoom |
| --- | --- |
| ![Mobile token card](https://raw.githubusercontent.com/PrincessLunaOfficial/open-dungeon-master/2e0d6285949200f50ed09bb27ff742717783ba20/token-card-mobile.png) | ![Mobile token actions](https://raw.githubusercontent.com/PrincessLunaOfficial/open-dungeon-master/2e0d6285949200f50ed09bb27ff742717783ba20/token-actions-mobile.png) |

Screenshots use the repository's seeded regression table.

Each PR branch passes TypeScript and focused ESLint checks. A combined checkout of this four-PR mobile UI series also passed the production build, full ESLint, three focused script suites under Vitest, and four phone/desktop browser runs. The full repository test suite was not run locally.

## Merge Danger

**Door:** Two-way — client rendering only, with no migration.

**Blast Radius:** Overlays. Placement and scale change; turn handling and token positions do not.

### Settings and options

- [x] This adds no new setting, toggle or option.
- [ ] This adds one: a screenshot of it is below, with where it lives and its default.
