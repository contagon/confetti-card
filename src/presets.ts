/**
 * Preset confetti effects registry.
 *
 * Each preset defines its visual effect (via canvas-confetti) and a
 * corresponding Web Audio API sound. Adding a new preset is as simple
 * as pushing another entry to the `presetRegistry` array.
 */
import confetti from 'canvas-confetti';

// ---------------------------------------------------------------------------
// Shared audio context
// ---------------------------------------------------------------------------

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// ---------------------------------------------------------------------------
// Preset interface
// ---------------------------------------------------------------------------

export interface Preset {
  /** Unique identifier stored in config. */
  id: string;
  /** Human-readable name shown in the editor. */
  label: string;
  /** MDI icon name for the editor toggle row. */
  icon: string;
  /**
   * Run the visual effect. Receives a full-screen canvas already appended
   * to the DOM. Must return a cleanup function that removes the canvas
   * and stops any running animations.
   */
  run(canvas: HTMLCanvasElement): () => void;
  /** Play the associated sound effect via Web Audio API. */
  playSound(): void;
}

// ---------------------------------------------------------------------------
// Helper: create a full-screen canvas
// ---------------------------------------------------------------------------

export function createFullScreenCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);
  return canvas;
}

// ---------------------------------------------------------------------------
// Preset: Confetti  (school-pride / continuous style)
// ---------------------------------------------------------------------------

const confettiPreset: Preset = {
  id: 'confetti',
  label: 'Confetti',
  icon: 'mdi:party-popper',

  run(canvas) {
    const myConfetti = confetti.create(canvas, { resize: true });
    const duration = 3000;
    const end = Date.now() + duration;
    let raf = 0;
    let cleaned = false;

    const frame = () => {
      if (cleaned) return;
      myConfetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
      });
      myConfetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
      });

      if (Date.now() < end) {
        raf = requestAnimationFrame(frame);
      } else {
        setTimeout(() => {
          if (!cleaned) {
            myConfetti.reset();
            canvas.remove();
            cleaned = true;
          }
        }, 2000);
      }
    };

    frame();

    return () => {
      if (!cleaned) {
        cleaned = true;
        cancelAnimationFrame(raf);
        myConfetti.reset();
        canvas.remove();
      }
    };
  },

  playSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(ctx.destination);

      // Ascending fanfare notes
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const noteDuration = 0.12;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const start = now + i * noteDuration;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.4, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, start + noteDuration);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + noteDuration + 0.05);
      });

      // Sparkle / shimmer
      const shimmerStart = now + notes.length * noteDuration;
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1800 + Math.random() * 2000;
        const t = shimmerStart + i * 0.06;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
      }

      // Final chord
      const chordStart = shimmerStart + 0.1;
      [523.25, 659.25, 783.99].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, chordStart);
        gain.gain.linearRampToValueAtTime(0.2, chordStart + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 0.8);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(chordStart);
        osc.stop(chordStart + 0.9);
      });
    } catch {
      // Sound is nice-to-have, not critical.
    }
  },
};

// ---------------------------------------------------------------------------
// Preset: Fireworks
// ---------------------------------------------------------------------------

const fireworksPreset: Preset = {
  id: 'fireworks',
  label: 'Fireworks',
  icon: 'mdi:firework',

  run(canvas) {
    const myConfetti = confetti.create(canvas, { resize: true });
    const duration = 5000;
    const end = Date.now() + duration;
    let interval: ReturnType<typeof setInterval> | null = null;
    let cleaned = false;

    interval = setInterval(() => {
      if (cleaned) return;
      if (Date.now() > end) {
        if (interval) clearInterval(interval);
        setTimeout(() => {
          if (!cleaned) {
            myConfetti.reset();
            canvas.remove();
            cleaned = true;
          }
        }, 2000);
        return;
      }

      myConfetti({
        particleCount: Math.floor(Math.random() * 80) + 40,
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: {
          x: Math.random(),
          y: Math.random() * 0.4,
        },
        colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff88', '#00aaff', '#ff00ff'],
        shapes: ['circle'],
      });
    }, 250);

    return () => {
      if (!cleaned) {
        cleaned = true;
        if (interval) clearInterval(interval);
        myConfetti.reset();
        canvas.remove();
      }
    };
  },

  playSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.25;
      masterGain.connect(ctx.destination);

      // Multiple boom + crackle bursts
      for (let burst = 0; burst < 4; burst++) {
        const t = now + burst * 0.8;

        // Low boom (noise burst via oscillator)
        const boom = ctx.createOscillator();
        const boomGain = ctx.createGain();
        boom.type = 'sawtooth';
        boom.frequency.setValueAtTime(150, t);
        boom.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        boomGain.gain.setValueAtTime(0.5, t);
        boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        boom.connect(boomGain);
        boomGain.connect(masterGain);
        boom.start(t);
        boom.stop(t + 0.5);

        // High crackle (random-ish high oscillators)
        for (let i = 0; i < 5; i++) {
          const crack = ctx.createOscillator();
          const crackGain = ctx.createGain();
          crack.type = 'square';
          crack.frequency.value = 2000 + Math.random() * 3000;
          const ct = t + 0.1 + i * 0.04;
          crackGain.gain.setValueAtTime(0, ct);
          crackGain.gain.linearRampToValueAtTime(0.1, ct + 0.005);
          crackGain.gain.exponentialRampToValueAtTime(0.001, ct + 0.08);
          crack.connect(crackGain);
          crackGain.connect(masterGain);
          crack.start(ct);
          crack.stop(ct + 0.1);
        }
      }
    } catch {
      // Sound is nice-to-have.
    }
  },
};

