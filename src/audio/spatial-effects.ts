import { DEFAULT_SOUND_EFFECTS } from './types'
import type { SoundEffects } from './types'

const clampUnit = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback

export const normalizeSoundEffects = (effects: SoundEffects): SoundEffects => ({
  room: clampUnit(effects.room, DEFAULT_SOUND_EFFECTS.room),
  tape: clampUnit(effects.tape, DEFAULT_SOUND_EFFECTS.tape),
})

export function createTapeCurve(amount: number, sampleCount = 2_048): Float32Array<ArrayBuffer> {
  const safeAmount = clampUnit(amount, DEFAULT_SOUND_EFFECTS.tape)
  const safeCount = Math.max(32, Math.round(sampleCount))
  const drive = 1 + safeAmount * 1.8
  const normalization = Math.tanh(drive)
  const curve = new Float32Array(safeCount)
  for (let index = 0; index < safeCount; index += 1) {
    const input = index / (safeCount - 1) * 2 - 1
    curve[index] = Math.tanh(input * drive) / normalization
  }
  return curve
}

const seededNoise = (initialSeed: number) => {
  let seed = initialSeed >>> 0
  return () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 0xffffffff * 2 - 1
  }
}

export function createRoomImpulseData(
  sampleRate: number,
  durationSeconds = 1.25,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const safeRate = Number.isFinite(sampleRate) ? Math.max(8_000, Math.min(192_000, sampleRate)) : 48_000
  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(0.45, Math.min(2, durationSeconds))
    : 1.25
  const length = Math.max(1, Math.round(safeRate * safeDuration))
  const channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [
    new Float32Array(length),
    new Float32Array(length),
  ]

  channels.forEach((channel, channelIndex) => {
    const random = seededNoise(channelIndex === 0 ? 0x5f3759df : 0x6c8e9cf5)
    let smoothed = 0
    let energy = 0
    for (let index = 0; index < length; index += 1) {
      const seconds = index / safeRate
      if (seconds < 0.014) continue
      const progress = seconds / safeDuration
      const noise = random()
      const smoothing = 0.12 + (1 - progress) * 0.16
      smoothed += (noise - smoothed) * smoothing
      const diffuse = noise * 0.42 + smoothed * 0.58
      const onset = Math.min(1, (seconds - 0.014) / 0.035)
      const decay = Math.exp(-5.1 * progress)
      const value = diffuse * onset * decay
      channel[index] = value
      energy += value * value
    }

    // Fixed energy keeps the wet path predictable across sample rates and devices.
    const scale = energy > 0 ? 0.48 / Math.sqrt(energy) : 0
    for (let index = 0; index < length; index += 1) channel[index] *= scale
  })

  return channels
}
