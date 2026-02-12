import { TextScramble, getRandomIntInclusive } from "./lib/text-scramble.js";

document.addEventListener("DOMContentLoaded", function () {
  const el = document.querySelector(".fc") as HTMLElement;
  const fx = new TextScramble(el);
  let i = 3;
  const next = (): void => {
    i--;
    let text = "FLASH CRASH";
    if (Math.floor(Math.random() * 2)) {
      text = "HSALFCRASH";
    }
    if (i < 1) {
      i = 3;
    } else {
      text = text.shuffle();
    }
    if (Math.floor(Math.random() * 2)) {
      document.querySelector(".fc")!.classList.add("rotate");
    } else {
      document.querySelector(".fc")!.classList.remove("rotate");
    }
    fx.setText(text).then(() => {
      setTimeout(next, getRandomIntInclusive(1000, 5000));
    });
  };

  next();
});
