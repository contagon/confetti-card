/**
 * Synthesize and play a short celebration sound using the Web Audio API.
 * No external audio files needed — everything is generated in the browser.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Play a short, cheerful celebration sound (party horn / fanfare style).
 * Uses oscillators and gain envelopes to create a bright, ascending tone
 * followed by a quick shimmer.
 */
export function playCelebrationSound(): void {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browsers require user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);

    // --- Ascending fanfare notes ---
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

    // --- Sparkle / shimmer effect ---
    const shimmerStart = now + notes.length * noteDuration;
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Random high-frequency sparkle notes
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

    // --- Final chord ---
    const chordStart = shimmerStart + 0.1;
    const chordFreqs = [523.25, 659.25, 783.99]; // C5 major chord
    chordFreqs.forEach((freq) => {
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
    // Silently fail — sound is a nice-to-have, not critical.
  }
}
