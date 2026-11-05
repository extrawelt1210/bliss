import processorUrl from './sound-processor.ts?worker&url'
import { createBinauralSource } from './binaural-source'
import type { SoundSource } from './binaural-source'
import { DEFAULT_DRONE_SETTINGS, DEFAULT_SOUND_EFFECTS, DEFAULT_SOUND_MACROS } from './types'
import { normalizeDroneSettings } from './drone-filter'
import { normalizeSoundMacros } from './sound-shaper'
import { createRoomImpulseData, createTapeCurve, normalizeSoundEffects } from './spatial-effects'
import {
  DEFAULT_TINNITUS_SETTINGS,
  notchQFromOctaves,
  normalizeTinnitusSettings,
} from './tinnitus-tools'
import type {
  AudioEngine,
  AudioLayerId,
  AudioMix,
  DroneSettings,
  Sound,
  SoundEffects,
  SoundMacros,
  TinnitusSettings,
} from './types'

const MAX_OUTPUT_GAIN = 0.28
const LAYER_HEADROOM = 0.7
const START_FADE_SECONDS = 1.2
const CHANGE_FADE_SECONDS = 0.18
const STOP_FADE_SECONDS = 0.35
const LAYER_IDS: readonly AudioLayerId[] = ['primary', 'secondary']

interface EngineDependencies {
  createAudioContext: () => AudioContext
  createWorkletNode: (context: AudioContext, name: string, options: AudioWorkletNodeOptions) => AudioWorkletNode
  delay: (milliseconds: number) => Promise<void>
  processorUrl: string
}

interface LayerSession {
  gain: GainNode
  source: SoundSource | null
  sound: Sound | null
  volume: number
}

interface EffectSession {
  input: GainNode
  tapeShaper: WaveShaperNode
  tapeCompressor: DynamicsCompressorNode
  dryGain: GainNode
  preDelay: DelayNode
  convolver: ConvolverNode
  reverbFilter: BiquadFilterNode
  wetGain: GainNode
}

interface Session {
  context: AudioContext
  gain: GainNode
  notchFilter: BiquadFilterNode
  limiter: DynamicsCompressorNode
  effects: EffectSession
  layers: Record<AudioLayerId, LayerSession>
  moduleLoaded: boolean
  playing: boolean
  switching: Set<AudioLayerId>
  completionCue: { dispose(): void } | null
  tuner: { oscillator: OscillatorNode; gain: GainNode } | null
  released: boolean
}

const defaultDependencies = (): EngineDependencies => ({
  createAudioContext: () => {
    if (!window.AudioContext) {
      throw new AudioEngineError('Dieser Browser unterstützt die benötigte Audiowiedergabe nicht.')
    }
    return new AudioContext({ latencyHint: 'playback' })
  },
  createWorkletNode: (context, name, options) => new AudioWorkletNode(context, name, options),
  delay: (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)),
  processorUrl,
})

export class AudioEngineError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AudioEngineError'
  }
}

export class WebAudioEngine implements AudioEngine {
  private readonly dependencies: EngineDependencies
  private session: Session | null = null
  private volume = 0.18
  private queue: Promise<void> = Promise.resolve()
  private generation = 0
  private stopping: Promise<void> | null = null
  private interruptionHandler: (() => void) | null = null
  private macros: SoundMacros = { ...DEFAULT_SOUND_MACROS }
  private effects: SoundEffects = { ...DEFAULT_SOUND_EFFECTS }
  private droneSettings: DroneSettings = { ...DEFAULT_DRONE_SETTINGS }
  private tinnitusSettings: TinnitusSettings = { ...DEFAULT_TINNITUS_SETTINGS }

  constructor(dependencies: Partial<EngineDependencies> = {}) {
    this.dependencies = { ...defaultDependencies(), ...dependencies }
  }

  start(mix: AudioMix, volume: number): Promise<void> {
    if (this.stopping) return Promise.reject(new AudioEngineError('Der Klang wird gerade beendet.'))
    this.volume = this.normalizeVolume(volume)
    const generation = this.generation
    try {
      // Construction and resume stay in the user interaction call stack for iOS.
      const session = this.session ?? this.createSession()
      const resume = session.context.state === 'running' ? Promise.resolve() : session.context.resume()
      void resume.catch(() => undefined)
      return this.enqueue(async () => {
        await resume
        if (!this.isCurrent(session, generation)) return
        this.disposeTuner(session)
        await this.applyMix(session, mix, generation)
        if (!this.isCurrent(session, generation)) return
        this.rampGain(session.gain, session.context, this.volume * MAX_OUTPUT_GAIN, START_FADE_SECONDS)
        session.playing = true
      }, generation)
    } catch (error) {
      return this.stop().then(() => { throw this.wrapError(error) })
    }
  }

