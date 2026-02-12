import { GameOfLife } from "./lib/game-of-life.js";

const GRID_X = 10;
const GRID_Y = 10;
const MAX_GENERATIONS = 23;

function makeGrid(x: number, y: number): string {
  let out = "";
  for (let iy = y - 1; iy >= 0; iy--) {
    let cells = "";
    for (let ix = x - 1; ix >= 0; ix--) {
      const className = "x" + ix + "y" + iy;
      cells += `<div class="cell ${className}" data-toggle="0">.</div>`;
    }
    out += `<div class="cell-row">${cells}</div>`;
  }
  return out;
}

function renderGrid(game: GameOfLife, container: HTMLElement): void {
  container.innerHTML = makeGrid(game.width, game.height);
  game.forEach((x, y, alive) => {
    if (alive) {
      const cell = container.getElementsByClassName(
        "x" + x + "y" + y,
      )[0] as HTMLElement;
      if (cell) cell.dataset.toggle = "1";
    }
  });
}

const lifeEl = document.getElementById("life");
const nextEl = document.getElementById("next");
const genEl = document.getElementById("generation");

if (lifeEl && nextEl && genEl) {
  const game = new GameOfLife(GRID_X, GRID_Y);
  game.seed();

  renderGrid(game, lifeEl);
  nextEl.innerHTML = makeGrid(GRID_X, GRID_Y);
  genEl.innerHTML = "0";

  setInterval(() => {
    game.step();

    if (game.getGeneration() > MAX_GENERATIONS) {
      game.seed();
    }

    renderGrid(game, lifeEl);
    genEl.innerHTML = String(game.getGeneration());
  }, 1000);
}
