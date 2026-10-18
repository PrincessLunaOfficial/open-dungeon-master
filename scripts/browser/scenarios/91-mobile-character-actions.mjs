// Narrow screens must keep the library's campaign, level-up and edit
// action labels inside their own touch targets, without horizontal spill.
import { check, sleep } from "../lib.mjs";

export default {
  name: "mobile-character-actions",
  app: false,
  viewports: ["phone", "desktop"],
  async run(t) {
    const { page, ids } = t;
    for (const width of t.viewport === "phone" ? [320, 360, 412] : [1280]) {
      await page.setViewportSize({ width, height: 892 });
      await t.open(`/characters/${ids.library}`);
      const campaign = page.getByRole("button", { name: "Use in a campaign", exact: true });
      await campaign.waitFor();
      await campaign.scrollIntoViewIfNeeded();
      await sleep(250);
      const actions = [campaign, page.getByRole("link", { name: /^Level up to \d+$/ }), page.getByRole("link", { name: "Edit build", exact: true })];
      for (const action of actions) {
        const result = await action.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const text = element.querySelector("span");
          const label = text?.getBoundingClientRect();
          return { fits: element.scrollWidth <= element.clientWidth + 1 && box.left >= 0 && box.right <= window.innerWidth, labelFits: !label || (label.left >= box.left && label.right <= box.right) };
        });
        check(result.fits && result.labelFits, `action and label fit at ${width}px`);
      }
      await t.shot(`actions-${width}`);
      check((await actions[1].getAttribute("href")).endsWith("/edit?levelUp=1"), "level-up keeps its destination");
      check((await actions[2].getAttribute("href")).endsWith("/edit"), "Edit build keeps its destination");
      await t.tap(campaign);
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
    }
  },
};