// ---------------------------------------------------------------------------
// Preset: Snow
// ---------------------------------------------------------------------------

const snowPreset: Preset = {
  id: 'snow',
  label: 'Snow',
  icon: 'mdi:snowflake',

  run(canvas) {
    const myConfetti = confetti.create(canvas, { resize: true });
    const duration = 15000;
    const end = Date.now() + duration;
    let raf = 0;
    let cleaned = false;

    const frame = () => {
      if (cleaned) return;

      if (Date.now() < end) {
        myConfetti({
          particleCount: 1,
          startVelocity: 0,
          ticks: 600,
          gravity: 0.7,
          drift: Math.random() * 2 - 1,
          origin: {
            x: Math.random(),
            y: -0.05,
          },
          colors: ['#ffffff', '#e8e8f0', '#d0d0e8'],
          shapes: ['circle'],
          scalar: 0.8 + Math.random() * 0.4,
        });
        raf = requestAnimationFrame(frame);
      } else {
        setTimeout(() => {
          if (!cleaned) {
            myConfetti.reset();
            canvas.remove();
            cleaned = true;
          }
        }, 3000);
      }
    };

    frame();

    return () => {
      if (!cleaned) {
        cleaned = true;
        cancelAnimationFrame(raf);
        myConfetti.reset();
        canvas.remove();
      }
    };
  },

  playSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.15;
      masterGain.connect(ctx.destination);

      // Gentle wind-chime tones: pentatonic scale, soft and airy
      const chimeNotes = [1047, 1175, 1319, 1568, 1760, 2093]; // C6-C7 pentatonic-ish
      for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
        const t = now + i * 0.25 + Math.random() * 0.1;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.7);
      }

      // Soft sustained wind (low filtered noise via detuned oscillators)
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 250 + Math.random() * 100;
        osc.detune.value = Math.random() * 40 - 20;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.5);
        gain.gain.linearRampToValueAtTime(0.04, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 2.6);
      }
    } catch {
      // Sound is nice-to-have.
    }
  },
};

// ---------------------------------------------------------------------------
// Preset: Stars
// ---------------------------------------------------------------------------

