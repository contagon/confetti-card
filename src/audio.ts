/** Keep YAML values and the editor's volume slider within the supported range. */
export function normalizeSoundVolume(volume?: number): number {
  return typeof volume === 'number' && Number.isFinite(volume) ? Math.min(5, Math.max(0, volume)) : 0;
}
