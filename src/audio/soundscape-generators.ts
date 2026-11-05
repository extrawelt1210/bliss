import { BrownNoiseGenerator, PinkNoiseGenerator, WhiteNoiseGenerator } from './noise-generators'
import type { RandomSource } from './noise-generators'
import {
  DroneMultimodeFilter,
  droneCutoffHz,
  droneLfoRateHz,
  normalizeDroneSettings,
} from './drone-filter'
import type { DroneSettings, SoundscapeKind } from './types'

export interface SoundscapeGenerator {
  next(): number
  reset(): void
  setDroneSettings?(settings: DroneSettings): void
}

const TAU = Math.PI * 2
const DEFAULT_SAMPLE_RATE = 48_000
const DRONE_BASE_FREQUENCIES = [55, 82.41, 110, 123.47, 164.81, 220, 246.94, 329.63] as const
const DRONE_DRIFT_FACTORS = [0.7, 1, -0.65, 0.42, -0.32, 0.22, -0.18, 0.12] as const
const DRONE_LEVELS = [0.075, 0.12, 0.105, 0.072, 0.048, 0.025, 0.016, 0.009] as const
const DRONE_INITIAL_PHASES = [0, 0.7, 1.9, 2.8, 0.35, 1.4, 2.3, 3.5] as const

const clampSample = (sample: number) => Math.max(-1, Math.min(1, sample))
const safeSampleRate = (sampleRate: number) =>
  Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : DEFAULT_SAMPLE_RATE

/**
 * A continuous surf bed made from pink noise, a soft low-pass filter and two
 * slow, overlapping swell envelopes. It deliberately avoids isolated crests
 * or transients that could become startling at the headphones.
 */
export class SeaSoundscapeGenerator implements SoundscapeGenerator {
  private readonly sampleRate: number
  private readonly pink: PinkNoiseGenerator
  private filtered = 0
  private primaryPhase = 0
  private secondaryPhase = 1.7

  constructor(sampleRate: number, random: RandomSource = Math.random) {
    this.sampleRate = safeSampleRate(sampleRate)
    this.pink = new PinkNoiseGenerator(random)
  }

  next(): number {
    const noise = this.pink.next()
    this.filtered += 0.075 * (noise - this.filtered)
    this.primaryPhase = (this.primaryPhase + TAU / (this.sampleRate * 8.5)) % TAU
    this.secondaryPhase = (this.secondaryPhase + TAU / (this.sampleRate * 13.7)) % TAU

    const primarySwell = 0.5 + 0.5 * Math.sin(this.primaryPhase)
    const secondarySwell = 0.5 + 0.5 * Math.sin(this.secondaryPhase)
    const envelope = 0.24 + 0.5 * primarySwell + 0.18 * secondarySwell
    return clampSample((this.filtered * 0.82 + noise * 0.18) * envelope * 0.82)
  }

  reset(): void {
    this.pink.reset()
    this.filtered = 0
    this.primaryPhase = 0
    this.secondaryPhase = 1.7
  }
}

/** A wider, brighter surf variant with overlapping but still soft breakers. */
export class CoastSoundscapeGenerator implements SoundscapeGenerator {
  private readonly sampleRate: number
  private readonly pink: PinkNoiseGenerator
  private readonly white: WhiteNoiseGenerator
  private body = 0
  private detail = 0
  private swellPhase = 0.4
  private breakerPhase = 2.1

  constructor(sampleRate: number, random: RandomSource = Math.random) {
    this.sampleRate = safeSampleRate(sampleRate)
    this.pink = new PinkNoiseGenerator(random)
    this.white = new WhiteNoiseGenerator(random)
  }

