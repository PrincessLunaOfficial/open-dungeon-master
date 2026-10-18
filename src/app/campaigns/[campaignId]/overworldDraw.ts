import { skinForGenre, tileJitter, type OverworldTile, type XY } from "@/lib/overworld/logic";
import type { OverworldLabel, OverworldPath, PathKind } from "@/lib/overworld/features";
import { textKey } from "@/lib/language/text-logic";

// Canvas drawing for the region map, lifted out of OverworldPanel so the
// panel has room for the DM's authoring controls. Nothing here touches
// React or the network: terrain, routes, pins, place markers and the party
// marker, in that order, into a context the caller has already transformed.

export const OVERWORLD_TILE = 16;

export type OverworldLocation = {
  id: string;
  name: string;
  visited: boolean;
  isCurrent: boolean;
  connections: string[];
  anchor: { x: number; y: number } | null;
};

export type OverworldData = {
  map: {
    seed: number;
    width: number;
    height: number;
    terrain: string;
    pins: Array<{ id: string; x: number; y: number; label: string }>;
    partyXy: { x: number; y: number } | null;
    params: Record<string, number>;
    paths: OverworldPath[];
    labels: OverworldLabel[];
    backdropPath: string;
    notes?: string;
  };
  locations: OverworldLocation[];
};

export type DrawOptions = {
  genre: string;
  pulse: number;
  // Keep place markers and their captions legible in CSS pixels while zooming.
  zoom?: number;
  viewport?: { left: number; top: number; width: number; height: number };
  selectedLocationId?: string | null;
  // The backdrop, once the panel has loaded it. Drawn in place of the tiles.
  backdrop?: HTMLImageElement | null;
  // A road, river or border still being drawn: its points so far.
  pending?: { kind: PathKind; points: XY[] } | null;
};

const PATH_STYLES: Record<PathKind, { stroke: string; width: number; dash: number[] }> = {
  road: { stroke: "rgba(214, 178, 110, 0.95)", width: 1.8, dash: [] },
  river: { stroke: "rgba(96, 168, 236, 0.95)", width: 2.4, dash: [] },
  border: { stroke: "rgba(232, 96, 96, 0.9)", width: 1.6, dash: [4, 3] },
};