const starsPreset: Preset = {
  id: 'stars',
  label: 'Stars',
  icon: 'mdi:star-four-points',

  run(canvas) {
    const myConfetti = confetti.create(canvas, { resize: true });
    let cleaned = false;

    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 20,
      shapes: ['star' as const],
      colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
    };

    // Three staggered bursts
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const shoot = (delay: number) => {
      const t = setTimeout(() => {
        if (cleaned) return;
        myConfetti({
          ...defaults,
          particleCount: 50,
          scalar: 1.2,
          shapes: ['star'],
          origin: { x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.3 },
        });
        myConfetti({
          ...defaults,
          particleCount: 25,
          scalar: 0.75,
          shapes: ['circle'],
          origin: { x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.3 },
        });
      }, delay);
      timeouts.push(t);
    };

    shoot(0);
    shoot(200);
    shoot(400);

    // Cleanup after particles settle
    const cleanupTimeout = setTimeout(() => {
      if (!cleaned) {
        myConfetti.reset();
        canvas.remove();
        cleaned = true;
      }
    }, 3000);
    timeouts.push(cleanupTimeout);

    return () => {
      if (!cleaned) {
        cleaned = true;
        timeouts.forEach(clearTimeout);
        myConfetti.reset();
        canvas.remove();
      }
    };
  },

  playSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.2;
      masterGain.connect(ctx.destination);

      // Magical sparkle: ascending arpeggio with shimmering harmonics
      const sparkleNotes = [880, 1109, 1319, 1760, 2093, 2637]; // A5 up
      sparkleNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = now + i * 0.08;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.45);
      });

      // Sustained shimmer pad
      const shimmerStart = now + 0.2;
      [1319, 1568, 2093].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, shimmerStart);
        gain.gain.linearRampToValueAtTime(0.08, shimmerStart + 0.1);
        gain.gain.linearRampToValueAtTime(0.08, shimmerStart + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, shimmerStart + 1.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(shimmerStart);
        osc.stop(shimmerStart + 1.3);
      });

      // Tiny high sparkle pings
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 3000 + Math.random() * 2000;
        const t = now + 0.4 + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
      }
    } catch {
      // Sound is nice-to-have.
    }
  },
};

// ---------------------------------------------------------------------------
// Preset: Hearts
// ---------------------------------------------------------------------------

const heartShape = confetti.shapeFromPath({
  path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
});

const heartsPreset: Preset = {
  id: 'hearts',
  label: 'Hearts',
  icon: 'mdi:heart',

  run(canvas) {
    const myConfetti = confetti.create(canvas, { resize: true });
    let cleaned = false;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Three staggered bursts from center top
    const shoot = (delay: number) => {
      const t = setTimeout(() => {
        if (cleaned) return;
        myConfetti({
          particleCount: 80,
          spread: 160,
          startVelocity: -40,
          ticks: 200,
          gravity: 0.8,
          origin: { y: -0.1 },
          shapes: [heartShape],
          scalar: 2,
          colors: ['#ff0044', '#ff2266', '#ff6699', '#cc0033', '#ff3377', '#e60040'],
        });
      }, delay);
      timeouts.push(t);
    };

    shoot(0);
    shoot(100);
    shoot(200);

    const cleanupTimeout = setTimeout(() => {
      if (!cleaned) {
        myConfetti.reset();
        canvas.remove();
        cleaned = true;
      }
    }, 4000);
    timeouts.push(cleanupTimeout);

    return () => {
      if (!cleaned) {
        cleaned = true;
        timeouts.forEach(clearTimeout);
        myConfetti.reset();
        canvas.remove();
      }
    };
  },

  playSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.2;
      masterGain.connect(ctx.destination);

      // Warm ascending notes — soft and sweet
      const notes = [392, 440, 523.25, 659.25, 783.99]; // G4, A4, C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = now + i * 0.1;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.4);
      });

      // Soft sustained chord
      const chordStart = now + 0.3;
      [523.25, 659.25, 783.99].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, chordStart);
        gain.gain.linearRampToValueAtTime(0.1, chordStart + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.0);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(chordStart);
        osc.stop(chordStart + 1.1);
      });
    } catch {
      // Sound is nice-to-have.
    }
  },
};

// ---------------------------------------------------------------------------
// Preset: Rockets  (emoji rockets blasting off!)
// ---------------------------------------------------------------------------

const rocketShape = confetti.shapeFromText({ text: '🚀', scalar: 2 });
const starBurstShape = confetti.shapeFromText({ text: '⭐', scalar: 1.5 });
const sparkleShape = confetti.shapeFromText({ text: '✨', scalar: 1.5 });