  next(): number {
    this.swellPhase = (this.swellPhase + TAU / (this.sampleRate * 7.2)) % TAU
    this.breakerPhase = (this.breakerPhase + TAU / (this.sampleRate * 11.8)) % TAU
    this.body += 0.065 * (this.pink.next() - this.body)
    this.detail += 0.16 * (this.white.next() - this.detail)
    const swell = 0.48 + Math.sin(this.swellPhase) * 0.24 + Math.sin(this.breakerPhase) * 0.12
    return clampSample((this.body * 0.78 + this.detail * 0.12) * swell)
  }

  reset(): void {
    this.pink.reset()
    this.white.reset()
    this.body = 0
    this.detail = 0
    this.swellPhase = 0.4
    this.breakerPhase = 2.1
  }
}

/** A sheltered, darker water bed with slower movement and less high detail. */
export class CoveSoundscapeGenerator implements SoundscapeGenerator {
  private readonly sampleRate: number
  private readonly brown: BrownNoiseGenerator
  private readonly pink: PinkNoiseGenerator
  private filtered = 0
  private phase = 1.2

  constructor(sampleRate: number, random: RandomSource = Math.random) {
    this.sampleRate = safeSampleRate(sampleRate)
    this.brown = new BrownNoiseGenerator(random)
    this.pink = new PinkNoiseGenerator(random)
  }

  next(): number {
    this.phase = (this.phase + TAU / (this.sampleRate * 14.5)) % TAU
    const noise = this.brown.next() * 0.62 + this.pink.next() * 0.38
    this.filtered += 0.035 * (noise - this.filtered)
    return clampSample(this.filtered * (0.38 + Math.sin(this.phase) * 0.13))
  }

  reset(): void {
    this.brown.reset()
    this.pink.reset()
    this.filtered = 0
    this.phase = 1.2
  }
}

/** Slowly changing, low-frequency air movement without whistle-like tones. */
export class WindSoundscapeGenerator implements SoundscapeGenerator {
  private readonly sampleRate: number
  private readonly brown: BrownNoiseGenerator
  private readonly pink: PinkNoiseGenerator
  private filtered = 0
  private gustPhase = 0.8
  private driftPhase = 2.4

  constructor(sampleRate: number, random: RandomSource = Math.random) {
    this.sampleRate = safeSampleRate(sampleRate)
    this.brown = new BrownNoiseGenerator(random)
    this.pink = new PinkNoiseGenerator(random)
  }

  next(): number {
    this.gustPhase = (this.gustPhase + TAU / (this.sampleRate * 11.3)) % TAU
    this.driftPhase = (this.driftPhase + TAU / (this.sampleRate * 19.1)) % TAU
    const gust = 0.5 + 0.5 * Math.sin(this.gustPhase)
    const drift = 0.5 + 0.5 * Math.sin(this.driftPhase)
    const cutoff = 0.018 + gust * 0.052
    const noise = this.pink.next() * 0.65 + this.brown.next() * 0.35
    this.filtered += cutoff * (noise - this.filtered)
    const envelope = 0.3 + gust * 0.38 + drift * 0.16
    return clampSample(this.filtered * envelope * 0.9)
  }

  reset(): void {
    this.brown.reset()
    this.pink.reset()
    this.filtered = 0
    this.gustPhase = 0.8
    this.driftPhase = 2.4
  }
}

/** Continuous filtered rain without isolated hard droplet transients. */
export class RainSoundscapeGenerator implements SoundscapeGenerator {
  private readonly sampleRate: number
  private readonly white: WhiteNoiseGenerator
  private readonly pink: PinkNoiseGenerator
  private body = 0
  private veil = 0
  private phase = 0

  constructor(sampleRate: number, random: RandomSource = Math.random) {
    this.sampleRate = safeSampleRate(sampleRate)
    this.white = new WhiteNoiseGenerator(random)
    this.pink = new PinkNoiseGenerator(random)
  }

