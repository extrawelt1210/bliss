import { describe, expect, it } from 'vitest'
import {
  normalizeSessionPlan,
  sessionPhaseAt,
  sessionPhaseLabel,
  sessionTotalSeconds,
} from './session-plan'

describe('Sitzungsabläufe', () => {
  it('normalisiert freie Eingaben auf die sicheren Grenzen', () => {
    expect(normalizeSessionPlan({
      enabled: true,
      settleMinutes: -5,
      soundMinutes: 500,
      fadeMinutes: Number.NaN,
      silentEnd: false,
    })).toEqual({
      enabled: true,
      settleMinutes: 0,
      soundMinutes: 60,
      fadeMinutes: 0,
      silentEnd: false,
    })
  })

  it('berechnet Gesamtdauer und Phasen ohne Lücken', () => {
    const plan = { enabled: true, settleMinutes: 2, soundMinutes: 15, fadeMinutes: 3, silentEnd: true }
    expect(sessionTotalSeconds(plan)).toBe(1_200)
    expect(sessionPhaseAt(plan, 0)).toBe('settle')
    expect(sessionPhaseAt(plan, 119)).toBe('settle')
    expect(sessionPhaseAt(plan, 120)).toBe('sound')
    expect(sessionPhaseAt(plan, 1_019)).toBe('sound')
    expect(sessionPhaseAt(plan, 1_020)).toBe('fade')
    expect(sessionPhaseAt(plan, 1_200)).toBe('fade')
  })

  it('liefert verständliche deutsche Phasenbezeichnungen', () => {
    expect(sessionPhaseLabel('settle')).toBe('Ankommen')
    expect(sessionPhaseLabel('sound')).toBe('Klangzeit')
    expect(sessionPhaseLabel('fade')).toBe('Sanft ausblenden')
  })
})
