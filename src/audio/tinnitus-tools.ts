import type { TinnitusSettings } from './types'

export const MIN_TINNITUS_FREQUENCY = 250
export const MAX_TINNITUS_FREQUENCY = 12_000
export const DEFAULT_TINNITUS_SETTINGS: Readonly<TinnitusSettings> = {
  notchEnabled: false,
  frequency: 6_000,
  notchWidth: 1,
}

const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback

export function normalizeTinnitusSettings(settings: TinnitusSettings): TinnitusSettings {
  return {
    notchEnabled: Boolean(settings.notchEnabled),
    frequency: Math.round(clamp(
      settings.frequency,
      MIN_TINNITUS_FREQUENCY,
      MAX_TINNITUS_FREQUENCY,
      DEFAULT_TINNITUS_SETTINGS.frequency,
    )),
    notchWidth: clamp(settings.notchWidth, 0.5, 1.5, DEFAULT_TINNITUS_SETTINGS.notchWidth),
  }
}

export function tinnitusFrequencyFromPosition(position: number): number {
  const normalized = clamp(position, 0, 1, 0.5)
  return Math.round(MIN_TINNITUS_FREQUENCY *
    Math.pow(MAX_TINNITUS_FREQUENCY / MIN_TINNITUS_FREQUENCY, normalized))
}

export function tinnitusPositionFromFrequency(frequency: number): number {
  const normalized = normalizeTinnitusSettings({
    ...DEFAULT_TINNITUS_SETTINGS,
    frequency,
  }).frequency
  return Math.log(normalized / MIN_TINNITUS_FREQUENCY) /
    Math.log(MAX_TINNITUS_FREQUENCY / MIN_TINNITUS_FREQUENCY)
}

export function notchQFromOctaves(octaves: number): number {
  const width = normalizeTinnitusSettings({
    ...DEFAULT_TINNITUS_SETTINGS,
    notchWidth: octaves,
  }).notchWidth
  const ratio = Math.pow(2, width)
  return Math.sqrt(ratio) / (ratio - 1)
}
