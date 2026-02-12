export class GameOfLife {
  readonly width: number;
  readonly height: number;
  private grid: boolean[][];
  private generation: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.generation = 0;
    this.grid = this.createGrid();
  }

  private createGrid(): boolean[][] {
    return Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => false),
    );
  }

  getGeneration(): number {
    return this.generation;
  }

  getCell(x: number, y: number): boolean {
    return this.grid[y]?.[x] ?? false;
  }

  setCell(x: number, y: number, alive: boolean): void {
    if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
      this.grid[y][x] = alive;
    }
  }

  toggleCell(x: number, y: number): void {
    this.setCell(x, y, !this.getCell(x, y));
  }

  seed(): void {
    this.generation = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = Math.random() < 0.5;
      }
    }
  }

  clear(): void {
    this.generation = 0;
    this.grid = this.createGrid();
  }

  private countNeighbors(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          if (this.grid[ny][nx]) count++;
        }
      }
    }
    return count;
  }

  step(): void {
    this.generation++;
    const next = this.createGrid();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const neighbors = this.countNeighbors(x, y);
        const alive = this.grid[y][x];
        if (alive) {
          // Any live cell with 2 or 3 neighbors survives
          next[y][x] = neighbors === 2 || neighbors === 3;
        } else {
          // Any dead cell with exactly 3 neighbors becomes alive
          next[y][x] = neighbors === 3;
        }
      }
    }
    this.grid = next;
  }

  forEach(callback: (x: number, y: number, alive: boolean) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        callback(x, y, this.grid[y][x]);
      }
    }
  }
}