const rocketsPreset: Preset = {
  id: 'rockets',
  label: 'Rockets',
  icon: 'mdi:rocket-launch',

  run(canvas) {
    const myConfetti = confetti.create(canvas, { resize: true });
    const duration = 4000;
    const end = Date.now() + duration;
    let raf = 0;
    let cleaned = false;
    let frameCount = 0;

    const frame = () => {
      if (cleaned) return;
      frameCount++;

      // Launch rockets from the bottom at varying positions
      if (frameCount % 3 === 0) {
        const xPos = 0.1 + Math.random() * 0.8;
        myConfetti({
          particleCount: 1,
          startVelocity: 50 + Math.random() * 20,
          spread: 15,
          angle: 80 + Math.random() * 20,
          gravity: 1.2,
          ticks: 120,
          origin: { x: xPos, y: 1 },
          shapes: [rocketShape],
          scalar: 2,
          flat: true,
        });
      }

      // Exhaust trail sparkles
      if (frameCount % 2 === 0) {
        myConfetti({
          particleCount: 3,
          startVelocity: 5,
          spread: 360,
          ticks: 40,
          gravity: 0.5,
          origin: { x: Math.random(), y: 0.5 + Math.random() * 0.4 },
          shapes: [sparkleShape, starBurstShape],
          scalar: 1.2,
          flat: true,
        });
      }

      // Explosion bursts at the top
      if (frameCount % 20 === 0) {
        const burstX = 0.2 + Math.random() * 0.6;
        myConfetti({
          particleCount: 25,
          startVelocity: 15,
          spread: 360,
          ticks: 80,
          gravity: 0.4,
          origin: { x: burstX, y: 0.1 + Math.random() * 0.3 },
          shapes: [starBurstShape, sparkleShape],
          scalar: 1.5,
          flat: true,
        });
      }

      if (Date.now() < end) {
        raf = requestAnimationFrame(frame);
      } else {
        setTimeout(() => {
          if (!cleaned) {
            myConfetti.reset();
            canvas.remove();
            cleaned = true;
          }
        }, 2500);
      }
    };

    frame();

    return () => {
      if (!cleaned) {
        cleaned = true;
        cancelAnimationFrame(raf);
        myConfetti.reset();
        canvas.remove();
      }
    };
  },

  playSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.25;
      masterGain.connect(ctx.destination);

      // Rocket whoosh (rising frequency sweep)
      for (let r = 0; r < 3; r++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const t = now + r * 0.6;
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.4);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.6);
      }

      // Explosion pops at the top
      for (let i = 0; i < 3; i++) {
        const t = now + 0.4 + i * 0.6;

        // Pop burst
        const pop = ctx.createOscillator();
        const popGain = ctx.createGain();
        pop.type = 'square';
        pop.frequency.setValueAtTime(600, t);
        pop.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        popGain.gain.setValueAtTime(0.3, t);
        popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        pop.connect(popGain);
        popGain.connect(masterGain);
        pop.start(t);
        pop.stop(t + 0.25);

        // High sparkle scatter
        for (let j = 0; j < 4; j++) {
          const spark = ctx.createOscillator();
          const sparkGain = ctx.createGain();
          spark.type = 'sine';
          spark.frequency.value = 2000 + Math.random() * 3000;
          const st = t + 0.05 + j * 0.03;
          sparkGain.gain.setValueAtTime(0, st);
          sparkGain.gain.linearRampToValueAtTime(0.12, st + 0.01);
          sparkGain.gain.exponentialRampToValueAtTime(0.001, st + 0.12);
          spark.connect(sparkGain);
          sparkGain.connect(masterGain);
          spark.start(st);
          spark.stop(st + 0.15);
        }
      }
    } catch {
      // Sound is nice-to-have.
    }
  },
};

// ---------------------------------------------------------------------------
// Preset: Rainbow  (colorful arcs cascading across the screen)
// ---------------------------------------------------------------------------

