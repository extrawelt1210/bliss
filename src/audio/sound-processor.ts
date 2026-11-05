import { BrownNoiseGenerator, PinkNoiseGenerator, WhiteNoiseGenerator } from './noise-generators'
import { normalizeDroneSettings } from './drone-filter'
import { SoundShaper, normalizeSoundMacros } from './sound-shaper'
import { createSoundscapeGenerator } from './soundscape-generators'
import type { DroneSettings, GeneratedSoundKind, SoundMacros, SoundscapeKind } from './types'

declare const sampleRate: number

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor,
): void

const isGeneratedSoundKind = (kind: unknown): kind is GeneratedSoundKind =>
  kind === 'brown' || kind === 'pink' || kind === 'white' ||
  kind === 'sea' || kind === 'coast' || kind === 'cove' || kind === 'wind' ||
  kind === 'rain' || kind === 'thunder' || kind === 'night' ||
  kind === 'drone' || kind === 'space'

const isSoundscapeKind = (kind: GeneratedSoundKind): kind is SoundscapeKind =>
  kind !== 'brown' && kind !== 'pink' && kind !== 'white'

class BlissSoundProcessor extends AudioWorkletProcessor {
  private kind: GeneratedSoundKind
  private generator: { next(): number; setDroneSettings?(settings: DroneSettings): void }
  private shaper: SoundShaper
  private droneSettings: DroneSettings

  constructor(options?: AudioWorkletNodeOptions) {
    super()
    const requestedKind = options?.processorOptions?.kind
    this.kind = isGeneratedSoundKind(requestedKind) ? requestedKind : 'brown'
    this.droneSettings = normalizeDroneSettings(options?.processorOptions?.droneSettings)
    this.generator = this.createGenerator(this.kind)
    this.shaper = new SoundShaper(sampleRate, normalizeSoundMacros(options?.processorOptions?.macros))

    this.port.onmessage = (event: MessageEvent<{
      kind?: GeneratedSoundKind
      macros?: SoundMacros
      droneSettings?: DroneSettings
    }>) => {
      if (isGeneratedSoundKind(event.data.kind) && event.data.kind !== this.kind) {
        this.kind = event.data.kind
        this.generator = this.createGenerator(this.kind)
        this.shaper.reset()
      }
      if (event.data.macros) this.shaper.setMacros(event.data.macros)
      if (event.data.droneSettings) {
        this.droneSettings = normalizeDroneSettings(event.data.droneSettings)
        this.generator.setDroneSettings?.(this.droneSettings)
      }
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const channel = outputs[0]?.[0]
    if (!channel) return true

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = this.shaper.next(this.generator.next())
    }

    return true
  }

  private createGenerator(kind: GeneratedSoundKind): {
    next(): number
    setDroneSettings?(settings: DroneSettings): void
  } {
    if (kind === 'brown') return new BrownNoiseGenerator()
    if (kind === 'pink') return new PinkNoiseGenerator()
    if (kind === 'white') return new WhiteNoiseGenerator()
    if (isSoundscapeKind(kind)) return createSoundscapeGenerator(kind, sampleRate, Math.random, this.droneSettings)
    return new BrownNoiseGenerator()
  }
}

registerProcessor('bliss-sound-processor', BlissSoundProcessor)
