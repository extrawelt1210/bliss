import { DEFAULT_SOUND_MACROS } from './types'
import type { SoundMacros } from './types'

const TAU = Math.PI * 2
const DEFAULT_SAMPLE_RATE = 48_000

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5))
const clampSample = (sample: number) => Math.max(-1, Math.min(1, sample))

export const normalizeSoundMacros = (macros: Partial<SoundMacros> | undefined): SoundMacros => ({
  warmth: clamp(macros?.warmth ?? DEFAULT_SOUND_MACROS.warmth),
  softness: clamp(macros?.softness ?? DEFAULT_SOUND_MACROS.softness),
  airiness: clamp(macros?.airiness ?? DEFAULT_SOUND_MACROS.airiness),
  movement: clamp(macros?.movement ?? DEFAULT_SOUND_MACROS.movement),
})

/**
 * Conservative post-shaping for locally generated mono signals. The four
 * macros intentionally use narrow ranges so no setting creates a resonant
 * peak, abrupt transient or gain boost.
 */
export class SoundShaper {
  private readonly sampleRate: number
  private macros: SoundMacros
  private warmState = 0
  private softState = 0
  private airState = 0
  private movementPhase = 0

  constructor(sampleRate: number, macros: Partial<SoundMacros> = DEFAULT_SOUND_MACROS) {
    this.sampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : DEFAULT_SAMPLE_RATE
    this.macros = normalizeSoundMacros(macros)
  }

  setMacros(macros: Partial<SoundMacros>): void {
    this.macros = normalizeSoundMacros(macros)
  }

  next(sample: number): number {
    const { warmth, softness, airiness, movement } = this.macros

    this.warmState += (0.025 + (1 - warmth) * 0.11) * (sample - this.warmState)
    const warmBlend = sample * (1 - warmth * 0.42) + this.warmState * warmth * 0.42

    this.softState += (0.04 + (1 - softness) * 0.32) * (warmBlend - this.softState)
    const softened = warmBlend * (1 - softness * 0.5) + this.softState * softness * 0.5

    this.airState += 0.025 * (softened - this.airState)
    const airDetail = softened - this.airState
    const airy = softened * (1 - airiness * 0.12) + airDetail * airiness * 0.18

    this.movementPhase = (this.movementPhase + TAU / (this.sampleRate * 17)) % TAU
    const movementGain = 1 - movement * 0.12 + Math.sin(this.movementPhase) * movement * 0.08
    return clampSample(airy * movementGain * 0.92)
  }

  reset(): void {
    this.warmState = 0
    this.softState = 0
    this.airState = 0
    this.movementPhase = 0
  }
}