  pause(): Promise<void> {
    const generation = this.generation
    return this.enqueue(async () => {
      const session = this.session
      if (!session?.playing) return
      session.playing = false
      this.rampGain(session.gain, session.context, 0, STOP_FADE_SECONDS)
      await this.dependencies.delay(STOP_FADE_SECONDS * 1000)
      if (this.isCurrent(session, generation) && session.context.state === 'running') {
        await session.context.suspend()
      }
    }, generation)
  }

  stop(): Promise<void> {
    if (this.stopping) return this.stopping
    this.generation += 1
    this.queue = Promise.resolve()
    const session = this.session
    this.session = null
    if (!session) return Promise.resolve()
    session.playing = false
    this.stopping = (async () => {
      try {
        if (session.context.state === 'running') {
          this.rampGain(session.gain, session.context, 0, STOP_FADE_SECONDS)
          if (session.tuner) this.rampGain(session.tuner.gain, session.context, 0, STOP_FADE_SECONDS)
          await this.dependencies.delay(STOP_FADE_SECONDS * 1000)
        }
      } finally {
        await this.release(session)
      }
    })().finally(() => { this.stopping = null })
    return this.stopping
  }

  setVolume(volume: number, fadeSeconds = CHANGE_FADE_SECONDS): void {
    this.volume = this.normalizeVolume(volume)
    const session = this.session
    if (session?.playing) {
      const duration = Number.isFinite(fadeSeconds) ? Math.max(0, Math.min(600, fadeSeconds)) : CHANGE_FADE_SECONDS
      this.rampGain(session.gain, session.context, this.volume * MAX_OUTPUT_GAIN, duration)
    }
  }

  setLayerSound(layerId: AudioLayerId, sound: Sound | null): Promise<void> {
    const generation = this.generation
    return this.enqueue(async () => {
      const session = this.session
      if (!session) return
      await this.replaceLayerSource(session, layerId, sound, generation)
    }, generation)
  }

  setLayerVolume(layerId: AudioLayerId, volume: number): void {
    const session = this.session
    if (!session) return
    const layer = session.layers[layerId]
    layer.volume = this.normalizeVolume(volume)
    if (session.switching.has(layerId)) return
    const target = layer.volume * LAYER_HEADROOM
    if (session.playing) {
      this.rampGain(layer.gain, session.context, target, CHANGE_FADE_SECONDS)
    } else {
      this.setGainImmediately(layer.gain, session.context, target)
    }
  }

  setSoundMacros(macros: SoundMacros): void {
    this.macros = normalizeSoundMacros(macros)
    const session = this.session
    if (!session) return
    for (const layerId of LAYER_IDS) session.layers[layerId].source?.setMacros?.(this.macros)
  }

  setSoundEffects(effects: SoundEffects): void {
    this.effects = normalizeSoundEffects(effects)
    const session = this.session
    if (session) this.applySoundEffects(session)
  }

  setDroneSettings(settings: DroneSettings): void {
    this.droneSettings = normalizeDroneSettings(settings)
    const session = this.session
    if (!session) return
    for (const layerId of LAYER_IDS) {
      session.layers[layerId].source?.setDroneSettings?.(this.droneSettings)
    }
  }

  setTinnitusSettings(settings: TinnitusSettings): void {
    this.tinnitusSettings = normalizeTinnitusSettings(settings)
    const session = this.session
    if (session) this.applyTinnitusSettings(session)
  }

  startTunerTone(frequency: number): Promise<void> {
    const normalized = normalizeTinnitusSettings({ ...this.tinnitusSettings, frequency }).frequency
    const generation = this.generation
    try {
      const session = this.session ?? this.createSession()
      const resume = session.context.state === 'running' ? Promise.resolve() : session.context.resume()
      void resume.catch(() => undefined)
      return this.enqueue(async () => {
        await resume
        if (!this.isCurrent(session, generation)) return
        this.disposeTuner(session)
        const oscillator = session.context.createOscillator()
        const gain = session.context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = normalized
        gain.gain.value = 0
        oscillator.connect(gain)
        gain.connect(session.limiter)
        oscillator.start()
        this.rampGain(gain, session.context, 0.012, 0.25)
        session.tuner = { oscillator, gain }
      }, generation)
    } catch (error) {
      return Promise.reject(this.wrapError(error))
    }
  }

