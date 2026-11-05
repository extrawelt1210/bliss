import { describe, expect, it } from 'vitest'
import {
  DroneMultimodeFilter,
  droneCutoffHz,
  droneLfoRateHz,
  normalizeDroneSettings,
} from './drone-filter'
import { DEFAULT_DRONE_SETTINGS } from './types'

describe('Drone-Multimode-Filter', () => {
  it('begrenzt alle Steuerwerte und ersetzt ungültige Werte sicher', () => {
    expect(normalizeDroneSettings({
      filterMode: 'highpass',
      cutoff: 4,
      resonance: -1,
      lfoRate: Number.NaN,
      lfoDepth: 0.3,
    })).toEqual({
      filterMode: 'highpass',
      cutoff: 1,
      resonance: 0,
      lfoRate: DEFAULT_DRONE_SETTINGS.lfoRate,
      lfoDepth: 0.3,
    })
    expect(normalizeDroneSettings({ filterMode: 'notch' })).toEqual(DEFAULT_DRONE_SETTINGS)
  })

  it('verwendet musikalische, langsame und nicht aggressive Wertebereiche', () => {
    expect(droneCutoffHz(0)).toBe(80)
    expect(droneCutoffHz(1)).toBe(6_000)
    expect(droneLfoRateHz(0)).toBe(0.025)
    expect(droneLfoRateHz(1)).toBeCloseTo(0.35)
  })

  it.each(['lowpass', 'bandpass', 'highpass'] as const)(
    'liefert für %s ausschließlich endliche, begrenzte Samples',
    (mode) => {
      const filter = new DroneMultimodeFilter(48_000)
      const values = Array.from({ length: 24_000 }, (_, index) => {
        const input = Math.sin(index * Math.PI * 2 * 110 / 48_000) * 0.4
        return filter.next(input, 900, 0.7, mode)
      })
      expect(values.every(Number.isFinite)).toBe(true)
      expect(Math.max(...values.map(Math.abs))).toBeLessThan(1)
      expect(values.some((value) => Math.abs(value) > 0.001)).toBe(true)
    },
  )

  it('setzt seinen internen Zustand vollständig zurück', () => {
    const filter = new DroneMultimodeFilter(48_000)
    const render = () => Array.from({ length: 512 }, (_, index) =>
      filter.next(Math.sin(index * 0.05), 700, 0.2, 'lowpass'))
    const first = render()
    filter.reset()
    expect(render()).toEqual(first)
  })
})
