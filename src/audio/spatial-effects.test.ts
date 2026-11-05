import { describe, expect, it } from 'vitest'
import { DEFAULT_SOUND_EFFECTS } from './types'
import { createRoomImpulseData, createTapeCurve, normalizeSoundEffects } from './spatial-effects'

describe('sanfte Raum- und Tape-Effekte', () => {
  it('begrenzt alle Effektwerte und nutzt sichere Vorgaben', () => {
    expect(normalizeSoundEffects({ room: 4, tape: -2 })).toEqual({ room: 1, tape: 0 })
    expect(normalizeSoundEffects({ room: Number.NaN, tape: Number.POSITIVE_INFINITY }))
      .toEqual(DEFAULT_SOUND_EFFECTS)
  })

  it('erzeugt eine symmetrische, endliche Tape-Kennlinie ohne Pegelsprung', () => {
    const curve = createTapeCurve(0.25, 257)
    expect(curve).toHaveLength(257)
    expect(curve[0]).toBeCloseTo(-1)
    expect(curve[128]).toBeCloseTo(0)
    expect(curve[256]).toBeCloseTo(1)
    expect(Array.from(curve).every(Number.isFinite)).toBe(true)
  })

  it('erzeugt einen kurzen diffusen Stereo-Raum mit stiller Vorlaufzeit', () => {
    const [left, right] = createRoomImpulseData(8_000, 0.5)
    expect(left).toHaveLength(4_000)
    expect(right).toHaveLength(4_000)
    expect(left.slice(0, 100).every((sample) => sample === 0)).toBe(true)
    expect(left.some((sample) => sample !== 0)).toBe(true)
    expect(right).not.toEqual(left)
    const energy = left.reduce((sum, sample) => sum + sample * sample, 0)
    expect(Math.sqrt(energy)).toBeCloseTo(0.48, 4)
  })
})
