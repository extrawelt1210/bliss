import { DEFAULT_DRONE_SETTINGS } from './types'
import type { DroneFilterMode, DroneSettings } from './types'

const DEFAULT_SAMPLE_RATE = 48_000

const clampUnit = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback

const isFilterMode = (value: unknown): value is DroneFilterMode =>
  value === 'lowpass' || value === 'bandpass' || value === 'highpass'

export const normalizeDroneSettings = (settings: unknown): DroneSettings => {
  const value = typeof settings === 'object' && settings !== null
    ? settings as Partial<DroneSettings>
    : {}
  return {
    filterMode: isFilterMode(value.filterMode) ? value.filterMode : DEFAULT_DRONE_SETTINGS.filterMode,
    cutoff: clampUnit(value.cutoff, DEFAULT_DRONE_SETTINGS.cutoff),
    resonance: clampUnit(value.resonance, DEFAULT_DRONE_SETTINGS.resonance),
    lfoRate: clampUnit(value.lfoRate, DEFAULT_DRONE_SETTINGS.lfoRate),
    lfoDepth: clampUnit(value.lfoDepth, DEFAULT_DRONE_SETTINGS.lfoDepth),
  }
}

/** Logarithmic musical ranges, deliberately capped below bright or piercing settings. */
export const droneCutoffHz = (cutoff: number): number =>
  80 * Math.pow(75, clampUnit(cutoff, DEFAULT_DRONE_SETTINGS.cutoff))

export const droneLfoRateHz = (rate: number): number =>
  0.025 * Math.pow(14, clampUnit(rate, DEFAULT_DRONE_SETTINGS.lfoRate))

/**
 * Stable topology-preserving state-variable filter. All three responses share
 * one state, so changing mode remains smooth and does not introduce a new node.
 */
export class DroneMultimodeFilter {
  private readonly sampleRate: number
  private integratorOne = 0
  private integratorTwo = 0

  constructor(sampleRate: number) {
    this.sampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : DEFAULT_SAMPLE_RATE
  }

  next(input: number, cutoffHz: number, resonance: number, mode: DroneFilterMode): number {
    const safeCutoff = Math.max(40, Math.min(this.sampleRate * 0.2, cutoffHz))
    const normalizedResonance = clampUnit(resonance, DEFAULT_DRONE_SETTINGS.resonance)
    const q = 0.55 + normalizedResonance * 2.1
    const damping = 1 / q
    const g = Math.tan(Math.PI * safeCutoff / this.sampleRate)
    const a1 = 1 / (1 + g * (g + damping))
    const a2 = g * a1
    const a3 = g * a2
    const delta = input - this.integratorTwo
    const band = a1 * this.integratorOne + a2 * delta
    const low = this.integratorTwo + a2 * this.integratorOne + a3 * delta
    const high = input - damping * band - low

    this.integratorOne = 2 * band - this.integratorOne
    this.integratorTwo = 2 * low - this.integratorTwo

    if (mode === 'highpass') return high
    if (mode === 'bandpass') return band
    return low
  }

  reset(): void {
    this.integratorOne = 0
    this.integratorTwo = 0
  }
}