const rainbowPreset: Preset = {
  id: 'rainbow',
  label: 'Rainbow',
  icon: 'mdi:rainbow',

  run(canvas) {
    const myConfetti = confetti.create(canvas, { resize: true });
    let cleaned = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const rainbowColors = [
      '#FF0000', // Red
      '#FF8800', // Orange
      '#FFFF00', // Yellow
      '#00CC00', // Green
      '#0088FF', // Blue
      '#4400CC', // Indigo
      '#8800FF', // Violet
    ];

    // Create sweeping arcs — each color launches from the left at staggered times
    rainbowColors.forEach((color, i) => {
      const t = setTimeout(() => {
        if (cleaned) return;

        // Arc from left to center
        myConfetti({
          particleCount: 40,
          angle: 45 + i * 3,
          spread: 20,
          startVelocity: 55,
          ticks: 200,
          gravity: 1.2,
          origin: { x: -0.05, y: 0.8 - i * 0.03 },
          colors: [color],
          shapes: ['circle'],
          scalar: 1.0,
        });

        // Mirror arc from right to center
        myConfetti({
          particleCount: 40,
          angle: 135 - i * 3,
          spread: 20,
          startVelocity: 55,
          ticks: 200,
          gravity: 1.2,
          origin: { x: 1.05, y: 0.8 - i * 0.03 },
          colors: [color],
          shapes: ['circle'],
          scalar: 1.0,
        });
      }, i * 150);
      timeouts.push(t);
    });

    // After the arcs, burst a big rainbow explosion in the center
    const burstTimeout = setTimeout(
      () => {
        if (cleaned) return;
        for (let wave = 0; wave < 3; wave++) {
          const wt = setTimeout(() => {
            if (cleaned) return;
            myConfetti({
              particleCount: 100,
              spread: 360,
              startVelocity: 20 + wave * 8,
              ticks: 120,
              gravity: 0.6,
              origin: { x: 0.5, y: 0.4 },
              colors: rainbowColors,
              shapes: ['circle', 'square'],
              scalar: 1.0 + wave * 0.2,
            });
          }, wave * 200);
          timeouts.push(wt);
        }
      },
      rainbowColors.length * 150 + 200,
    );
    timeouts.push(burstTimeout);

    // Cleanup
    const cleanupTimeout = setTimeout(() => {
      if (!cleaned) {
        myConfetti.reset();
        canvas.remove();
        cleaned = true;
      }
    }, 5000);
    timeouts.push(cleanupTimeout);

    return () => {
      if (!cleaned) {
        cleaned = true;
        timeouts.forEach(clearTimeout);
        myConfetti.reset();
        canvas.remove();
      }
    };
  },

  playSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.2;
      masterGain.connect(ctx.destination);

      // Ascending major scale — bright and happy like a rainbow
      const scaleNotes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77]; // C5 major scale
      scaleNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const t = now + i * 0.1;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.05, t + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.55);
      });

      // Bright shimmering chord at the peak
      const chordStart = now + scaleNotes.length * 0.1;
      [1046.5, 1318.5, 1568].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, chordStart);
        gain.gain.linearRampToValueAtTime(0.15, chordStart + 0.05);
        gain.gain.linearRampToValueAtTime(0.12, chordStart + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(chordStart);
        osc.stop(chordStart + 1.3);
      });

      // Little twinkling pings
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1500 + Math.random() * 2500;
        const t = chordStart + 0.1 + i * 0.08;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.25);
      }
    } catch {
      // Sound is nice-to-have.
    }
  },
};

// ---------------------------------------------------------------------------
// Preset: Dinosaurs  (dino emoji stomp with big playful bursts)
// ---------------------------------------------------------------------------

const dinoShape = confetti.shapeFromText({ text: '🦖', scalar: 2 });
const volcanoShape = confetti.shapeFromText({ text: '🌋', scalar: 1.5 });