  setTunerFrequency(frequency: number): void {
    const session = this.session
    if (!session?.tuner) return
    const normalized = normalizeTinnitusSettings({ ...this.tinnitusSettings, frequency }).frequency
    session.tuner.oscillator.frequency.setValueAtTime(normalized, session.context.currentTime)
  }

  async stopTunerTone(): Promise<void> {
    const session = this.session
    if (!session?.tuner) return
    const tuner = session.tuner
    this.rampGain(tuner.gain, session.context, 0, CHANGE_FADE_SECONDS)
    await this.dependencies.delay(CHANGE_FADE_SECONDS * 1000)
    if (session.tuner === tuner) this.disposeTuner(session)
  }

  playCompletionCue(volume: number): Promise<void> {
    const generation = this.generation
    return this.enqueue(async () => {
      const session = this.session
      if (!session || !this.isCurrent(session, generation) || session.context.state !== 'running') return

      session.completionCue?.dispose()
      const oscillator = session.context.createOscillator()
      const gain = session.context.createGain()
      let disposed = false
      const cue = {
        dispose: () => {
          if (disposed) return
          disposed = true
          try { oscillator.stop() } catch { /* The scheduled stop may already have completed. */ }
          oscillator.disconnect()
          gain.disconnect()
        },
      }
      session.completionCue = cue

      const now = session.context.currentTime
      const peak = this.normalizeVolume(volume) * MAX_OUTPUT_GAIN * 0.18
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(330, now)
      oscillator.frequency.linearRampToValueAtTime(392, now + 1.4)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(peak, now + 0.35)
      gain.gain.linearRampToValueAtTime(0, now + 1.6)
      oscillator.connect(gain)
      gain.connect(session.limiter)
      oscillator.start(now)
      oscillator.stop(now + 1.7)
      await this.dependencies.delay(1_700)
      cue.dispose()
      if (session.completionCue === cue) session.completionCue = null
    }, generation)
  }

  setInterruptionHandler(handler: (() => void) | null): void {
    this.interruptionHandler = handler
  }

  dispose(): Promise<void> {
    this.interruptionHandler = null
    return this.stop()
  }

  private enqueue(operation: () => Promise<void>, generation: number): Promise<void> {
    const result = this.queue.then(async () => {
      if (generation !== this.generation) return
      try {
        await operation()
      } catch (error) {
        if (generation !== this.generation) return
        await this.stop()
        throw this.wrapError(error)
      }
    })
    this.queue = result.catch(() => undefined)
    return result
  }

  private createSession(): Session {
    const context = this.dependencies.createAudioContext()
    const nodes: AudioNode[] = []
    try {
      const gain = context.createGain()
      nodes.push(gain)
      const primaryGain = context.createGain()
      nodes.push(primaryGain)
      const secondaryGain = context.createGain()
      nodes.push(secondaryGain)
      const effectsInput = context.createGain()
      nodes.push(effectsInput)
      const tapeShaper = context.createWaveShaper()
      nodes.push(tapeShaper)
      const tapeCompressor = context.createDynamicsCompressor()
      nodes.push(tapeCompressor)
      const dryGain = context.createGain()
      nodes.push(dryGain)
      const preDelay = context.createDelay(0.1)
      nodes.push(preDelay)
      const convolver = context.createConvolver()
      nodes.push(convolver)
      const reverbFilter = context.createBiquadFilter()
      nodes.push(reverbFilter)
      const wetGain = context.createGain()
      nodes.push(wetGain)
      const limiter = context.createDynamicsCompressor()
      nodes.push(limiter)
      const notchFilter = context.createBiquadFilter()
      nodes.push(notchFilter)

      gain.gain.value = 0
      primaryGain.gain.value = LAYER_HEADROOM
      secondaryGain.gain.value = 0.35 * LAYER_HEADROOM
      for (const node of [
        gain, primaryGain, secondaryGain, effectsInput, tapeShaper, tapeCompressor,
        dryGain, preDelay, convolver, reverbFilter, wetGain, notchFilter, limiter,
      ]) {
        node.channelCount = 2
        node.channelCountMode = 'explicit'
      }
      tapeShaper.oversample = '2x'
      preDelay.delayTime.value = 0.018
      convolver.normalize = false
      convolver.buffer = this.createRoomImpulse(context)
      reverbFilter.type = 'lowpass'
      reverbFilter.frequency.value = 5_600
      reverbFilter.Q.value = 0.15
      limiter.threshold.value = -16
      limiter.knee.value = 12
      limiter.ratio.value = 8
      limiter.attack.value = 0.003
      limiter.release.value = 0.25
      notchFilter.type = 'allpass'
      primaryGain.connect(effectsInput)
      secondaryGain.connect(effectsInput)
      effectsInput.connect(tapeShaper)
      tapeShaper.connect(tapeCompressor)
      tapeCompressor.connect(dryGain)
      dryGain.connect(gain)
      tapeCompressor.connect(preDelay)
      preDelay.connect(convolver)
      convolver.connect(reverbFilter)
      reverbFilter.connect(wetGain)
      wetGain.connect(gain)
      gain.connect(notchFilter)
      notchFilter.connect(limiter)
      limiter.connect(context.destination)

      const session: Session = {
        context,
        gain,
        notchFilter,
        limiter,
        effects: {
          input: effectsInput,
          tapeShaper,
          tapeCompressor,
          dryGain,
          preDelay,
          convolver,
          reverbFilter,
          wetGain,
        },
        layers: {
          primary: { gain: primaryGain, source: null, sound: null, volume: 1 },
          secondary: { gain: secondaryGain, source: null, sound: null, volume: 0.35 },
        },
        moduleLoaded: false,
        playing: false,
        switching: new Set(),
        completionCue: null,
        tuner: null,
        released: false,
      }
      this.applySoundEffects(session)
      this.applyTinnitusSettings(session)
      context.onstatechange = () => this.handleContextStateChange(session)
      this.session = session
      return session
    } catch (error) {
      nodes.forEach((node) => node.disconnect())
      context.onstatechange = null
      void context.close().catch(() => undefined)
      throw error
    }
  }

