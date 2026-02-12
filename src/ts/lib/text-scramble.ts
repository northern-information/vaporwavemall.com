declare global {
  interface String {
    shuffle(): string;
  }
}

// Thanks to Andy E for this shuffler:
// https://stackoverflow.com/questions/3943772/how-do-i-shuffle-the-characters-in-a-string-in-javascript
String.prototype.shuffle = function (): string {
  const trim = this.trim();
  const [padL, padR] = this.split(trim);
  const a = trim.split("").filter((c) => c !== " ");
  const fullLen = trim.length;
  const len = a.length;

  for (let i = len - 1; i > 0; i--) {
    const tmp = a[i];
    const j = Math.floor(Math.random() * (i + 1));
    a[i] = a[j];
    a[j] = tmp;
  }

  for (let i = fullLen - len; i > 0; i--) {
    a.splice(Math.floor(Math.random() * (len - 1) + 1), 0, " ");
  }

  return [padL, ...a, padR].join("");
};

interface QueueItem {
  from: string;
  to: string;
  start: number;
  end: number;
  char?: string;
}

// Thanks to Justin Windle for posting this scrambler:
// https://codepen.io/soulwire/pen/mErPAK
export class TextScramble {
  el: HTMLElement;
  chars: string;
  queue: QueueItem[];
  frame: number;
  frameRequest: number;
  resolve!: () => void;

  constructor(el: HTMLElement) {
    this.el = el;
    this.chars = "!<>-_\\/[]{}—=+*^?#________";
    this.queue = [];
    this.frame = 0;
    this.frameRequest = 0;
    this.update = this.update.bind(this);
  }

  setText(newText: string): Promise<void> {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise<void>((resolve) => (this.resolve = resolve));
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || "";
      const to = newText[i] || "";
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }

  update(): void {
    let output = "";
    let complete = 0;
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="dud">${char}</span>`;
      } else {
        output += from;
      }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  }

  randomChar(): string {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

export function getRandomIntInclusive(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}