  next(): number {
    this.phase = (this.phase + TAU / (this.sampleRate * 12.6)) % TAU
    this.body += 0.22 * (this.pink.next() - this.body)
    this.veil += 0.38 * (this.white.next() - this.veil)
    const drift = 0.58 + Math.sin(this.phase) * 0.06
    return clampSample((this.body * 0.54 + this.veil * 0.16) * drift)
  }

  reset(): void {
    this.white.reset()
    this.pink.reset()
    this.body = 0
    this.veil = 0
    this.phase = 0
  }
}

/** Long low rumble envelopes; intentionally no crack or impact component. */
export class ThunderSoundscapeGenerator implements SoundscapeGenerator {
  private readonly sampleRate: number
  private readonly brown: BrownNoiseGenerator
  private low = 0
  private lower = 0
  private phase = 3.4
  private driftPhase = 0.7

  constructor(sampleRate: number, random: RandomSource = Math.random) {
    this.sampleRate = safeSampleRate(sampleRate)
    this.brown = new BrownNoiseGenerator(random)
  }

  next(): number {
    this.phase = (this.phase + TAU / (this.sampleRate * 21)) % TAU
    this.driftPhase = (this.driftPhase + TAU / (this.sampleRate * 33)) % TAU
    this.low += 0.018 * (this.brown.next() - this.low)
    this.lower += 0.006 * (this.low - this.lower)
    const roll = 0.18 + Math.pow(0.5 + 0.5 * Math.sin(this.phase), 2) * 0.44
    const drift = 0.78 + Math.sin(this.driftPhase) * 0.12
    return clampSample((this.low * 0.42 + this.lower * 0.58) * roll * drift)
  }

  reset(): void {
    this.brown.reset()
    this.low = 0
    this.lower = 0
    this.phase = 3.4
    this.driftPhase = 0.7
  }
}

/** Soft night air with distant tonal texture and no sharp insect-like ticks. */
export class NightSoundscapeGenerator implements SoundscapeGenerator {
  private readonly sampleRate: number
  private readonly pink: PinkNoiseGenerator
  private air = 0
  private airPhase = 0.8
  private tonePhase = 0
  private toneEnvelopePhase = 2.2

  constructor(sampleRate: number, random: RandomSource = Math.random) {
    this.sampleRate = safeSampleRate(sampleRate)
    this.pink = new PinkNoiseGenerator(random)
  }

  next(): number {
    this.airPhase = (this.airPhase + TAU / (this.sampleRate * 18)) % TAU
    this.toneEnvelopePhase = (this.toneEnvelopePhase + TAU / (this.sampleRate * 9.5)) % TAU
    this.tonePhase = (this.tonePhase + TAU * 246.94 / this.sampleRate) % TAU
    this.air += 0.028 * (this.pink.next() - this.air)
    const air = this.air * (0.32 + Math.sin(this.airPhase) * 0.08)
    const toneEnvelope = Math.pow(0.5 + 0.5 * Math.sin(this.toneEnvelopePhase), 2) * 0.025
    return clampSample(air + Math.sin(this.tonePhase) * toneEnvelope)
  }

  reset(): void {
    this.pink.reset()
    this.air = 0
    this.airPhase = 0.8
    this.tonePhase = 0
    this.toneEnvelopePhase = 2.2
  }
}

/** Eight quiet partial oscillators, a slow LFO and a safely bounded multimode filter. */
export class DroneSoundscapeGenerator implements SoundscapeGenerator {
  private readonly sampleRate: number
  private readonly filter: DroneMultimodeFilter
  private phases: number[] = [...DRONE_INITIAL_PHASES]
  private driftPhase = 0
  private lfoPhase = 0.35
  private settings: DroneSettings

  constructor(sampleRate: number, settings?: DroneSettings) {
    this.sampleRate = safeSampleRate(sampleRate)
    this.filter = new DroneMultimodeFilter(this.sampleRate)
    this.settings = normalizeDroneSettings(settings)
  }

  setDroneSettings(settings: DroneSettings): void {
    this.settings = normalizeDroneSettings(settings)
  }