  private async applyMix(session: Session, mix: AudioMix, generation: number): Promise<void> {
    session.layers.primary.volume = this.normalizeVolume(mix.primary.volume)
    this.setGainImmediately(
      session.layers.primary.gain,
      session.context,
      session.layers.primary.volume * LAYER_HEADROOM,
    )
    await this.replaceLayerSource(session, 'primary', mix.primary.sound, generation)
    if (!this.isCurrent(session, generation)) return

    const secondary = mix.secondary
    session.layers.secondary.volume = this.normalizeVolume(secondary?.volume ?? 0.35)
    this.setGainImmediately(
      session.layers.secondary.gain,
      session.context,
      session.layers.secondary.volume * LAYER_HEADROOM,
    )
    await this.replaceLayerSource(session, 'secondary', secondary?.sound ?? null, generation)
  }

  private async replaceLayerSource(
    session: Session,
    layerId: AudioLayerId,
    sound: Sound | null,
    generation: number,
  ): Promise<void> {
    const layer = session.layers[layerId]
    if (this.soundsEqual(layer.sound, sound)) return

    session.switching.add(layerId)
    try {
      if (session.playing && layer.source) {
        this.rampGain(layer.gain, session.context, 0, CHANGE_FADE_SECONDS)
        await this.dependencies.delay(CHANGE_FADE_SECONDS * 1000)
        if (!this.isCurrent(session, generation)) return
      }

      layer.source?.dispose()
      layer.source = null
      layer.sound = null
      if (!sound) return

      const source = await this.createSource(session, sound, generation)
      if (!source || !this.isCurrent(session, generation)) {
        source?.dispose()
        return
      }
      source.output.connect(layer.gain)
      layer.source = source
      layer.sound = { ...sound }
      if (session.playing) {
        this.rampGain(layer.gain, session.context, layer.volume * LAYER_HEADROOM, CHANGE_FADE_SECONDS)
      }
    } finally {
      session.switching.delete(layerId)
    }
  }

