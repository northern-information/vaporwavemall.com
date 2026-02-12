let countdown = 10;
const countdownElement = document.getElementById("countdown")!;

const interval = setInterval(() => {
  countdown -= 1;
  countdownElement.textContent = String(countdown);

  if (countdown <= 0) {
    clearInterval(interval);
    countdownElement.textContent = "Zzz...";
  }
}, 1000);
