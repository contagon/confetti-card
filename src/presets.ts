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
// Registry
// ---------------------------------------------------------------------------

/** All available presets, in display order. */
export const presetRegistry: readonly Preset[] = [confettiPreset, fireworksPreset, snowPreset, starsPreset];

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
