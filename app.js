const display = document.getElementById("display");
const startPauseBtn = document.getElementById("startPauseBtn");
const clearBtn = document.getElementById("clearBtn");
const timeForm = document.getElementById("timeForm");
const secondsInput = document.getElementById("secondsInput");
const timesList = document.getElementById("timesList");

let isRunning = false;
let elapsedMs = 0;
let startTimestamp = 0;
let rafId = null;
let timeId = 0;
let bellTimes = [];
let bellAudioContext = null;

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${seconds}.${tenths}`;
}

function getBellAudioContext() {
  if (!bellAudioContext) {
    bellAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (bellAudioContext.state === "suspended") {
    bellAudioContext.resume().catch(() => {});
  }
  return bellAudioContext;
}

function ringBell() {
  const audioContext = getBellAudioContext();
  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  const oscA = audioContext.createOscillator();
  const oscB = audioContext.createOscillator();

  oscA.type = "sine";
  oscB.type = "triangle";
  oscA.frequency.setValueAtTime(900, now);
  oscB.frequency.setValueAtTime(1350, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.45, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

  oscA.connect(gain);
  oscB.connect(gain);
  gain.connect(audioContext.destination);

  oscA.start(now);
  oscB.start(now);
  oscA.stop(now + 0.25);
  oscB.stop(now + 0.25);
}

function renderTimes() {
  const fragment = document.createDocumentFragment();
  bellTimes
    .slice()
    .sort((a, b) => a.ms - b.ms)
    .forEach((item) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `${(item.ms / 1000).toFixed(1)}s`;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        bellTimes = bellTimes.filter((entry) => entry.id !== item.id);
        renderTimes();
      });
      li.append(label, removeBtn);
      fragment.appendChild(li);
    });
  timesList.replaceChildren(fragment);
}

function maybeRingBell(currentMs) {
  bellTimes.forEach((item) => {
    if (!item.triggered && currentMs >= item.ms) {
      item.triggered = true;
      ringBell();
    }
  });
}

function tick(now) {
  if (!isRunning) {
    return;
  }
  elapsedMs = now - startTimestamp;
  display.textContent = formatElapsed(elapsedMs);
  maybeRingBell(elapsedMs);
  rafId = requestAnimationFrame(tick);
}

function start() {
  isRunning = true;
  startTimestamp = performance.now() - elapsedMs;
  startPauseBtn.textContent = "Pause";
  rafId = requestAnimationFrame(tick);
}

function pause() {
  isRunning = false;
  startPauseBtn.textContent = "Resume";
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function clearStopwatch() {
  elapsedMs = 0;
  display.textContent = formatElapsed(elapsedMs);
  bellTimes = bellTimes.map((item) => ({ ...item, triggered: false }));
  if (!isRunning) {
    startPauseBtn.textContent = "Start";
  }
}

startPauseBtn.addEventListener("click", () => {
  if (isRunning) {
    pause();
    return;
  }
  start();
});

clearBtn.addEventListener("click", () => {
  if (isRunning) {
    pause();
  }
  clearStopwatch();
});

timeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const seconds = Number(secondsInput.value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return;
  }
  bellTimes.push({
    id: ++timeId,
    ms: Math.round(seconds * 1000),
    triggered: false,
  });
  renderTimes();
  timeForm.reset();
  secondsInput.focus();
});

display.textContent = formatElapsed(elapsedMs);
