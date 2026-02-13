import { GameOfLife } from "./lib/game-of-life.js";

const GRID_SIZE = 150;
const STEP_MS = 150;
const IMAGE_COUNT = 16;

const luminance = (r: number, g: number, b: number): number =>
  0.299 * r + 0.587 * g + 0.114 * b;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const extractPalette = (
  imageData: ImageData,
): [number, number, number, number][] => {
  const colorCounts = new Map<
    string,
    { r: number; g: number; b: number; count: number }
  >();
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 32) * 32;
    const g = Math.round(data[i + 1] / 32) * 32;
    const b = Math.round(data[i + 2] / 32) * 32;
    const key = `${r},${g},${b}`;

    const existing = colorCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(key, { r, g, b, count: 1 });
    }
  }

  return [...colorCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .sort((a, b) => luminance(a.r, a.g, a.b) - luminance(b.r, b.g, b.b))
    .map((c) => [c.r, c.g, c.b, 255] as [number, number, number, number]);
};

const nearestColorIndex = (
  r: number,
  g: number,
  b: number,
  palette: [number, number, number, number][],
): number => {
  let minDist = Infinity;
  let idx = 0;
  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = palette[i];
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < minDist) {
      minDist = dist;
      idx = i;
    }
  }
  return idx;
};

let currentInterval: ReturnType<typeof setInterval> | undefined;

const startLife = async (imageIndex: number) => {
  const canvas = document.getElementById(
    "machinic-canvas",
  ) as HTMLCanvasElement;
  const genEl = document.getElementById("generation") as HTMLElement;
  if (!canvas || !genEl) return;

  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = undefined;
  }

  const ctx = canvas.getContext("2d")!;
  const padded = String(imageIndex).padStart(2, "0");
  const img = await loadImage(
    `/assets/images/machinic-desire-${padded}.png`,
  );

  // Sample image at grid resolution
  const offscreen = document.createElement("canvas");
  offscreen.width = GRID_SIZE;
  offscreen.height = GRID_SIZE;
  const offCtx = offscreen.getContext("2d")!;
  offCtx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);
  const imageData = offCtx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);

  // Extract 4-color palette sorted dark to light
  const palette = extractPalette(imageData);

  // Map each pixel to a color index and initialize Game of Life
  const colorIndices = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const game = new GameOfLife(GRID_SIZE, GRID_SIZE);

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const i = (y * GRID_SIZE + x) * 4;
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const idx = nearestColorIndex(r, g, b, palette);
      colorIndices[y * GRID_SIZE + x] = idx;
      // Lighter two colors (indices 2, 3) are alive
      game.setCell(x, y, idx >= 2);
    }
  }

  // Set canvas to grid size; CSS scales it up with pixelated rendering
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;

  const render = () => {
    const imgData = ctx.createImageData(GRID_SIZE, GRID_SIZE);
    game.forEach((x, y, alive) => {
      const ci = colorIndices[y * GRID_SIZE + x];
      // Map color index to its alive/dead pair:
      // 0 <-> 2, 1 <-> 3
      let renderIdx: number;
      if (alive) {
        renderIdx = ci >= 2 ? ci : ci + 2;
      } else {
        renderIdx = ci < 2 ? ci : ci - 2;
      }

      const color = palette[renderIdx];
      const i = (y * GRID_SIZE + x) * 4;
      imgData.data[i] = color[0];
      imgData.data[i + 1] = color[1];
      imgData.data[i + 2] = color[2];
      imgData.data[i + 3] = color[3];
    });
    ctx.putImageData(imgData, 0, 0);
    genEl.textContent = String(game.getGeneration());
  };

  render();

  currentInterval = setInterval(() => {
    game.step();

    // Update color indices for cells that changed state
    game.forEach((x, y, alive) => {
      const pos = y * GRID_SIZE + x;
      const ci = colorIndices[pos];
      const wasAlive = ci >= 2;
      if (alive !== wasAlive) {
        if (alive) {
          colorIndices[pos] = ci + 2;
        } else {
          colorIndices[pos] = ci - 2;
        }
      }
    });

    render();
  }, STEP_MS);
};

// Build thumbnail selector
const selector = document.getElementById("image-selector");
if (selector) {
  for (let i = 0; i < IMAGE_COUNT; i++) {
    const padded = String(i).padStart(2, "0");
    const thumb = document.createElement("img");
    thumb.src = `/assets/images/machinic-desire-${padded}.png`;
    thumb.alt = `machinic desire ${padded}`;
    thumb.className = "md-thumb";
    thumb.addEventListener("click", () => {
      selector
        .querySelectorAll(".md-thumb")
        .forEach((t) => t.classList.remove("md-selected"));
      thumb.classList.add("md-selected");
      startLife(i);
    });
    selector.appendChild(thumb);
  }
}