const dinosaursPreset: Preset = {
  id: 'dinosaurs',
  label: 'Dinosaurs',
  icon: 'mdi:dinosaur',

  run(canvas) {
    const myConfetti = confetti.create(canvas, { resize: true });
    let cleaned = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Dino stomp pattern: big dinos crash across the screen with explosive bursts
    const stompPositions = [0.15, 0.4, 0.65, 0.85];

    stompPositions.forEach((xPos, i) => {
      const t = setTimeout(() => {
        if (cleaned) return;

        // Big dino burst
        myConfetti({
          particleCount: 6,
          startVelocity: 25,
          spread: 70,
          angle: 90,
          ticks: 150,
          gravity: 0.8,
          origin: { x: xPos, y: 0.6 },
          shapes: [dinoShape],
          scalar: 2,
          flat: true,
        });

        // Ground impact — debris flying up
        myConfetti({
          particleCount: 40,
          startVelocity: 30,
          spread: 120,
          angle: 270,
          ticks: 80,
          gravity: 1.5,
          origin: { x: xPos, y: 0.65 },
          colors: ['#8B4513', '#A0522D', '#D2691E', '#CD853F', '#DEB887', '#228B22'],
          shapes: ['circle', 'square'],
          scalar: 0.8,
        });
      }, i * 500);
      timeouts.push(t);
    });

    // Grand finale: volcano eruption in the center
    const volcanoTimeout = setTimeout(
      () => {
        if (cleaned) return;

        // Lava burst
        myConfetti({
          particleCount: 80,
          startVelocity: 45,
          spread: 60,
          angle: 90,
          ticks: 150,
          gravity: 1.0,
          origin: { x: 0.5, y: 0.8 },
          colors: ['#FF4500', '#FF6347', '#FF0000', '#FFD700', '#FFA500'],
          shapes: ['circle'],
          scalar: 1.2,
        });

        // Flying dinos escaping
        myConfetti({
          particleCount: 8,
          startVelocity: 35,
          spread: 180,
          ticks: 200,
          gravity: 0.5,
          origin: { x: 0.5, y: 0.5 },
          shapes: [dinoShape, volcanoShape],
          scalar: 2,
          flat: true,
        });
      },
      stompPositions.length * 500 + 300,
    );
    timeouts.push(volcanoTimeout);

    // Cleanup
    const cleanupTimeout = setTimeout(() => {
      if (!cleaned) {
        myConfetti.reset();
        canvas.remove();
        cleaned = true;
      }
    }, 5500);
    timeouts.push(cleanupTimeout);

    return () => {
      if (!cleaned) {
        cleaned = true;
        timeouts.forEach(clearTimeout);
        myConfetti.reset();
        canvas.remove();
      }
    };
  },

  playSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(ctx.destination);

      // Heavy stomp sounds — low thuds
      for (let i = 0; i < 4; i++) {
        const t = now + i * 0.5;

        // Deep thud
        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(80, t);
        thud.frequency.exponentialRampToValueAtTime(30, t + 0.2);
        thudGain.gain.setValueAtTime(0.5, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        thud.connect(thudGain);
        thudGain.connect(masterGain);
        thud.start(t);
        thud.stop(t + 0.35);

        // Ground rumble
        const rumble = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumble.type = 'sawtooth';
        rumble.frequency.value = 40 + Math.random() * 20;
        rumbleGain.gain.setValueAtTime(0.15, t + 0.05);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        rumble.connect(rumbleGain);
        rumbleGain.connect(masterGain);
        rumble.start(t + 0.05);
        rumble.stop(t + 0.3);
      }

      // Dino roar: frequency sweep up then down
      const roarStart = now + 2.2;
      const roar = ctx.createOscillator();
      const roarGain = ctx.createGain();
      roar.type = 'sawtooth';
      roar.frequency.setValueAtTime(80, roarStart);
      roar.frequency.linearRampToValueAtTime(250, roarStart + 0.3);
      roar.frequency.linearRampToValueAtTime(60, roarStart + 0.8);
      roarGain.gain.setValueAtTime(0, roarStart);
      roarGain.gain.linearRampToValueAtTime(0.35, roarStart + 0.1);
      roarGain.gain.linearRampToValueAtTime(0.3, roarStart + 0.4);
      roarGain.gain.exponentialRampToValueAtTime(0.001, roarStart + 0.9);
      roar.connect(roarGain);
      roarGain.connect(masterGain);
      roar.start(roarStart);
      roar.stop(roarStart + 1.0);

      // Volcano rumble at the end
      const volcStart = now + 2.5;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 50 + Math.random() * 40;
        osc.detune.value = Math.random() * 50 - 25;
        gain.gain.setValueAtTime(0, volcStart);
        gain.gain.linearRampToValueAtTime(0.15, volcStart + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, volcStart + 0.8);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(volcStart);
        osc.stop(volcStart + 0.9);
      }
    } catch {
      // Sound is nice-to-have.
    }
  },
};

// ---------------------------------------------------------------------------
// Preset: Unicorn  (magical sparkly pastel particles with unicorn emoji)
// ---------------------------------------------------------------------------

const unicornShape = confetti.shapeFromText({ text: '🦄', scalar: 2 });
const rainbowStarShape = confetti.shapeFromText({ text: '🌈', scalar: 1.5 });
const magicShape = confetti.shapeFromText({ text: '💫', scalar: 1.5 });