  private async createSource(session: Session, sound: Sound, generation: number): Promise<SoundSource | null> {
    if (sound.kind === 'binaural') {
      return createBinauralSource(session.context, sound.difference)
    }
    if (!session.context.audioWorklet) {
      throw new AudioEngineError('Dieser Browser unterstützt die lokale Klangerzeugung nicht.')
    }
    if (!session.moduleLoaded) {
      await session.context.audioWorklet.addModule(this.dependencies.processorUrl)
      if (!this.isCurrent(session, generation)) return null
      session.moduleLoaded = true
    }
    const generatedSound = this.dependencies.createWorkletNode(session.context, 'bliss-sound-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: {
        kind: sound.kind,
        macros: this.macros,
        droneSettings: this.droneSettings,
      },
    })
    return {
      output: generatedSound,
      setMacros: (macros) => generatedSound.port.postMessage({ macros }),
      setDroneSettings: (droneSettings) => generatedSound.port.postMessage({ droneSettings }),
      dispose: () => { generatedSound.disconnect(); generatedSound.port.close() },
    }
  }

  private handleContextStateChange(session: Session): void {
    const state = session.context.state as string
    if (!this.isCurrent(session, this.generation) || !session.playing ||
        (state !== 'suspended' && state !== 'interrupted')) return
    session.playing = false
    this.setGainImmediately(session.gain, session.context, 0)
    this.interruptionHandler?.()
  }

  private isCurrent(session: Session, generation: number): boolean {
    return this.session === session && this.generation === generation && !session.released
  }

  private soundsEqual(first: Sound | null, second: Sound | null): boolean {
    if (!first || !second) return first === second
    return first.kind === second.kind &&
      (first.kind !== 'binaural' || (second.kind === 'binaural' && first.difference === second.difference))
  }

  private rampGain(node: GainNode, context: BaseAudioContext, target: number, durationSeconds: number): void {
    const parameter = node.gain
    const now = context.currentTime
    if (typeof parameter.cancelAndHoldAtTime === 'function') {
      parameter.cancelAndHoldAtTime(now)
    } else {
      const current = parameter.value
      parameter.cancelScheduledValues(now)
      parameter.setValueAtTime(current, now)
    }
    parameter.linearRampToValueAtTime(target, now + durationSeconds)
  }

  private setGainImmediately(node: GainNode, context: BaseAudioContext, target: number): void {
    const now = context.currentTime
    node.gain.cancelScheduledValues(now)
    node.gain.setValueAtTime(target, now)
  }

  private createRoomImpulse(context: AudioContext): AudioBuffer {
    const channels = createRoomImpulseData(context.sampleRate)
    const buffer = context.createBuffer(2, channels[0].length, context.sampleRate)
    buffer.copyToChannel(channels[0], 0)
    buffer.copyToChannel(channels[1], 1)
    return buffer
  }

  private applySoundEffects(session: Session): void {
    const { room, tape } = this.effects
    const { dryGain, wetGain, tapeShaper, tapeCompressor } = session.effects
    tapeShaper.curve = createTapeCurve(tape)
    tapeCompressor.threshold.value = tape === 0 ? 0 : -8 - tape * 10
    tapeCompressor.knee.value = 18
    tapeCompressor.ratio.value = 1 + tape * 1.8
    tapeCompressor.attack.value = 0.015
    tapeCompressor.release.value = 0.18
    const setGain = session.playing
      ? (node: GainNode, target: number) => this.rampGain(node, session.context, target, CHANGE_FADE_SECONDS)
      : (node: GainNode, target: number) => this.setGainImmediately(node, session.context, target)
    setGain(dryGain, 1 - room * 0.06)
    setGain(wetGain, room * 0.28)
  }

  private applyTinnitusSettings(session: Session): void {
    const settings = this.tinnitusSettings
    session.notchFilter.type = settings.notchEnabled ? 'notch' : 'allpass'
    session.notchFilter.frequency.setValueAtTime(
      Math.min(settings.frequency, session.context.sampleRate * 0.45),
      session.context.currentTime,
    )
    session.notchFilter.Q.setValueAtTime(notchQFromOctaves(settings.notchWidth), session.context.currentTime)
  }

  private disposeTuner(session: Session): void {
    const tuner = session.tuner
    if (!tuner) return
    session.tuner = null
    try { tuner.oscillator.stop() } catch { /* The oscillator may already be stopped. */ }
    tuner.oscillator.disconnect()
    tuner.gain.disconnect()
  }

  private async release(session: Session): Promise<void> {
    if (session.released) return
    session.released = true
    session.context.onstatechange = null
    session.completionCue?.dispose()
    session.completionCue = null
    this.disposeTuner(session)
    for (const layerId of LAYER_IDS) {
      const layer = session.layers[layerId]
      try {
        layer.source?.dispose()
      } catch {
        // Continue releasing the complete graph even if a browser node already stopped.
      }
      layer.source = null
      layer.gain.disconnect()
    }
    session.effects.convolver.buffer = null
    session.effects.input.disconnect()
    session.effects.tapeShaper.disconnect()
    session.effects.tapeCompressor.disconnect()
    session.effects.dryGain.disconnect()
    session.effects.preDelay.disconnect()
    session.effects.convolver.disconnect()
    session.effects.reverbFilter.disconnect()
    session.effects.wetGain.disconnect()
    session.gain.disconnect()
    session.notchFilter.disconnect()
    session.limiter.disconnect()
    if (session.context.state !== 'closed') {
      await session.context.close().catch(() => undefined)
    }
  }

  private normalizeVolume(volume: number): number {
    return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.18
  }

  private wrapError(error: unknown): AudioEngineError {
    return error instanceof AudioEngineError ? error : new AudioEngineError(
      'Der Klang konnte nicht gestartet werden. Bitte versuche es erneut.', { cause: error },
    )
  }
}
