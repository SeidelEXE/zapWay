function randomBetween(min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function applyVariance(baseMs, variance = 0.2) {
  const factor = 1 + (Math.random() * 2 - 1) * variance;
  return Math.max(0, Math.round(baseMs * factor));
}

function calculateTypingDelay(text, options = {}) {
  const {
    msPerChar = 150,
    variance = 0.2,
    minMs = 400,
    maxMs = 30000
  } = options;

  const content = String(text || '');
  const base = content.length * msPerChar;
  const varied = applyVariance(base, variance);
  return Math.min(maxMs, Math.max(minMs, varied));
}

function calculateReadDelay(minMs = 1000, maxMs = 3000) {
  return randomBetween(minMs, maxMs);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  randomBetween,
  applyVariance,
  calculateTypingDelay,
  calculateReadDelay,
  sleep
};