const unicornPreset: Preset = {
  id: 'unicorn',
  label: 'Unicorn',
  icon: 'mdi:unicorn-variant',

  run(canvas) {
    const myConfetti = confetti.create(canvas, { resize: true });
    const duration = 4000;
    const end = Date.now() + duration;
    let raf = 0;
    let cleaned = false;
    let frameCount = 0;

    const pastelColors = ['#FFB3D9', '#D9B3FF', '#B3D9FF', '#B3FFD9', '#FFFFB3', '#FFD9B3'];

    const frame = () => {
      if (cleaned) return;
      frameCount++;

      // Continuous sparkly pastel confetti from both sides
      if (frameCount % 2 === 0) {
        myConfetti({
          particleCount: 2,
          angle: 60,
          spread: 40,
          startVelocity: 35,
          ticks: 150,
          gravity: 0.6,
          origin: { x: 0, y: 0.5 },
          colors: pastelColors,
          shapes: ['star', 'circle'],
          scalar: 0.9 + Math.random() * 0.4,
        });
        myConfetti({
          particleCount: 2,
          angle: 120,
          spread: 40,
          startVelocity: 35,
          ticks: 150,
          gravity: 0.6,
          origin: { x: 1, y: 0.5 },
          colors: pastelColors,
          shapes: ['star', 'circle'],
          scalar: 0.9 + Math.random() * 0.4,
        });
      }

      // Periodic unicorn emoji bursts
      if (frameCount % 40 === 0) {
        const burstX = 0.2 + Math.random() * 0.6;
        myConfetti({
          particleCount: 4,
          startVelocity: 20,
          spread: 180,
          ticks: 120,
          gravity: 0.5,
          origin: { x: burstX, y: 0.3 + Math.random() * 0.3 },
          shapes: [unicornShape, rainbowStarShape, magicShape],
          scalar: 2,
          flat: true,
        });
      }

      // Magical sparkle dust trail
      if (frameCount % 5 === 0) {
        myConfetti({
          particleCount: 1,
          startVelocity: 0,
          ticks: 100,
          gravity: 0.3,
          drift: Math.random() * 2 - 1,
          origin: { x: Math.random(), y: Math.random() * 0.6 },
          shapes: [magicShape],
          scalar: 1.2,
          flat: true,
        });
      }

      if (Date.now() < end) {
        raf = requestAnimationFrame(frame);
      } else {
        // Grand finale: big unicorn burst
        myConfetti({
          particleCount: 15,
          startVelocity: 25,
          spread: 360,
          ticks: 150,
          gravity: 0.3,
          origin: { x: 0.5, y: 0.4 },
          shapes: [unicornShape, rainbowStarShape, magicShape],
          scalar: 2.5,
          flat: true,
        });
        myConfetti({
          particleCount: 80,
          startVelocity: 30,
          spread: 360,
          ticks: 150,
          gravity: 0.5,
          origin: { x: 0.5, y: 0.4 },
          colors: pastelColors,
          shapes: ['star', 'circle'],
          scalar: 1.2,
        });

        setTimeout(() => {
          if (!cleaned) {
            myConfetti.reset();
            canvas.remove();
            cleaned = true;
          }
        }, 3000);
      }
    };

    frame();

    return () => {
      if (!cleaned) {
        cleaned = true;
        cancelAnimationFrame(raf);
        myConfetti.reset();
        canvas.remove();
      }
    };
  },

  playSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.2;
      masterGain.connect(ctx.destination);

      // Magical harp glissando — dreamy ascending notes
      const harpNotes = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.5, 1568];
      harpNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = now + i * 0.07;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.55);
      });

      // Dreamy sustained pad — major 7th chord
      const padStart = now + 0.3;
      [523.25, 659.25, 783.99, 987.77].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = Math.random() * 10 - 5; // slight detuning for warmth
        gain.gain.setValueAtTime(0, padStart);
        gain.gain.linearRampToValueAtTime(0.06, padStart + 0.15);
        gain.gain.linearRampToValueAtTime(0.06, padStart + 1.0);
        gain.gain.exponentialRampToValueAtTime(0.001, padStart + 1.8);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(padStart);
        osc.stop(padStart + 1.9);
      });

      // High sparkle pings — fairy dust
      for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 2500 + Math.random() * 3000;
        const t = now + 0.5 + i * 0.1;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
      }
    } catch {
      // Sound is nice-to-have.
    }
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** All available presets, in display order. */
export const presetRegistry: readonly Preset[] = [
  confettiPreset,
  fireworksPreset,
  snowPreset,
  starsPreset,
  heartsPreset,
  rocketsPreset,
  rainbowPreset,
  dinosaursPreset,
  unicornPreset,
];

/** Look up a preset by ID. */
export function getPreset(id: string): Preset | undefined {
  return presetRegistry.find((p) => p.id === id);
}

/**
 * Pick a random preset from the given list of enabled IDs.
 * Falls back to the confetti preset if none match.
 */
export function pickRandomPreset(enabledIds: string[]): Preset {
  const available = presetRegistry.filter((p) => enabledIds.includes(p.id));
  if (available.length === 0) {
    return confettiPreset;
  }
  return available[Math.floor(Math.random() * available.length)];
}
