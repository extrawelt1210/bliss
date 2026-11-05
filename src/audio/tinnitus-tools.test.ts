import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TINNITUS_SETTINGS,
  MAX_TINNITUS_FREQUENCY,
  MIN_TINNITUS_FREQUENCY,
  notchQFromOctaves,
  normalizeTinnitusSettings,
  tinnitusFrequencyFromPosition,
  tinnitusPositionFromFrequency,
} from './tinnitus-tools'

describe('Frequenz- und Notch-Werkzeuge', () => {
  it('begrenzt Frequenz und Filterbreite auf den sicheren Bedienbereich', () => {
    expect(normalizeTinnitusSettings({ notchEnabled: true, frequency: 99_000, notchWidth: -2 })).toEqual({
      notchEnabled: true,
      frequency: MAX_TINNITUS_FREQUENCY,
      notchWidth: 0.5,
    })
    expect(normalizeTinnitusSettings({ notchEnabled: false, frequency: Number.NaN, notchWidth: Number.NaN }))
      .toEqual(DEFAULT_TINNITUS_SETTINGS)
  })

  it('bildet den logarithmischen Regler umkehrbar auf 250 bis 12.000 Hz ab', () => {
    expect(tinnitusFrequencyFromPosition(0)).toBe(MIN_TINNITUS_FREQUENCY)
    expect(tinnitusFrequencyFromPosition(1)).toBe(MAX_TINNITUS_FREQUENCY)
    const frequency = tinnitusFrequencyFromPosition(0.63)
    expect(tinnitusPositionFromFrequency(frequency)).toBeCloseTo(0.63, 3)
  })

  it('übersetzt eine Oktavbreite in einen endlichen Biquad-Q-Wert', () => {
    expect(notchQFromOctaves(0.5)).toBeGreaterThan(notchQFromOctaves(1))
    expect(notchQFromOctaves(1.5)).toBeGreaterThan(0)
  })
})
