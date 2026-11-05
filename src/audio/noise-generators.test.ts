import { describe, expect, it } from 'vitest'
import { BrownNoiseGenerator, PinkNoiseGenerator, WhiteNoiseGenerator } from './noise-generators'

const seededRandom = (seed = 123456) => {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

const collect = (generator: { next: () => number }, count = 4096) =>
  Array.from({ length: count }, () => generator.next())

describe('lokale Rauschgeneratoren', () => {
  it.each([
    ['brown', (random: () => number) => new BrownNoiseGenerator(random)],
    ['pink', (random: () => number) => new PinkNoiseGenerator(random)],
    ['white', (random: () => number) => new WhiteNoiseGenerator(random)],
  ])('erzeugt für %s endliche, begrenzte und nicht-stumme Samples', (_name, createGenerator) => {
    const samples = collect(createGenerator(seededRandom()))

    expect(samples.every(Number.isFinite)).toBe(true)
    expect(Math.max(...samples)).toBeLessThanOrEqual(1)
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-1)
    expect(samples.some((sample) => Math.abs(sample) > 0.001)).toBe(true)
  })

  it('liefert bei gleicher Zufallsfolge reproduzierbare Werte', () => {
    const first = collect(new PinkNoiseGenerator(seededRandom(42)), 32)
    const second = collect(new PinkNoiseGenerator(seededRandom(42)), 32)

    expect(first).toEqual(second)
  })

  it('setzt den Zustand eines Generators vollständig zurück', () => {
    const values = [0.2, 0.8, 0.35, 0.7]
    let index = 0
    const generator = new BrownNoiseGenerator(() => values[index++ % values.length])

    const first = collect(generator, values.length)
    generator.reset()
    index = 0

    expect(collect(generator, values.length)).toEqual(first)
  })

  it('ändert braunes Rauschen im Mittel sanfter als weißes Rauschen', () => {
    const random = seededRandom(12)
    const white = Array.from({ length: 4096 }, () => random() * 2 - 1)
    const brown = collect(new BrownNoiseGenerator(seededRandom(12)))
    const averageDelta = (samples: number[]) =>
      samples.slice(1).reduce((sum, sample, index) => sum + Math.abs(sample - samples[index]), 0) /
      (samples.length - 1)

    expect(averageDelta(brown)).toBeLessThan(averageDelta(white) * 0.3)
  })
})
