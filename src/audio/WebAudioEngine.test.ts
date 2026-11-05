import { describe, expect, it, vi } from 'vitest'
import { AudioEngineError, WebAudioEngine } from './WebAudioEngine'
import { DEFAULT_DRONE_SETTINGS, DEFAULT_SOUND_MACROS } from './types'
import type { AudioMix, Sound } from './types'

class FakeAudioParam {
  value = 0
  cancelScheduledValues = vi.fn()
  setValueAtTime = vi.fn((value: number) => {
    this.value = value
    return this as unknown as AudioParam
  })
  linearRampToValueAtTime = vi.fn((value: number, _endTime: number) => {
    this.value = value
    return this as unknown as AudioParam
  })
}

class FakeNode {
  channelCount = 1
  channelCountMode: ChannelCountMode = 'max'
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeGainNode extends FakeNode {
  gain = new FakeAudioParam()
}

class FakeLimiterNode extends FakeNode {
  threshold = new FakeAudioParam()
  knee = new FakeAudioParam()
  ratio = new FakeAudioParam()
  attack = new FakeAudioParam()
  release = new FakeAudioParam()
}

class FakeWaveShaperNode extends FakeNode {
  curve: Float32Array | null = null
  oversample: OverSampleType = 'none'
}

class FakeDelayNode extends FakeNode {
  delayTime = new FakeAudioParam()
}

class FakeConvolverNode extends FakeNode {
  buffer: AudioBuffer | null = null
  normalize = true
}

class FakeBiquadFilterNode extends FakeNode {
  type: BiquadFilterType = 'lowpass'
  frequency = new FakeAudioParam()
  Q = new FakeAudioParam()
}

class FakeAudioBuffer {
  readonly channels: Float32Array[]

  constructor(numberOfChannels: number, length: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length))
  }

  copyToChannel(source: Float32Array, channelNumber: number): void {
    this.channels[channelNumber].set(source)
  }
}

class FakeWorkletNode extends FakeNode {
  port = { postMessage: vi.fn(), close: vi.fn() }
}

class FakeOscillator extends FakeNode {
  type = 'sine'
  frequency = new FakeAudioParam()
  start = vi.fn()
  stop = vi.fn()
}

class FakeAudioContext {
  state: AudioContextState = 'suspended'
  currentTime = 1
  destination = {}
  sampleRate = 48_000
  onstatechange: (() => void) | null = null
  workletModule = vi.fn().mockResolvedValue(undefined)
  audioWorklet = { addModule: this.workletModule }
  gain = new FakeGainNode()
  limiter = new FakeLimiterNode()
  tapeCompressor = new FakeLimiterNode()
  compressors: FakeLimiterNode[] = []
  waveShapers: FakeWaveShaperNode[] = []
  delays: FakeDelayNode[] = []
  convolvers: FakeConvolverNode[] = []
  filters: FakeBiquadFilterNode[] = []
  buffers: FakeAudioBuffer[] = []
  oscillators: FakeOscillator[] = []
  mergers: FakeNode[] = []
  gains: FakeGainNode[] = []
  resume = vi.fn(async () => {
    this.state = 'running'
    this.onstatechange?.()
  })
  suspend = vi.fn(async () => {
    this.state = 'suspended'
    this.onstatechange?.()
  })
  close = vi.fn(async () => {
    this.state = 'closed'
    this.onstatechange?.()
  })
  createGain = vi.fn(() => {
    const gain = this.gains.length === 0 ? this.gain : new FakeGainNode()
    this.gains.push(gain)
    return gain
  })
  createDynamicsCompressor = vi.fn(() => {
    const compressor = this.compressors.length === 0 ? this.tapeCompressor : this.limiter
    this.compressors.push(compressor)
    return compressor
  })
  createWaveShaper = vi.fn(() => {
    const node = new FakeWaveShaperNode()
    this.waveShapers.push(node)
    return node
  })
  createDelay = vi.fn(() => {
    const node = new FakeDelayNode()
    this.delays.push(node)
    return node
  })
  createConvolver = vi.fn(() => {
    const node = new FakeConvolverNode()
    this.convolvers.push(node)
    return node
  })
  createBiquadFilter = vi.fn(() => {
    const node = new FakeBiquadFilterNode()
    this.filters.push(node)
    return node
  })
  createBuffer = vi.fn((numberOfChannels: number, length: number) => {
    const buffer = new FakeAudioBuffer(numberOfChannels, length)
    this.buffers.push(buffer)
    return buffer
  })
  createOscillator = vi.fn(() => {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  })
  createChannelMerger = vi.fn(() => {
    const merger = new FakeNode()
    this.mergers.push(merger)
    return merger
  })
  interrupt(): void {
    this.state = 'suspended'
    this.onstatechange?.()
  }
}

