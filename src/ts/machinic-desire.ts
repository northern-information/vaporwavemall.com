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

// Background color (matches .vm-machinic-desire background: #0a0010)
const BG_COLOR: [number, number, number] = [10, 0, 16];

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
let currentVersion: 1 | 2 = 1;
let currentImageIndex = 0;

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

// --- Rendering ---

const renderGenerationV1 = (gen: number) => {
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

const renderGenerationV2 = (gen: number) => {
  if (!ctx || !genEl || !snapshots[gen]) return;
  const snap = snapshots[gen];
  const imgData = ctx.createImageData(GRID_SIZE, GRID_SIZE);
  for (let pos = 0; pos < GRID_SIZE * GRID_SIZE; pos++) {
    const mask = snap[pos];
    const i = pos * 4;
    // Check from lightest (bit 3) to darkest (bit 0), first alive wins
    let found = false;
    for (let c = 3; c >= 0; c--) {
      if (mask & (1 << c)) {
        const color = PALETTE[c];
        imgData.data[i] = color[0];
        imgData.data[i + 1] = color[1];
        imgData.data[i + 2] = color[2];
        imgData.data[i + 3] = 255;
        found = true;
        break;
      }
    }
    if (!found) {
      imgData.data[i] = BG_COLOR[0];
      imgData.data[i + 1] = BG_COLOR[1];
      imgData.data[i + 2] = BG_COLOR[2];
      imgData.data[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  genEl.textContent = String(gen);
};

const renderGeneration = (gen: number) => {
  if (currentVersion === 1) renderGenerationV1(gen);
  else renderGenerationV2(gen);
};

// --- Playback ---

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

// --- Image loading helper ---

const loadAndSampleImage = async (imageIndex: number) => {
  const padded = String(imageIndex).padStart(2, "0");
  const img = await loadImage(
    `/assets/images/machinic-desire-${padded}.png`,
  );
  const offscreen = document.createElement("canvas");
  offscreen.width = GRID_SIZE;
  offscreen.height = GRID_SIZE;
  const offCtx = offscreen.getContext("2d")!;
  offCtx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);
  return offCtx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
};

// --- V1: Single Game of Life (alive/dead based on luminance) ---

const startLifeV1 = async (imageIndex: number) => {
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

  const imageData = await loadAndSampleImage(imageIndex);

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
      colorIndices[y * GRID_SIZE + x] =
        alive && ci < 2 ? ci + 2 : !alive && ci >= 2 ? ci - 2 : ci;
      game.setCell(x, y, alive);
    }
  }

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

  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;

  scrubber.min = "0";
  scrubber.max = String(MAX_GENERATIONS);
  scrubber.value = "0";
  maxGenEl.textContent = String(MAX_GENERATIONS);

  renderGenerationV1(0);
  play(0);
};

// --- V2: 4 independent Game of Life layers ---
// Each palette color runs its own game. Dead cells are transparent.
// Lightest color (index 3) is z-indexed on top, darkest (index 0) on bottom.

const startLifeV2 = async (imageIndex: number) => {
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

  const imageData = await loadAndSampleImage(imageIndex);

  // Create 4 independent Game of Life instances, one per palette color
  const games: GameOfLife[] = [];
  for (let c = 0; c < 4; c++) {
    games.push(new GameOfLife(GRID_SIZE, GRID_SIZE));
  }

  // Classify each pixel to its nearest palette color and seed that color's game
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const i = (y * GRID_SIZE + x) * 4;
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const ci = nearestColorIndex(r, g, b);
      games[ci].setCell(x, y, true);
    }
  }

  // Pre-compute snapshots as bitmasks
  // Each byte: bit c set means color c is alive at that position
  const buildBitmask = (): Uint8Array => {
    const mask = new Uint8Array(GRID_SIZE * GRID_SIZE);
    for (let c = 0; c < 4; c++) {
      games[c].forEach((x, y, alive) => {
        if (alive) mask[y * GRID_SIZE + x] |= 1 << c;
      });
    }
    return mask;
  };

  snapshots = [buildBitmask()];

  for (let gen = 0; gen < MAX_GENERATIONS; gen++) {
    for (let c = 0; c < 4; c++) games[c].step();
    snapshots.push(buildBitmask());
  }

  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;

  scrubber.min = "0";
  scrubber.max = String(MAX_GENERATIONS);
  scrubber.value = "0";
  maxGenEl.textContent = String(MAX_GENERATIONS);

  renderGenerationV2(0);
  play(0);
};

// --- Unified start ---

const startLife = async (imageIndex: number) => {
  currentImageIndex = imageIndex;
  if (currentVersion === 1) await startLifeV1(imageIndex);
  else await startLifeV2(imageIndex);
};

// --- Tabs ---

const tabV1 = document.getElementById("tab-v1");
const tabV2 = document.getElementById("tab-v2");
const descV1 = document.getElementById("desc-v1");
const descV2 = document.getElementById("desc-v2");

const updateTabs = () => {
  tabV1?.classList.toggle("md-tab-active", currentVersion === 1);
  tabV2?.classList.toggle("md-tab-active", currentVersion === 2);
  if (descV1) descV1.style.display = currentVersion === 1 ? "" : "none";
  if (descV2) descV2.style.display = currentVersion === 2 ? "" : "none";
};

tabV1?.addEventListener("click", () => {
  if (currentVersion === 1) return;
  currentVersion = 1;
  updateTabs();
  startLife(currentImageIndex);
});

tabV2?.addEventListener("click", () => {
  if (currentVersion === 2) return;
  currentVersion = 2;
  updateTabs();
  startLife(currentImageIndex);
});

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
