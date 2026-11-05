import { BINAURAL_BASE_HZ, BINAURAL_DIFFERENCES, BINAURAL_PARTIAL_RATIOS } from './types'
import type { BinauralDifference, DroneSettings, SoundMacros } from './types'

export interface SoundSource {
  output: AudioNode
  setMacros?(macros: SoundMacros): void
  setDroneSettings?(settings: DroneSettings): void
  dispose(): void
}

const PARTIAL_LEVELS = [0.112, 0.026, 0.016, 0.006] as const

/** Quiet sine partials, paired with the same interaural difference and kept strictly stereo. */
export function createBinauralSource(context: BaseAudioContext, difference: BinauralDifference): SoundSource {
  if (!BINAURAL_DIFFERENCES.includes(difference)) {
    throw new RangeError('Unbekannter Frequenzabstand.')
  }

  const nodes: AudioNode[] = []
  const started: OscillatorNode[] = []
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    for (const oscillator of started) oscillator.stop()
    for (const node of nodes) node.disconnect()
  }

  try {
    const output = context.createGain()
    nodes.push(output)
    output.gain.value = 1

    BINAURAL_PARTIAL_RATIOS.forEach((ratio, index) => {
      const left = context.createOscillator()
      nodes.push(left)
      const right = context.createOscillator()
      nodes.push(right)
      const stereo = context.createChannelMerger(2)
      nodes.push(stereo)
      const partialGain = context.createGain()
      nodes.push(partialGain)

      const leftFrequency = BINAURAL_BASE_HZ * ratio
      left.type = right.type = 'sine'
      left.frequency.value = leftFrequency
      right.frequency.value = leftFrequency + difference
      left.connect(stereo, 0, 0)
      right.connect(stereo, 0, 1)
      stereo.connect(partialGain)
      partialGain.gain.value = PARTIAL_LEVELS[index]
      partialGain.connect(output)
      left.start(context.currentTime)
      started.push(left)
      right.start(context.currentTime)
      started.push(right)
    })

    // The partial gains sum to the former 0.16 sine level, so the richer tone
    // keeps the same conservative headroom before master and limiter.
    return { output, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}