  next(): number {
    this.driftPhase = (this.driftPhase + TAU / (this.sampleRate * 23)) % TAU
    this.lfoPhase = (
      this.lfoPhase + TAU * droneLfoRateHz(this.settings.lfoRate) / this.sampleRate
    ) % TAU
    const lfo = Math.sin(this.lfoPhase)
    const drift = Math.sin(this.driftPhase) * 0.15 + lfo * this.settings.lfoDepth * 0.07
    let sample = 0

    for (let index = 0; index < this.phases.length; index += 1) {
      const frequency = DRONE_BASE_FREQUENCIES[index] + drift * DRONE_DRIFT_FACTORS[index]
      this.phases[index] = (this.phases[index] + TAU * frequency / this.sampleRate) % TAU
      sample += Math.sin(this.phases[index]) * DRONE_LEVELS[index]
    }

    const baseCutoff = droneCutoffHz(this.settings.cutoff)
    const cutoffModulation = Math.pow(2, lfo * this.settings.lfoDepth * 1.35)
    const filtered = this.filter.next(
      sample,
      baseCutoff * cutoffModulation,
      this.settings.resonance,
      this.settings.filterMode,
    )
    const slowBreath = 0.92 + Math.sin(this.driftPhase * 0.63) * this.settings.lfoDepth * 0.08
    return clampSample(filtered * slowBreath * 0.78)
  }

  reset(): void {
    this.phases = [...DRONE_INITIAL_PHASES]
    this.driftPhase = 0
    this.lfoPhase = 0.35
    this.filter.reset()
  }
}

/** A lighter suspended pad, still fully synthetic and slowly drifting. */
export class SpaceSoundscapeGenerator implements SoundscapeGenerator {
  private readonly sampleRate: number
  private phases = [0.2, 1.1, 2.4, 3.6]
  private driftPhase = 0.5
  private readonly frequencies = [110, 164.81, 220, 277.18] as const
  private readonly levels = [0.12, 0.09, 0.06, 0.035] as const

  constructor(sampleRate: number) {
    this.sampleRate = safeSampleRate(sampleRate)
  }

  next(): number {
    this.driftPhase = (this.driftPhase + TAU / (this.sampleRate * 31)) % TAU
    const drift = Math.sin(this.driftPhase) * 0.11
    let sample = 0
    for (let index = 0; index < this.phases.length; index += 1) {
      const frequency = this.frequencies[index] + drift * (index % 2 === 0 ? 1 : -0.7)
      this.phases[index] = (this.phases[index] + TAU * frequency / this.sampleRate) % TAU
      sample += Math.sin(this.phases[index]) * this.levels[index]
    }
    return clampSample(sample * (0.78 + Math.sin(this.driftPhase * 0.7) * 0.08))
  }

  reset(): void {
    this.phases = [0.2, 1.1, 2.4, 3.6]
    this.driftPhase = 0.5
  }
}

export function createSoundscapeGenerator(
  kind: SoundscapeKind,
  sampleRate: number,
  random: RandomSource = Math.random,
  droneSettings?: DroneSettings,
): SoundscapeGenerator {
  switch (kind) {
    case 'sea': return new SeaSoundscapeGenerator(sampleRate, random)
    case 'coast': return new CoastSoundscapeGenerator(sampleRate, random)
    case 'cove': return new CoveSoundscapeGenerator(sampleRate, random)
    case 'wind': return new WindSoundscapeGenerator(sampleRate, random)
    case 'rain': return new RainSoundscapeGenerator(sampleRate, random)
    case 'thunder': return new ThunderSoundscapeGenerator(sampleRate, random)
    case 'night': return new NightSoundscapeGenerator(sampleRate, random)
    case 'drone': return new DroneSoundscapeGenerator(sampleRate, droneSettings)
    case 'space': return new SpaceSoundscapeGenerator(sampleRate)
  }
}
