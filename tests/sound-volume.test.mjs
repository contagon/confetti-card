import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// Exercise the real preset synthesis; replace only the browser's audio output.
const gains = [];
const parameter = () => ({
  value: 0,
  setValueAtTime() {},
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
});
globalThis.AudioContext = class {
  state = 'running';
  currentTime = 0;
  destination = {};
  createGain() {
    const node = { gain: parameter(), connect() {} };
    gains.push(node);
    return node;
  }
  createOscillator() {
    return { frequency: parameter(), detune: parameter(), connect() {}, start() {}, stop() {} };
  }
};

const bundle = await build({
  entryPoints: ['src/presets.ts'], bundle: true, write: false, platform: 'node', format: 'esm',
  // Presets create emoji shapes at import time, which needs a browser canvas.
  // Visual rendering is unrelated to the synthesis being exercised here.
  plugins: [{
    name: 'no-visual-rendering',
    setup(builder) {
      builder.onResolve({ filter: /^canvas-confetti$/ }, () => ({ path: 'canvas-confetti', namespace: 'visual' }));
      builder.onLoad({ filter: /.*/, namespace: 'visual' }, () => ({ contents: 'export default { shapeFromText: () => ({}), shapeFromPath: () => ({}) };' }));
    },
  }],
});
const { presetRegistry } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const baseGains = {
  confetti: 0.3, fireworks: 0.25, snow: 0.15, stars: 0.2,
  hearts: 0.2, rockets: 0.25, rainbow: 0.2, dinosaurs: 0.3,
  unicorn: 0.2, sports: 0.3, vehicles: 0.2, overload: 0.25,
};

// Missing scaling, treating zero as a default, or accepting unsafe values
// must change the gain delivered to the destination and fail these tests.
for (const preset of presetRegistry) {
  for (const [label, volume, multiplier] of [
    ['default', undefined, 1], ['muted', 0, 0], ['quieter', 50, 0.5],
    ['unchanged', 100, 1], ['boosted', 500, 5], ['negative', -10, 0],
    ['above maximum', 600, 5], ['NaN', NaN, 1], ['infinite', Infinity, 1],
  ]) {
    test(`${preset.id}: ${label} volume scales the master gain`, () => {
      gains.length = 0;
      preset.playSound(volume);
      assert.ok(gains.length > 0, 'sound synthesis creates a master gain');
      assert.ok(Math.abs(gains[0].gain.value - baseGains[preset.id] * multiplier) < 1e-12);
    });
  }
}
