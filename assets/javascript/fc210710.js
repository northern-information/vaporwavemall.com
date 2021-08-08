/*
 * Config
 */

var config = {
  generation: 0,
  seed: false,
  x: 10,
  y: 10
}

/*
 * Build HTML
 */

function makeGrid(x, y) {
  var out = '';
  for (var iy = y - 1; iy >= 0; iy--) {
    var cells = '';
    for (var ix = x - 1; ix >= 0; ix--) {
      var className = 'x' + ix + 'y' + iy;
      cells += makeCell(className);
    }
    out += makeRow(cells);
  }
  return out;
}

function makeRow(cells) {
  return '<div class="cell-row">' + cells + '</div>';
}

function makeCell(className) {
  return '<div class="cell ' + className + '" data-toggle="0">.</div>';
}

/*
 * Logic
 */

function coinFlip() {
  return (Math.floor(Math.random() * 2) == 0);
}

function toggle(x, y, el = 'life') {
  var cell = document.getElementById(el).getElementsByClassName('x' + x + 'y' + y)[0];
  cell.dataset.toggle = (cell.dataset.toggle == '0') ? '1' : '0';
}

function isLive(x, y) {
  var cell = document.getElementById('life').getElementsByClassName('x' + x + 'y' + y)[0];
  if (cell === null) {
    return false;
  }
  return (cell.dataset.toggle == 1) ? true : false;
}

function getNeighbors(x, y) {
  n = (y != config.y - 1);  // has northern neighbors
  e = (x != 0);             // has eastern neighbors
  s = (y != 0);             // has southern neighbors
  w = (x != config.x - 1);  // has western neighbors
  count = 0;
  if (n && isLive(x, y + 1)) count++;
  if (n && e && isLive(x - 1, y + 1)) count++;
  if (e && isLive(x - 1, y)) count++;
  if (s && e && isLive(x - 1, y - 1)) count++;
  if (s && isLive(x, y - 1)) count++;
  if (s && w && isLive(x + 1, y - 1)) count++;
  if (w && isLive(x + 1, y)) count++;
  if (n && w && isLive(x + 1, y + 1)) count++;
  return count;
}

/*
 * Any live cell with fewer than two live neighbors dies, as if by under population.
 */
function isUnderPopulated(c) {
  return (c < 2);
}

/*
 * Any live cell with two or three live neighbors lives on to the next generation.
 */
 function isHealthy(c) {
  return (c == 2 || c == 3);
}

/*
 * Any live cell with more than three live neighbors dies, as if by overpopulation.
 */
function isOverPopulated(c) {
  return (c > 3);
}

/*
 * Any dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.
 */
function isBorn(c) {
  return (c == 3);
}

function census(x, y) {
  c = getNeighbors(x, y);
  underPopulated = healthy = overPopulated = born = false;
  if (isLive(x, y)) {
    underPopulated = isUnderPopulated(c);
    healthy = isHealthy(c);
    overPopulated = isOverPopulated(c);
  } else {
    born = isBorn(c);
  }
  if (underPopulated || overPopulated) {
    return false;
  }
  if (healthy || born) {
    return true;
  }
}

function buildNextGeneration() {
  config.generation++;
  if (config.generation > 23) {
    seed();
  }
  document.getElementById('next').innerHTML = makeGrid(config.x, config.y);
  live = [];
  for (var iy = config.y - 1; iy >= 0; iy--) {
    for (var ix = config.x - 1; ix >= 0; ix--) {
      if (config.seed) {
        if (coinFlip()) {
          live.push({x: ix, y: iy});
        };
      } else {
        if (census(ix, iy)) {
          live.push({x: ix, y: iy});
        };
      }
    }
  }
  live.forEach(function(cell) {
    toggle(cell.x, cell.y, 'next');
  });
  document.getElementById('life').innerHTML = document.getElementById('next').innerHTML;
  document.getElementById('generation').innerHTML = config.generation;
  config.seed = false;
}

function seed() {
  document.getElementById('generation').innerHTML = 0;
  document.getElementById('life').innerHTML = makeGrid(config.x, config.y);
  config.generation = 0;
  config.seed = true;
}

/*
 * Run game of life.
 */

if (document.getElementById('life')) {
  initialGrid = makeGrid(config.x, config.y);
  document.getElementById('life').innerHTML = initialGrid;
  document.getElementById('next').innerHTML = initialGrid;
  seed();
  setInterval(buildNextGeneration, 1000);
}