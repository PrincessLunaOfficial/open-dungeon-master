## Summary

On a narrow character detail page, **Use in a campaign**, **Level up to N** (for example, level 7) and **Edit build** compete for the same row. Desktop-sized icons, letter spacing and unwrapped labels overflow their buttons.

```diff
- Desktop label/icon sizing and nowrap behavior at every width
+ Compact mobile icons and labels with wrapping
+ Preserve the existing desktop sizing and destinations
```

This fixes the responsive layout for every eligible level; it does not change leveling rules. Long words also wrap at 320px.

## Evidence

- **Before:** action labels extend beyond their own touch targets on narrow screens.
  **After:** labels and buttons stay within bounds at 320px, 360px and 412px; the desktop layout is also checked.
- Added `mobile-character-actions` to the browser runner. It checks bounds, the campaign dialog and the existing edit/level-up destinations.
- `node scripts/browser/run.mjs --only mobile-character-actions`: phone and desktop runs pass on the combined integration build.

![Character actions at 360px](https://raw.githubusercontent.com/PrincessLunaOfficial/open-dungeon-master/2e0d6285949200f50ed09bb27ff742717783ba20/character-actions-360.png)

Screenshot uses the repository's seeded library character. The test uses the dynamic next-level label, rather than hard-coding level 7.

Each PR branch passes TypeScript and focused ESLint checks. A combined checkout of this four-PR mobile UI series also passed the production build, full ESLint, three focused script suites under Vitest, and four phone/desktop browser runs. The full repository test suite was not run locally.

## Merge Danger

**Door:** Two-way — styling and regression coverage only.

**Blast Radius:** Character. Only the three primary action controls on the character detail page change.

### Settings and options

- [x] This adds no new setting, toggle or option.
- [ ] This adds one: a screenshot of it is below, with where it lives and its default.
