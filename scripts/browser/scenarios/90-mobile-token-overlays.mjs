// Token controls and hover cards must stay readable at screen size when
// the board camera zooms, and must remain inside its clipped viewport.
import { check, sleep } from "../lib.mjs";

async function fits(locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const frame = element.closest(".board-view").getBoundingClientRect();
    return box.left >= frame.left && box.right <= frame.right && box.top >= frame.top && box.bottom <= frame.bottom;
  });
}

export default {
  name: "mobile-token-overlays",
  app: false,
  viewports: ["phone", "desktop"],
  async run(t) {
    const { page, ids } = t;
    if (t.viewport === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await t.open(`/campaigns/${ids.campaignId}`);
    const battle = page.getByRole("button", { name: "Battle", exact: true }).locator("visible=true");
    if (await battle.count()) await t.tap(battle.first());
    const token = page.locator('[data-token-id][aria-label^="Tavi Lockwhisper"]').locator("visible=true").first();
    await token.waitFor();
    if (t.viewport === "phone") {
      // The seeded hero starts beneath the fixed initiative rail. Pan the
      // camera into open space before inspecting its on-board controls.
      const frame = page.locator('[aria-label^="Board view"]').locator("visible=true").first();
      await frame.focus();
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("ArrowLeft");
    }
    await token.hover();
    const plate = page.getByRole("tooltip").filter({ hasText: "Tavi Lockwhisper" });
    await plate.waitFor();
    await sleep(400);
    const before = await plate.boundingBox();
    // Wheel at the figure keeps it visible while the camera magnifies it.
    for (let step = 0; step < 6; step += 1) {
      await page.mouse.wheel(0, -100);
      await sleep(60);
    }
    await sleep(400);
    const after = await plate.boundingBox();
    check(Math.abs(after.width - before.width) < 2, `card width stays ${before.width}px at zoom (${after.width}px)`);
    check(await fits(plate), "the full card fits inside the board");
    await t.shot("card-zoomed");
    await t.tap(token);
    const menu = page.getByRole("menu", { name: "Actions for Tavi Lockwhisper" });
    await menu.waitFor();
    await sleep(500);
    const actions = menu.getByRole("menuitem");
    check((await actions.count()) > 0, "token actions opened");
    for (const action of await actions.all()) {
      const box = await action.boundingBox();
      check(Math.abs(box.width - 40) < 1, `action stays 40px at zoom (${box.width}px)`);
      check(await fits(action), "action remains inside the board");
    }
    await t.shot("actions-zoomed");
  },
};
