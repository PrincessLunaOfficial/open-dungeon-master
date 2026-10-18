import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/register-alias.mjs", import.meta.url);
const { terrainRasterSize } = await import("../src/app/campaigns/[campaignId]/terrainCanvasParts.tsx");

// Phone and desktop layouts, including the editor's fractional zoom steps.
for (const [width, height] of [[292, 292 * 13 / 21], [1200, 900]]) {
  for (const zoom of [1, 1.5625, 3]) {
    for (const dpr of [1, 2, 3]) {
      const raster = terrainRasterSize(width, height, zoom, dpr);
      const requested = width * height * (zoom * dpr) ** 2;
      assert.ok(raster.width * raster.height <= 8_388_608 && raster.width <= 8192 && raster.height <= 8192, "bounded allocation");
      assert.ok(Math.abs(raster.width / width - raster.height / height) < 0.01, "preserve aspect");
      if (requested <= 8_388_608 && width * zoom * dpr <= 8192 && height * zoom * dpr <= 8192) {
        assert.ok(raster.width >= width * zoom * dpr - 1);
        assert.ok(raster.height >= height * zoom * dpr - 1);
      }
    }
  }
}
console.log("Map editor: device/zoom resolution, aspect and allocation bounds PASS");
