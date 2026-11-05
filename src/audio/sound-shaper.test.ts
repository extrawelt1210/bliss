import { describe, expect, it } from 'vitest'
import { normalizeSoundMacros, SoundShaper } from './sound-shaper'

describe('konservative Klang-Makros', () => {
  it('normalisiert ungültige Werte in den erlaubten Bereich', () => {
    expect(normalizeSoundMacros({ warmth: -3, softness: 2, airiness: Number.NaN, movement: 0.7 })).toEqual({
      warmth: 0,
      softness: 1,
      airiness: 0.5,
      movement: 0.7,
    })
  })

  it('erzeugt ein endliches, begrenztes und hörbares Signal', () => {
    const shaper = new SoundShaper(48_000, { warmth: 0.8, softness: 0.7, airiness: 0.3, movement: 0.4 })
    const samples = Array.from({ length: 8_192 }, (_, index) => shaper.next(Math.sin(index / 29) * 0.8))
    expect(samples.every(Number.isFinite)).toBe(true)
    expect(Math.max(...samples)).toBeLessThanOrEqual(1)
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-1)
    expect(samples.some((sample) => Math.abs(sample) > 0.1)).toBe(true)
  })

  it('ändert Makros während des Signals ohne harte Sprünge', () => {
    const shaper = new SoundShaper(48_000)
    const samples: number[] = []
    for (let index = 0; index < 2_048; index += 1) samples.push(shaper.next(Math.sin(index / 40) * 0.7))
    shaper.setMacros({ warmth: 1, softness: 1, airiness: 1, movement: 1 })
    for (let index = 2_048; index < 4_096; index += 1) samples.push(shaper.next(Math.sin(index / 40) * 0.7))
    const largestStep = samples.slice(1).reduce(
      (largest, sample, index) => Math.max(largest, Math.abs(sample - samples[index])),
      0,
    )
    expect(largestStep).toBeLessThan(0.08)
  })

  it('lässt sich für einen frischen Audiostart deterministisch zurücksetzen', () => {
    const shaper = new SoundShaper(48_000)
    const first = Array.from({ length: 256 }, (_, index) => shaper.next(Math.sin(index / 17)))
    shaper.reset()
    const second = Array.from({ length: 256 }, (_, index) => shaper.next(Math.sin(index / 17)))
    expect(second).toEqual(first)
  })
})