function drawPath(
  context: CanvasRenderingContext2D,
  path: { kind: PathKind; points: XY[]; label?: string },
  tile: number,
  pending = false,
) {
  if (path.points.length === 0) {
    return;
  }
  const style = PATH_STYLES[path.kind];
  context.strokeStyle = style.stroke;
  context.lineWidth = style.width;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.setLineDash(pending ? [2, 3] : style.dash);
  context.beginPath();
  path.points.forEach((point, index) => {
    const x = point.x * tile + tile / 2;
    const y = point.y * tile + tile / 2;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
  context.setLineDash([]);
  if (pending) {
    // Handles on every point, so the DM can see what a tap added.
    context.fillStyle = style.stroke;
    for (const point of path.points) {
      context.beginPath();
      context.arc(point.x * tile + tile / 2, point.y * tile + tile / 2, 2.5, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (path.label) {
    const middle = path.points[Math.floor(path.points.length / 2)];
    context.font = "italic 10px sans-serif";
    context.fillStyle = "rgba(250, 240, 220, 0.85)";
    context.fillText(path.label, middle.x * tile + tile / 2 + 5, middle.y * tile + tile / 2 - 4);
  }
}

function drawLabels(context: CanvasRenderingContext2D, labels: OverworldLabel[], tile: number) {
  for (const label of labels) {
    const x = label.x * tile + tile / 2;
    const y = label.y * tile + tile / 2;
    const large = label.size === "large";
    context.font = large ? "700 20px serif" : "600 11px sans-serif";
    context.textAlign = "center";
    context.lineWidth = large ? 4 : 3;
    context.strokeStyle = "rgba(20, 16, 10, 0.75)";
    context.fillStyle = large ? "rgba(250, 236, 200, 0.9)" : "rgba(250, 240, 220, 0.95)";
    const text = large ? label.text.toUpperCase() : label.text;
    context.strokeText(text, x, y);
    context.fillText(text, x, y);
    context.textAlign = "start";
  }
}

// A drawn backdrop counts as loaded once the browser has its size.
function usable(image: HTMLImageElement | null | undefined): image is HTMLImageElement {
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

// Shades a hex fill by a small factor (deterministic per tile).
function shade(hex: string, factor: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channel = (offset: number) => {
    const raw = (value >> offset) & 0xff;
    return Math.min(255, Math.max(0, Math.round(raw * (1 + factor))));
  };
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

export function drawOverworld(
  context: CanvasRenderingContext2D,
  data: OverworldData,
  options: DrawOptions,
) {
  const skin = skinForGenre(options.genre);
  const tile = OVERWORLD_TILE;
  const markerScale = 1 / (options.zoom || 1);
  const { width, height, terrain } = data.map;

  if (usable(options.backdrop)) {
    // The picture stands in for the tiles, stretched to the grid so a tap
    // lands on the same tile whichever of the two is showing.
    context.drawImage(options.backdrop, 0, 0, width * tile, height * tile);
  } else {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const kind = (terrain[y * width + x] ?? "w") as OverworldTile;
        context.fillStyle = shade(skin[kind].fill, tileJitter(x, y));
        context.fillRect(x * tile, y * tile, tile, tile);
      }
    }
  }

  // Borders under rivers under roads: a road crossing a river reads as a
  // bridge, and a border is the faintest of the three.
  for (const kind of ["border", "river", "road"] as const) {
    for (const path of data.map.paths ?? []) {
      if (path.kind === kind) {
        drawPath(context, path, tile);
      }
    }
  }
  if (options.pending) {
    drawPath(context, options.pending, tile, true);
  }

  // Routes: curves between anchors of connected locations, drawn once per pair.
  const anchorById = new Map(
    data.locations
      .filter((location) => location.anchor)
      .map((location) => [location.id, location.anchor as { x: number; y: number }] as const),
  );
  const idByName = new Map(
    data.locations.map((location) => [textKey(location.name), location.id] as const),
  );
  context.strokeStyle = "rgba(240, 220, 170, 0.45)";
  context.lineWidth = 1.5;
  context.setLineDash([5, 4]);
  const drawn = new Set<string>();
  for (const location of data.locations) {
    const from = anchorById.get(location.id);
    if (!from) {
      continue;
    }
    for (const connectionName of location.connections) {
      const targetId = idByName.get(textKey(connectionName));
      const to = targetId ? anchorById.get(targetId) : null;
      if (!to || !targetId) {
        continue;
      }
      const key = [location.id, targetId].sort().join("|");
      if (drawn.has(key)) {
        continue;
      }
      drawn.add(key);
      const fromX = from.x * tile + tile / 2;
      const fromY = from.y * tile + tile / 2;
      const toX = to.x * tile + tile / 2;
      const toY = to.y * tile + tile / 2;
      const midX = (fromX + toX) / 2 + (fromY - toY) * 0.15;
      const midY = (fromY + toY) / 2 + (toX - fromX) * 0.15;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.quadraticCurveTo(midX, midY, toX, toY);
      context.stroke();
    }
  }
  context.setLineDash([]);

  // Lead pins under the location markers.
  for (const pin of data.map.pins) {
    const pinX = pin.x * tile + tile / 2;
    const pinY = pin.y * tile + tile / 2;
    context.fillStyle = "rgba(190, 120, 240, 0.9)";
    context.beginPath();
    context.arc(pinX, pinY, 4 * markerScale, 0, Math.PI * 2);
    context.fill();
    if (pin.label) {
      context.font = `${11 * markerScale}px sans-serif`;
      context.fillStyle = "rgba(220, 190, 250, 0.95)";
      context.fillText(pin.label, pinX + 7 * markerScale, pinY + 3 * markerScale);
    }
  }

  // Locations: solid dots for visited, ghost dots for known-unvisited, pulse
  // ring on the party's current position, and a bright ring on whichever one
  // the DM has picked up to move.
  for (const location of data.locations) {
    const anchor = location.anchor;
    if (!anchor) {
      continue;
    }
    const markerX = anchor.x * tile + tile / 2;
    const markerY = anchor.y * tile + tile / 2;
    if (location.isCurrent) {
      const pulse = 6 + Math.sin(options.pulse / 12) * 2.5;
      context.strokeStyle = "rgba(250, 200, 90, 0.85)";
      context.lineWidth = 2 * markerScale;
      context.beginPath();
      context.arc(markerX, markerY, pulse * markerScale, 0, Math.PI * 2);
      context.stroke();
    }
    if (options.selectedLocationId === location.id) {
      context.strokeStyle = "rgba(120, 220, 250, 0.95)";
      context.lineWidth = 2 * markerScale;
      context.beginPath();
      context.arc(markerX, markerY, 9 * markerScale, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = location.visited
      ? "rgba(250, 225, 160, 0.95)"
      : "#ac741c";
    context.beginPath();
    context.arc(markerX, markerY, 5 * markerScale, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(30, 25, 15, 0.8)";
    context.lineWidth = markerScale;
    context.stroke();
  }

  // Captions stay screen-sized, but nearby places must not write over one
  // another at island scale. Reserve every dot, then place names around
  // them, keeping the current place first. Zooming reveals more room.
  const bounds = options.viewport ?? { left: 0, top: 0, width: width * tile, height: height * tile };
  type Box = { left: number; top: number; right: number; bottom: number };
  const occupied: Box[] = data.locations.filter((location) => location.anchor).map((location) => {
    const x = (location.anchor!.x + .5) * tile, y = (location.anchor!.y + .5) * tile;
    return { left: x - 7 * markerScale, right: x + 7 * markerScale, top: y - 7 * markerScale, bottom: y + 7 * markerScale };
  });
  const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  context.font = `600 ${11 * markerScale}px sans-serif`;
  const named = [...data.locations].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
  for (const location of named) {
    if (!location.anchor) continue;
    const x = (location.anchor.x + .5) * tile, y = (location.anchor.y + .5) * tile;
    const textWidth = context.measureText(location.name).width;
    let placed = false;
    for (const row of [-1, 1, -2, 2, -3, 3, -4, 4]) {
      for (const side of [1, -1]) {
        const textX = side === 1 ? x + 9 * markerScale : x - textWidth - 9 * markerScale;
        const textY = y + (row * 14 + 4) * markerScale;
        const box = { left: textX - 2 * markerScale, right: textX + textWidth + 2 * markerScale,
          top: textY - 11 * markerScale, bottom: textY + 3 * markerScale };
        if (box.left < bounds.left || box.right > bounds.left + bounds.width ||
            box.top < bounds.top || box.bottom > bounds.top + bounds.height || occupied.some((other) => overlaps(box, other))) continue;
        occupied.push(box);
        if (Math.abs(row) > 1) {
          context.beginPath();
          context.moveTo(x + side * 6 * markerScale, y);
          context.lineTo(side === 1 ? textX : textX + textWidth, textY - 4 * markerScale);
          context.strokeStyle = "rgba(40, 30, 15, 0.7)";
          context.lineWidth = markerScale;
          context.stroke();
        }
        context.lineWidth = 3 * markerScale;
        context.strokeStyle = "rgba(20, 16, 10, 0.9)";
        context.fillStyle = "rgba(250, 240, 220, 0.95)";
        context.strokeText(location.name, textX, textY);
        context.fillText(location.name, textX, textY);
        placed = true;
        break;
      }
      if (placed) break;
    }
  }

  drawLabels(context, data.map.labels ?? [], tile);

  // The party marker, on top of everything: a party between two places has no
  // current location, which is exactly when the table most wants to see it.
  const party = data.map.partyXy;
  if (party) {
    const partyX = party.x * tile + tile / 2;
    const partyY = party.y * tile + tile / 2;
    context.fillStyle = "rgba(120, 220, 250, 0.95)";
    context.beginPath();
    context.moveTo(partyX, partyY - 6);
    context.lineTo(partyX + 5, partyY + 5);
    context.lineTo(partyX - 5, partyY + 5);
    context.closePath();
    context.fill();
    context.strokeStyle = "rgba(10, 25, 35, 0.9)";
    context.lineWidth = 1;
    context.stroke();
  }
}

// The whole map at one tile per OVERWORLD_TILE pixels, as a PNG. Drawn from
// scratch on its own canvas so the view's pan and zoom do not crop it.
export function renderOverworldPng(
  data: OverworldData,
  options: Pick<DrawOptions, "genre" | "backdrop">,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = data.map.width * OVERWORLD_TILE;
  canvas.height = data.map.height * OVERWORLD_TILE;
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.resolve(null);
  }
  drawOverworld(context, data, { ...options, pulse: 0 });
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

// Renders and hands the PNG to the browser as a download. Returns what went
// wrong, or null.
export async function saveOverworldPng(
  data: OverworldData,
  options: Pick<DrawOptions, "genre" | "backdrop">,
): Promise<string | null> {
  const blob = await renderOverworldPng(data, options);
  if (!blob) {
    return "The map would not render.";
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `region-map-${data.map.seed}.png`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return null;
}
