import { describe, expect, it } from 'vitest'
import { createSoundscapeGenerator } from './soundscape-generators'
import type { SoundscapeKind } from './types'

const soundscapes: readonly SoundscapeKind[] = [
  'sea', 'coast', 'cove', 'wind', 'rain', 'thunder', 'night', 'drone', 'space',
]

const seededRandom = (seed = 123456) => {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

const collect = (kind: SoundscapeKind, count = 48_000, seed = 42) => {
  const generator = createSoundscapeGenerator(kind, 48_000, seededRandom(seed))
  return Array.from({ length: count }, () => generator.next())
}

describe('lokal synthetisierte Klangwelten', () => {
  it.each(soundscapes)('erzeugt für %s ein begrenztes, endliches und nicht-stummes Signal', (kind) => {
    const samples = collect(kind)

    expect(samples.every(Number.isFinite)).toBe(true)
    expect(Math.max(...samples)).toBeLessThanOrEqual(1)
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-1)
    expect(samples.some((sample) => Math.abs(sample) > 0.01)).toBe(true)
  })

  it.each(soundscapes)('ist für %s bei gleicher Ausgangslage reproduzierbar', (kind) => {
    expect(collect(kind, 512, 7)).toEqual(collect(kind, 512, 7))
  })

  it.each(soundscapes)('vermeidet für %s harte Sprünge zwischen Samples', (kind) => {
    const samples = collect(kind, 8_192)
    const largestStep = samples.slice(1).reduce(
      (largest, sample, index) => Math.max(largest, Math.abs(sample - samples[index])),
      0,
    )

    expect(largestStep).toBeLessThan(0.2)
  })

  it.each(['lowpass', 'bandpass', 'highpass'] as const)(
    'formt den warmen Drone im %s-Modus ohne harte Sprünge',
    (filterMode) => {
      const generator = createSoundscapeGenerator('drone', 48_000, seededRandom(9), {
        filterMode,
        cutoff: 0.5,
        resonance: 0.32,
        lfoRate: 0.4,
        lfoDepth: 0.25,
      })
      const samples = Array.from({ length: 24_000 }, () => generator.next())
      const largestStep = samples.slice(1).reduce(
        (largest, sample, index) => Math.max(largest, Math.abs(sample - samples[index])),
        0,
      )
      expect(samples.every(Number.isFinite)).toBe(true)
      expect(samples.some((sample) => Math.abs(sample) > 0.001)).toBe(true)
      expect(largestStep).toBeLessThan(0.2)
    },
  )

  it('ändert Drone-Filter und LFO während der Ausgabe sicher', () => {
    const generator = createSoundscapeGenerator('drone', 48_000)
    Array.from({ length: 2_048 }, () => generator.next())
    generator.setDroneSettings?.({
      filterMode: 'highpass',
      cutoff: 0.75,
      resonance: 0.5,
      lfoRate: 0.6,
      lfoDepth: 0.4,
    })
    const samples = Array.from({ length: 8_192 }, () => generator.next())
    expect(samples.every(Number.isFinite)).toBe(true)
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1)
  })
})
