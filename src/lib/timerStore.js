let activeSeconds = null;
const listeners = new Set();

export function startTimer(seconds) {
  activeSeconds = seconds;
  listeners.forEach(fn => fn(seconds));
}

export function clearTimer() {
  activeSeconds = null;
  listeners.forEach(fn => fn(null));
}

export function subscribeTimer(fn) {
  listeners.add(fn);
  fn(activeSeconds);
  return () => listeners.delete(fn);
}