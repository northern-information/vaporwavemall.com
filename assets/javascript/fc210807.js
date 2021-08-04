$(function() {

// Thanks to Andy E for this shuffler:
// https://stackoverflow.com/questions/3943772/how-do-i-shuffle-the-characters-in-a-string-in-javascript
String.prototype.shuffle = function () {
    var trim = this.trim();
    var [padL, padR] = this.split(trim);
    var a = trim.split("").filter(c => c !== " "),
        fullLen = trim.length,
        len = a.length;

    for(var i = len - 1; i > 0; i--) {
        var tmp = a[i];

        var j = Math.floor(Math.random() * (i + 1));
        a[i] = a[j];
        a[j] = tmp;
    }

    for (var i = (fullLen - len); i > 0; i--) {
        a.splice(Math.floor(Math.random() * (len - 1) + 1), 0, " ");
    }
    
    return [padL, ...a, padR].join("");
}

// Thanks to Justin Windle for posting this scrambler:
// https://codepen.io/soulwire/pen/mErPAK
class TextScramble {
  constructor(el) {
    this.el = el
    this.chars = '!<>-_\\/[]{}—=+*^?#________'
    this.update = this.update.bind(this)
  }
  setText(newText) {
    const oldText = this.el.innerText
    const length = Math.max(oldText.length, newText.length)
    const promise = new Promise((resolve) => this.resolve = resolve)
    this.queue = []
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || ''
      const to = newText[i] || ''
      const start = Math.floor(Math.random() * 40)
      const end = start + Math.floor(Math.random() * 40)
      this.queue.push({ from, to, start, end })
    }
    cancelAnimationFrame(this.frameRequest)
    this.frame = 0
    this.update()
    return promise
  }
  update() {
    let output = ''
    let complete = 0
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i]
      if (this.frame >= end) {
        complete++
        output += to
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar()
          this.queue[i].char = char
        }
        output += `<span class="dud">${char}</span>`
      } else {
        output += from
      }
    }
    this.el.innerHTML = output
    if (complete === this.queue.length) {
      this.resolve()
    } else {
      this.frameRequest = requestAnimationFrame(this.update)
      this.frame++
    }
  }
  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)]
  }
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

const el = document.querySelector('.fc');
const fx = new TextScramble(el);
var i = 3
const next = () => {
  i--
  var text = 'FLASH CRASH';
  if (Math.floor(Math.random() * 2)) {
    text = 'HSALFCRASH';
  }
  if (i < 1) {
    i = 3
  } else {
    text = text.shuffle()
  }
  if (Math.floor(Math.random() * 2)) {
    $('.fc').addClass('rotate');
  } else {
    $('.fc').removeClass('rotate');
  }
  fx.setText(text).then(() => {
    setTimeout(next, getRandomIntInclusive(1000, 5000));
  })
}

next();

});