const single = (sound: Sound, volume = 1): AudioMix => ({ primary: { sound, volume } })

const createHarness = (options: { delay?: (ms: number) => Promise<void>; context?: FakeAudioContext } = {}) => {
  const contexts: FakeAudioContext[] = []
  const worklets: FakeWorkletNode[] = []
  const workletCreations: Array<{ name: string; options: AudioWorkletNodeOptions }> = []
  const engine = new WebAudioEngine({
    createAudioContext: () => {
      const context = options.context ?? new FakeAudioContext()
      contexts.push(context)
      return context as unknown as AudioContext
    },
    createWorkletNode: (_context, name, nodeOptions) => {
      const node = new FakeWorkletNode()
      worklets.push(node)
      workletCreations.push({ name, options: nodeOptions })
      return node as unknown as AudioWorkletNode
    },
    delay: options.delay ?? (async () => undefined),
    processorUrl: '/sound-processor.js',
  })
  return { engine, contexts, worklets, workletCreations }
}

describe('WebAudioEngine', () => {
  it('erstellt einen Context und verwendet ihn nach Pause weiter', async () => {
    const { engine, contexts } = createHarness()
    await engine.start(single({ kind: 'brown' }), 0.18)
    await engine.pause()
    await engine.start(single({ kind: 'pink' }), 0.2)

    expect(contexts).toHaveLength(1)
    expect(contexts[0].resume).toHaveBeenCalledTimes(2)
    expect(contexts[0].suspend).toHaveBeenCalledOnce()
    expect(contexts[0].gain.gain.value).toBeCloseTo(0.056)
  })

  it('mischt zwei unabhängige Worklet-Ebenen mit Headroom', async () => {
    const { engine, contexts, worklets, workletCreations } = createHarness()
    await engine.start({
      primary: { sound: { kind: 'brown' }, volume: 0.8 },
      secondary: { sound: { kind: 'white' }, volume: 0.3 },
    }, 0.18)

    const context = contexts[0]
    expect(context.workletModule).toHaveBeenCalledOnce()
    expect(worklets).toHaveLength(2)
    expect(workletCreations.map(({ options }) => options.processorOptions)).toEqual([
      { kind: 'brown', macros: DEFAULT_SOUND_MACROS, droneSettings: DEFAULT_DRONE_SETTINGS },
      { kind: 'white', macros: DEFAULT_SOUND_MACROS, droneSettings: DEFAULT_DRONE_SETTINGS },
    ])
    expect(context.gains[1].gain.value).toBeCloseTo(0.56)
    expect(context.gains[2].gain.value).toBeCloseTo(0.21)
    expect(worklets[0].connect).toHaveBeenCalledWith(context.gains[1])
    expect(worklets[1].connect).toHaveBeenCalledWith(context.gains[2])
  })

  it('regelt Ebenen unabhängig und begrenzt ungültige Werte', async () => {
    const { engine, contexts } = createHarness()
    await engine.start({
      primary: { sound: { kind: 'sea' }, volume: 1 },
      secondary: { sound: { kind: 'wind' }, volume: 0.35 },
    }, 0.18)

    engine.setLayerVolume('primary', 0.25)
    engine.setLayerVolume('secondary', 99)
    expect(contexts[0].gains[1].gain.value).toBeCloseTo(0.175)
    expect(contexts[0].gains[2].gain.value).toBeCloseTo(0.7)
  })

  it('überblendet nur die gewählte Ebene ohne stille Lücke und lässt die andere Quelle bestehen', async () => {
    const delay = vi.fn(async () => undefined)
    const { engine, contexts, worklets } = createHarness({ delay })
    await engine.start({
      primary: { sound: { kind: 'brown' }, volume: 1 },
      secondary: { sound: { kind: 'sea' }, volume: 0.35 },
    }, 0.18)
    await engine.setLayerSound('secondary', { kind: 'drone' })

    expect(worklets[0].disconnect).not.toHaveBeenCalled()
    expect(worklets[1].disconnect).toHaveBeenCalledOnce()
    expect(worklets[2].port.close).not.toHaveBeenCalled()
    expect(worklets[2].connect).toHaveBeenCalledWith(contexts[0].gains[6])
    expect(contexts[0].gains[6].connect).toHaveBeenCalledWith(contexts[0].gains[3])
    expect(contexts[0].gains[2].gain.value).toBe(0)
    expect(contexts[0].gains[6].gain.value).toBeCloseTo(0.245)
    expect(contexts[0].gains[2].disconnect).toHaveBeenCalledOnce()
    expect(delay).toHaveBeenCalledWith(180)
  })

  it('entfernt die zweite Ebene vollständig', async () => {
    const { engine, worklets } = createHarness()
    await engine.start({
      primary: { sound: { kind: 'pink' }, volume: 1 },
      secondary: { sound: { kind: 'white' }, volume: 0.35 },
    }, 0.18)
    await engine.setLayerSound('secondary', null)
    expect(worklets[1].disconnect).toHaveBeenCalledOnce()
    expect(worklets[1].port.close).toHaveBeenCalledOnce()
  })

  it('trennt Quellen, Ebenen, Master und Context beim Stoppen', async () => {
    const { engine, contexts, worklets } = createHarness()
    await engine.start({
      primary: { sound: { kind: 'brown' }, volume: 1 },
      secondary: { sound: { kind: 'white' }, volume: 0.35 },
    }, 0.18)
    await engine.stop()

    expect(worklets.every((node) => node.disconnect.mock.calls.length === 1)).toBe(true)
    expect(contexts[0].gains[1].disconnect).toHaveBeenCalledOnce()
    expect(contexts[0].gains[2].disconnect).toHaveBeenCalledOnce()
    expect(contexts[0].gains[3].disconnect).toHaveBeenCalledOnce()
    expect(contexts[0].waveShapers[0].disconnect).toHaveBeenCalledOnce()
    expect(contexts[0].convolvers[0].buffer).toBeNull()
    expect(contexts[0].convolvers[0].disconnect).toHaveBeenCalledOnce()
    expect(contexts[0].gain.disconnect).toHaveBeenCalledOnce()
    expect(contexts[0].limiter.disconnect).toHaveBeenCalledOnce()
    expect(contexts[0].close).toHaveBeenCalledOnce()
  })

  it('erzeugt nach Stop einen frischen einzelnen Context', async () => {
    const { engine, contexts } = createHarness()
    await engine.start(single({ kind: 'brown' }), 0.18)
    await engine.stop()
    await engine.start(single({ kind: 'pink' }), 0.18)
    expect(contexts).toHaveLength(2)
    expect(contexts[0].state).toBe('closed')
    expect(contexts[1].state).toBe('running')
  })

  it.each(['sea', 'coast', 'cove', 'wind', 'rain', 'thunder', 'night', 'drone', 'space', 'white'] as const)('erzeugt %s lokal im AudioWorklet', async (kind) => {
    const { engine, contexts, worklets, workletCreations } = createHarness()
    await engine.start(single({ kind }), 0.18)
    expect(contexts[0].oscillators).toHaveLength(0)
    expect(worklets).toHaveLength(1)
    expect(workletCreations[0]).toMatchObject({
      name: 'bliss-sound-processor',
      options: { processorOptions: { kind } },
    })
  })

  it.each([4, 8, 12] as const)('routet binaural %i Hz exklusiv links/rechts', async (difference) => {
    const { engine, contexts } = createHarness()
    await engine.start(single({ kind: 'binaural', difference }), 0.18)
    const context = contexts[0]
    const leftFrequencies = [200, 300, 400, 600]
    const partialLevels = [0.112, 0.026, 0.016, 0.006]
    expect(context.oscillators).toHaveLength(8)
    leftFrequencies.forEach((leftFrequency, partialIndex) => {
      const left = context.oscillators[partialIndex * 2]
      const right = context.oscillators[partialIndex * 2 + 1]
      expect(left.frequency.value).toBe(leftFrequency)
      expect(right.frequency.value).toBe(leftFrequency + difference)
      expect(left.connect).toHaveBeenCalledWith(context.mergers[partialIndex], 0, 0)
      expect(right.connect).toHaveBeenCalledWith(context.mergers[partialIndex], 0, 1)
      expect(context.gains[7 + partialIndex].gain.value).toBe(partialLevels[partialIndex])
      expect(context.gains[7 + partialIndex].connect).toHaveBeenCalledWith(context.gains[6])
    })
    expect(context.gains[6].connect).toHaveBeenCalledWith(context.gains[1])
    await engine.stop()
    expect(context.oscillators.every((oscillator) => oscillator.stop.mock.calls.length === 1)).toBe(true)
  })

  it('mischt eine binaurale und eine generierte Ebene ohne Kanalverlust', async () => {
    const { engine, contexts, worklets } = createHarness()
    await engine.start({
      primary: { sound: { kind: 'binaural', difference: 8 }, volume: 1 },
      secondary: { sound: { kind: 'sea' }, volume: 0.25 },
    }, 0.18)
    expect(contexts[0].gains[1]).toMatchObject({ channelCount: 2, channelCountMode: 'explicit' })
    expect(contexts[0].gains[2]).toMatchObject({ channelCount: 2, channelCountMode: 'explicit' })
    expect(worklets).toHaveLength(1)
  })

  it('schließt den Context bei fehlgeschlagenem Worklet-Laden', async () => {
    const context = new FakeAudioContext()
    context.workletModule.mockRejectedValueOnce(new Error('Worklet failed'))
    const { engine } = createHarness({ context })
    await expect(engine.start(single({ kind: 'brown' }), 0.18)).rejects.toBeInstanceOf(AudioEngineError)
    expect(context.close).toHaveBeenCalledOnce()
  })

  it('Stop umgeht ein hängendes Worklet-Laden', async () => {
    const context = new FakeAudioContext()
    let finishLoad!: () => void
    context.workletModule.mockReturnValue(new Promise<void>((resolve) => { finishLoad = resolve }))
    const { engine, worklets } = createHarness({ context })
    const start = engine.start(single({ kind: 'brown' }), 0.18)
    await vi.waitFor(() => expect(context.workletModule).toHaveBeenCalledOnce())
    await engine.stop()
    finishLoad()
    await start
    expect(worklets).toHaveLength(0)
    expect(context.state).toBe('closed')
  })

  it('räumt nach teilweise fehlgeschlagenem Oszillatorstart auf', async () => {
    const context = new FakeAudioContext()
    const faulty = new FakeOscillator()
    faulty.start.mockImplementation(() => { throw new Error('Audio start failed') })
    context.createOscillator.mockReturnValueOnce(new FakeOscillator()).mockReturnValueOnce(faulty)
    const { engine } = createHarness({ context })
    await expect(engine.start(single({ kind: 'binaural', difference: 8 }), 0.18)).rejects.toBeInstanceOf(AudioEngineError)
    const left = context.createOscillator.mock.results[0].value as FakeOscillator
    expect(left.stop).toHaveBeenCalledOnce()
    expect(left.disconnect).toHaveBeenCalledOnce()
    expect(context.close).toHaveBeenCalledOnce()
  })

  it('begrenzt den Masterpegel', async () => {
    const { engine, contexts } = createHarness()
    await engine.start(single({ kind: 'white' }), 999)
    expect(contexts[0].gain.gain.value).toBe(0.28)
    engine.setVolume(-1)
    expect(contexts[0].gain.gain.value).toBe(0)
  })

  it('reicht sichere Klang-Makros an laufende Worklets weiter', async () => {
    const { engine, worklets } = createHarness()
    await engine.start(single({ kind: 'rain' }), 0.18)
    engine.setSoundMacros({ warmth: 1, softness: 0.8, airiness: 0.2, movement: 0.6 })
    expect(worklets[0].port.postMessage).toHaveBeenCalledWith({
      macros: { warmth: 1, softness: 0.8, airiness: 0.2, movement: 0.6 },
    })
  })

  it('reicht begrenzte Drone-Filter- und LFO-Werte live an alle Worklets weiter', async () => {
    const { engine, worklets } = createHarness()
    await engine.start({
      primary: { sound: { kind: 'drone' }, volume: 1 },
      secondary: { sound: { kind: 'rain' }, volume: 0.25 },
    }, 0.18)
    engine.setDroneSettings({
      filterMode: 'highpass',
      cutoff: 99,
      resonance: -2,
      lfoRate: Number.NaN,
      lfoDepth: 0.34,
    })
    const message = {
      droneSettings: {
        filterMode: 'highpass',
        cutoff: 1,
        resonance: 0,
        lfoRate: DEFAULT_DRONE_SETTINGS.lfoRate,
        lfoDepth: 0.34,
      },
    }
    expect(worklets[0].port.postMessage).toHaveBeenCalledWith(message)
    expect(worklets[1].port.postMessage).toHaveBeenCalledWith(message)
  })

  it('mischt einen kurzen Raum und sanfte Tape-Kompression konservativ ein', async () => {
    const { engine, contexts } = createHarness()
    engine.setSoundEffects({ room: 0.25, tape: 0.2 })
    await engine.start(single({ kind: 'rain' }), 0.18)
    const context = contexts[0]
    expect(context.buffers[0].channels).toHaveLength(2)
    expect(context.delays[0].delayTime.value).toBeCloseTo(0.018)
    expect(context.filters[0].frequency.value).toBe(5_600)
    expect(context.gains[4].gain.value).toBeCloseTo(0.985)
    expect(context.gains[5].gain.value).toBeCloseTo(0.07)
    expect(context.waveShapers[0].curve?.[0]).toBeCloseTo(-1)
    expect(context.tapeCompressor.ratio.value).toBeCloseTo(1.36)

    engine.setSoundEffects({ room: 99, tape: -1 })
    expect(context.gains[5].gain.value).toBeCloseTo(0.28)
    expect(context.tapeCompressor.ratio.value).toBe(1)
  })

  it('setzt einen begrenzten globalen Notch und erzeugt den Tuner sehr leise', async () => {
    const { engine, contexts } = createHarness()
    engine.setTinnitusSettings({ notchEnabled: true, frequency: 99_000, notchWidth: 1 })
    await engine.startTunerTone(6_000)
    const context = contexts[0]
    expect(context.filters[1].type).toBe('notch')
    expect(context.filters[1].frequency.value).toBe(12_000)
    expect(context.filters[1].Q.value).toBeCloseTo(Math.SQRT2)
    expect(context.oscillators[0].frequency.value).toBe(6_000)
    expect(context.gains[6].gain.value).toBeCloseTo(0.012)

    engine.setTunerFrequency(7_250)
    expect(context.oscillators[0].frequency.value).toBe(7_250)
    await engine.stopTunerTone()
    expect(context.oscillators[0].stop).toHaveBeenCalledOnce()
    expect(context.gains[6].disconnect).toHaveBeenCalledOnce()
  })

  it('erzeugt einen sehr leisen Abschlussklang und räumt ihn auf', async () => {
    const delay = vi.fn(async () => undefined)
    const { engine, contexts } = createHarness({ delay })
    await engine.start(single({ kind: 'brown' }), 0.18)
    await engine.playCompletionCue(0.18)
    const cueOscillator = contexts[0].oscillators[0]
    const cueGain = contexts[0].gains[6]
    expect(cueOscillator.frequency.value).toBe(392)
    expect(cueGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(expect.closeTo(0.009072), 1.35)
    expect(cueGain.gain.value).toBe(0)
    expect(delay).toHaveBeenCalledWith(1_700)
    expect(cueGain.disconnect).toHaveBeenCalledOnce()
  })

  it('ruft resume synchron aus der Benutzeraktion auf', async () => {
    const { engine, contexts } = createHarness()
    const start = engine.start(single({ kind: 'brown' }), 0.18)
    expect(contexts[0].resume).toHaveBeenCalledOnce()
    await start
  })

  it('meldet eine unerwartete iOS-Unterbrechung und setzt den Master stumm', async () => {
    const context = new FakeAudioContext()
    const interrupted = vi.fn()
    const { engine } = createHarness({ context })
    engine.setInterruptionHandler(interrupted)
    await engine.start(single({ kind: 'sea' }), 0.18)
    context.interrupt()
    expect(interrupted).toHaveBeenCalledOnce()
    expect(context.gain.gain.value).toBe(0)
    await engine.start(single({ kind: 'sea' }), 0.18)
    expect(context.resume).toHaveBeenCalledTimes(2)
  })

  it('meldet eine absichtliche Pause nicht als Unterbrechung', async () => {
    const interrupted = vi.fn()
    const { engine } = createHarness()
    engine.setInterruptionHandler(interrupted)
    await engine.start(single({ kind: 'pink' }), 0.18)
    await engine.pause()
    expect(interrupted).not.toHaveBeenCalled()
  })

  it('schließt bei wiederholtem Start/Stop jede Sitzung und beide Ebenen', async () => {
    const { engine, contexts } = createHarness()
    for (let index = 0; index < 5; index += 1) {
      await engine.start({
        primary: { sound: { kind: 'binaural', difference: 8 }, volume: 1 },
        secondary: { sound: { kind: 'white' }, volume: 0.3 },
      }, 0.18)
      await engine.stop()
    }
    expect(contexts).toHaveLength(5)
    expect(contexts.every((context) => context.close.mock.calls.length === 1)).toBe(true)
  })

  it('schließt bei verweigerter Browserfreigabe den Context', async () => {
    const context = new FakeAudioContext()
    context.resume.mockRejectedValueOnce(new Error('NotAllowedError'))
    const { engine } = createHarness({ context })
    await expect(engine.start(single({ kind: 'brown' }), 0.18)).rejects.toBeInstanceOf(AudioEngineError)
    expect(context.close).toHaveBeenCalledOnce()
  })
})
