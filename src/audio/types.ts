export type NoiseKind = 'brown' | 'pink' | 'white'
export type SoundscapeKind =
  | 'sea'
  | 'coast'
  | 'cove'
  | 'wind'
  | 'rain'
  | 'thunder'
  | 'night'
  | 'drone'
  | 'space'
export type GeneratedSoundKind = NoiseKind | SoundscapeKind
export type SoundKind = GeneratedSoundKind | 'binaural'
export type BinauralDifference = 4 | 8 | 12
export type Sound = { kind: GeneratedSoundKind } | { kind: 'binaural'; difference: BinauralDifference }

export type AudioLayerId = 'primary' | 'secondary'

export interface AudioLayerSettings {
  sound: Sound
  volume: number
}

export interface AudioMix {
  primary: AudioLayerSettings
  secondary?: AudioLayerSettings
}

export interface SoundMacros {
  warmth: number
  softness: number
  airiness: number
  movement: number
}

export interface SoundEffects {
  room: number
  tape: number
}

export interface TinnitusSettings {
  notchEnabled: boolean
  frequency: number
  notchWidth: number
}

export type DroneFilterMode = 'lowpass' | 'bandpass' | 'highpass'

export interface DroneSettings {
  filterMode: DroneFilterMode
  cutoff: number
  resonance: number
  lfoRate: number
  lfoDepth: number
}

export const DEFAULT_SOUND_MACROS: Readonly<SoundMacros> = {
  warmth: 0.5,
  softness: 0.5,
  airiness: 0.35,
  movement: 0.35,
}

export const DEFAULT_SOUND_EFFECTS: Readonly<SoundEffects> = {
  room: 0.16,
  tape: 0.14,
}

export const DEFAULT_DRONE_SETTINGS: Readonly<DroneSettings> = {
  filterMode: 'lowpass',
  cutoff: 0.52,
  resonance: 0.18,
  lfoRate: 0.24,
  lfoDepth: 0.16,
}

export const BINAURAL_DIFFERENCES: readonly BinauralDifference[] = [4, 8, 12]
export const BINAURAL_BASE_HZ = 200
export const BINAURAL_PARTIAL_RATIOS = [1, 1.5, 2, 3] as const

export type PlaybackState = 'stopped' | 'playing' | 'paused'

export interface AudioEngine {
  start(mix: AudioMix, volume: number): Promise<void>
  pause(): Promise<void>
  stop(): Promise<void>
  setVolume(volume: number, fadeSeconds?: number): void
  setLayerSound(layer: AudioLayerId, sound: Sound | null): Promise<void>
  setLayerVolume(layer: AudioLayerId, volume: number): void
  setSoundMacros(macros: SoundMacros): void
  setSoundEffects(effects: SoundEffects): void
  setDroneSettings(settings: DroneSettings): void
  setTinnitusSettings(settings: TinnitusSettings): void
  startTunerTone(frequency: number): Promise<void>
  setTunerFrequency(frequency: number): void
  stopTunerTone(): Promise<void>
  playCompletionCue(volume: number): Promise<void>
  setInterruptionHandler(handler: (() => void) | null): void
  dispose(): Promise<void>
}
