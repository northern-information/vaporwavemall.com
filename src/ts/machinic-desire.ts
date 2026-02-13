import { GameOfLife } from "./lib/game-of-life.js";

const GRID_SIZE = 150;
const STEP_MS = 150;
const IMAGE_COUNT = 16;
const MAX_GENERATIONS = 500;
const LUMINANCE_THRESHOLD = 120;

// Fixed 4-color palette shared across all machinic desire images
// Sorted dark to light: [darkest, dark, light, lightest]
const PALETTE: [number, number, number][] = [
  [26, 10, 46],
  [74, 42, 110],
  [200, 168, 232],
  [255, 255, 255],
];

const luminance = (r: number, g: number, b: number): number =>
  0.299 * r + 0.587 * g + 0.114 * b;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const nearestColorIndex = (r: number, g: number, b: number): number => {
  let minDist = Infinity;
  let idx = 0;
  for (let i = 0; i < PALETTE.length; i++) {
    const [pr, pg, pb] = PALETTE[i];
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < minDist) {
      minDist = dist;
      idx = i;
    }
  }
  return idx;
};

// Shared mutable state
let currentInterval: ReturnType<typeof setInterval> | undefined;
let snapshots: Uint8Array[] = [];
let ctx: CanvasRenderingContext2D | null = null;
let genEl: HTMLElement | null = null;
let scrubber: HTMLInputElement | null = null;
let playing = false;

const iconPlay = document.getElementById("icon-play") as HTMLElement | null;
const iconPause = document.getElementById("icon-pause") as HTMLElement | null;

const showPlayIcon = () => {
  if (iconPlay) iconPlay.style.display = "";
  if (iconPause) iconPause.style.display = "none";
};

const showPauseIcon = () => {
  if (iconPlay) iconPlay.style.display = "none";
  if (iconPause) iconPause.style.display = "";
};

const renderGeneration = (gen: number) => {
  if (!ctx || !genEl || !snapshots[gen]) return;
  const snap = snapshots[gen];
  const imgData = ctx.createImageData(GRID_SIZE, GRID_SIZE);
  for (let pos = 0; pos < GRID_SIZE * GRID_SIZE; pos++) {
    const color = PALETTE[snap[pos]];
    const i = pos * 4;
    imgData.data[i] = color[0];
    imgData.data[i + 1] = color[1];
    imgData.data[i + 2] = color[2];
    imgData.data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  genEl.textContent = String(gen);
};

const pause = () => {
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = undefined;
  }
  playing = false;
  showPlayIcon();
};

const play = (from: number) => {
  if (currentInterval) clearInterval(currentInterval);
  let gen = from;
  playing = true;
  showPauseIcon();
  currentInterval = setInterval(() => {
    gen++;
    if (gen > MAX_GENERATIONS) gen = 0;
    if (scrubber) scrubber.value = String(gen);
    renderGeneration(gen);
  }, STEP_MS);
};

const startLife = async (imageIndex: number) => {
  const canvas = document.getElementById(
    "machinic-canvas",
  ) as HTMLCanvasElement;
  genEl = document.getElementById("generation");
  const maxGenEl = document.getElementById("max-generation");
  scrubber = document.getElementById("scrubber") as HTMLInputElement;
  if (!canvas || !genEl || !maxGenEl || !scrubber) return;

  pause();

  ctx = canvas.getContext("2d");
  if (!ctx) return;

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

  // Map each pixel to a color index and initialize Game of Life
  const colorIndices = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const game = new GameOfLife(GRID_SIZE, GRID_SIZE);

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const i = (y * GRID_SIZE + x) * 4;
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const ci = nearestColorIndex(r, g, b);
      const alive = luminance(r, g, b) > LUMINANCE_THRESHOLD;
      // Sync color index with alive state so ci encodes alive/dead directly
      colorIndices[y * GRID_SIZE + x] =
        alive && ci < 2 ? ci + 2 : !alive && ci >= 2 ? ci - 2 : ci;
      game.setCell(x, y, alive);
    }
  }

  // Pre-compute all generations as snapshots of color indices
  // After syncing, ci >= 2 means alive, ci < 2 means dead
  snapshots = [new Uint8Array(colorIndices)];

  for (let gen = 0; gen < MAX_GENERATIONS; gen++) {
    game.step();
    game.forEach((x, y, alive) => {
      const pos = y * GRID_SIZE + x;
      const ci = colorIndices[pos];
      const wasAlive = ci >= 2;
      if (alive !== wasAlive) {
        colorIndices[pos] = alive ? ci + 2 : ci - 2;
      }
    });
    snapshots.push(new Uint8Array(colorIndices));
  }

  // Set canvas to grid size; CSS scales it up with pixelated rendering
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;

  // Setup scrubber
  scrubber.min = "0";
  scrubber.max = String(MAX_GENERATIONS);
  scrubber.value = "0";
  maxGenEl.textContent = String(MAX_GENERATIONS);

  renderGeneration(0);
  play(0);
};

// Play/pause button
const playPauseBtn = document.getElementById("play-pause");
if (playPauseBtn) {
  playPauseBtn.addEventListener("click", () => {
    if (playing) {
      pause();
    } else if (snapshots.length > 0) {
      const gen = scrubber ? Number(scrubber.value) : 0;
      play(gen);
    }
  });
}

// Scrubber — dragging pauses playback
const scrubberEl = document.getElementById("scrubber") as HTMLInputElement;
if (scrubberEl) {
  scrubberEl.addEventListener("pointerdown", () => {
    pause();
  });

  scrubberEl.addEventListener("input", () => {
    renderGeneration(Number(scrubberEl.value));
  });
}

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
    if (i === 0) thumb.classList.add("md-selected");
  }
  startLife(0);
}
