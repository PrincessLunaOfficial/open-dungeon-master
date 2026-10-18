import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/register-alias.mjs", import.meta.url);
const { drawOverworld } = await import("../src/app/campaigns/[campaignId]/overworldDraw.ts");
const { fitOverworldView, zoomOverworldView } = await import("../src/app/campaigns/[campaignId]/useOverworldView.ts");

// Record physical marker/text sizes after the canvas camera transform.
const zoom = 0.1, arcs = [], texts = [];
const context = new Proxy({
  font: "",
  arc(x, y, radius) { arcs.push(radius * zoom); },
  fillText(text) { texts.push({ text, size: parseFloat(this.font.match(/[\d.]+(?=px)/)?.[0] ?? "0") * zoom }); },
  measureText(text) { return { width: text.length * 7 / zoom }; },
}, { get: (object, key) => key in object ? object[key] : () => {} });
drawOverworld(context, {
  map: { width: 192, height: 137, terrain: "p".repeat(192 * 137), paths: [], labels: [], pins: [], partyXy: null },
  locations: [{ id: "harbor", name: "Harbor", anchor: { x: 118, y: 58 }, connections: [], visited: true, isCurrent: false }],
}, { genre: "fantasy", pulse: 0, zoom });
assert.ok(arcs.length > 0 && arcs.every((radius) => radius >= 4), `overview markers remain visible: ${arcs}`);
assert.ok(texts.length > 0 && texts.every((text) => text.size >= 10), `overview captions remain readable: ${JSON.stringify(texts)}`);

for (const [width, height] of [[336, 320], [294, 320], [900, 648]]) {
  const fit = fitOverworldView(width, height, 192 * 16, 137 * 16);
  let view = zoomOverworldView(fit, 1.3, width / 2, height / 2, fit.zoom);
  for (let step = 0; step < 20; step += 1) view = zoomOverworldView(view, 0.8, width / 2, height / 2, fit.zoom);
  assert.ok(view.zoom < fit.zoom, "zoom out can pass the fit scale");
  assert.ok(192 * 16 * view.zoom <= width && 137 * 16 * view.zoom <= height, "the entire atlas fits");
  assert.ok(view.zoom > 0);
  const less = zoomOverworldView(fit, 0.8, width / 2, height / 2, fit.zoom);
  assert.ok(less.zoom < fit.zoom, "minus never enlarges a fitted map");
}
console.log("Overworld marker readability and viewport-relative zoom PASS");
