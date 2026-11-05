import type {
  AudioMix,
  BinauralDifference,
  DroneFilterMode,
  DroneSettings,
  Sound,
  SoundEffects,
  SoundKind,
  SoundMacros,
  TinnitusSettings,
} from './audio/types'
import { normalizeTinnitusSettings } from './audio/tinnitus-tools'
import { normalizeSessionPlan } from './session-plan'
import type { SessionPlan } from './session-plan'

export const FAVORITES_STORAGE_KEY = 'bliss-favorites-v4'
export const LAST_SETUP_STORAGE_KEY = 'bliss-last-setup-v3'
export const MAX_FAVORITES = 12

export interface SavedSetup {
  mix: AudioMix
  masterVolume: number
  timerMinutes: number
  macros: SoundMacros
  effects: SoundEffects
  droneSettings: DroneSettings
  tinnitusSettings: TinnitusSettings
  sessionPlan: SessionPlan
}

export interface FavoritePreset extends SavedSetup {
  id: string
  name: string
  quickSlot?: 1 | 2 | 3
}

const soundKinds: readonly SoundKind[] = [
  'brown', 'pink', 'white', 'binaural', 'sea', 'coast', 'cove', 'wind',
  'rain', 'thunder', 'night', 'drone', 'space',
]
const differences: readonly BinauralDifference[] = [4, 8, 12]
const timerOptions = [0, 5, 10, 20, 30]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isSound = (value: unknown): value is Sound => {
  if (!isRecord(value) || !soundKinds.includes(value.kind as SoundKind)) return false
  return value.kind !== 'binaural' || differences.includes(value.difference as BinauralDifference)
}

const isLayer = (value: unknown): value is AudioMix['primary'] =>
  isRecord(value) && isSound(value.sound) && typeof value.volume === 'number' &&
  Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 1

const isMix = (value: unknown): value is AudioMix =>
  isRecord(value) && isLayer(value.primary) &&
  (value.secondary === undefined || isLayer(value.secondary))

const isUnitNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1

const macrosFrom = (value: unknown): SoundMacros | null => {
  if (!isRecord(value) || !isUnitNumber(value.warmth) || !isUnitNumber(value.softness) ||
      !isUnitNumber(value.airiness) || !isUnitNumber(value.movement)) {
    return null
  }
  return {
    warmth: value.warmth,
    softness: value.softness,
    airiness: value.airiness,
    movement: value.movement,
  }
}

const effectsFrom = (value: unknown): SoundEffects | null => {
  if (!isRecord(value) || !isUnitNumber(value.room) || !isUnitNumber(value.tape)) {
    return null
  }
  return { room: value.room, tape: value.tape }
}

const filterModes: readonly DroneFilterMode[] = ['lowpass', 'bandpass', 'highpass']

const droneSettingsFrom = (value: unknown): DroneSettings | null => {
  if (!isRecord(value) || !filterModes.includes(value.filterMode as DroneFilterMode) ||
      !isUnitNumber(value.cutoff) || !isUnitNumber(value.resonance) ||
      !isUnitNumber(value.lfoRate) || !isUnitNumber(value.lfoDepth)) return null
  return {
    filterMode: value.filterMode as DroneFilterMode,
    cutoff: value.cutoff,
    resonance: value.resonance,
    lfoRate: value.lfoRate,
    lfoDepth: value.lfoDepth,
  }
}

const tinnitusSettingsFrom = (value: unknown): TinnitusSettings | null => {
  if (!isRecord(value) || typeof value.notchEnabled !== 'boolean' ||
      typeof value.frequency !== 'number' || typeof value.notchWidth !== 'number') return null
  const normalized = normalizeTinnitusSettings(value as unknown as TinnitusSettings)
  return normalized.frequency === value.frequency && normalized.notchWidth === value.notchWidth
    ? normalized
    : null
}

const setupFrom = (value: unknown): SavedSetup | null => {
  if (!isRecord(value) || !isMix(value.mix) || !isUnitNumber(value.masterVolume) ||
      typeof value.timerMinutes !== 'number' || !timerOptions.includes(value.timerMinutes)) return null
  const macros = macrosFrom(value.macros)
  const effects = effectsFrom(value.effects)
  const droneSettings = droneSettingsFrom(value.droneSettings)
  const tinnitusSettings = tinnitusSettingsFrom(value.tinnitusSettings)
  if (!macros || !effects || !droneSettings || !tinnitusSettings || !isRecord(value.sessionPlan)) return null
  return {
    mix: value.mix,
    masterVolume: value.masterVolume,
    timerMinutes: value.timerMinutes,
    macros,
    effects,
    droneSettings,
    tinnitusSettings,
    sessionPlan: normalizeSessionPlan(value.sessionPlan as Partial<SessionPlan>),
  }
}

const favoriteFrom = (value: unknown): FavoritePreset | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null
  const setup = setupFrom(value)
  if (!setup) return null
  const quickSlot = value.quickSlot === 1 || value.quickSlot === 2 || value.quickSlot === 3
    ? value.quickSlot
    : undefined
  return { id: value.id, name: value.name.slice(0, 60), ...setup, ...(quickSlot ? { quickSlot } : {}) }
}

export function loadFavorites(storage: Pick<Storage, 'getItem'> = localStorage): FavoritePreset[] {
  try {
    const stored = storage.getItem(FAVORITES_STORAGE_KEY)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed)
      ? parsed.map(favoriteFrom).filter((favorite): favorite is FavoritePreset => Boolean(favorite)).slice(0, MAX_FAVORITES)
      : []
  } catch {
    return []
  }
}

export function saveFavorites(
  favorites: readonly FavoritePreset[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): boolean {
  try {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites.slice(0, MAX_FAVORITES)))
    return true
  } catch {
    return false
  }
}

export function loadLastSetup(storage: Pick<Storage, 'getItem'> = localStorage): SavedSetup | null {
  try {
    const stored = storage.getItem(LAST_SETUP_STORAGE_KEY)
    return stored ? setupFrom(JSON.parse(stored) as unknown) : null
  } catch {
    return null
  }
}

export function saveLastSetup(
  setup: SavedSetup,
  storage: Pick<Storage, 'setItem'> = localStorage,
): boolean {
  try {
    storage.setItem(LAST_SETUP_STORAGE_KEY, JSON.stringify(setup))
    return true
  } catch {
    return false
  }
}

export function serializeFavorites(favorites: readonly FavoritePreset[]): string {
  return JSON.stringify({ format: 'bliss-favorites', version: 4, favorites: favorites.slice(0, MAX_FAVORITES) }, null, 2)
}

export function parseFavoritesImport(serialized: string): FavoritePreset[] {
  const parsed: unknown = JSON.parse(serialized)
  const values = isRecord(parsed) && parsed.format === 'bliss-favorites' && parsed.version === 4 &&
    Array.isArray(parsed.favorites) ? parsed.favorites : null
  if (!values) throw new Error('Unbekanntes Favoritenformat')
  const favorites = values
    .map(favoriteFrom)
    .filter((favorite): favorite is FavoritePreset => Boolean(favorite))
    .slice(0, MAX_FAVORITES)
  if (favorites.length === 0 && values.length > 0) throw new Error('Keine gültigen Favoriten')
  return favorites
}

export const favoriteSetup = (favorite: FavoritePreset): SavedSetup => ({
  mix: favorite.mix,
  masterVolume: favorite.masterVolume,
  timerMinutes: favorite.timerMinutes,
  macros: favorite.macros,
  effects: favorite.effects,
  droneSettings: favorite.droneSettings,
  tinnitusSettings: favorite.tinnitusSettings,
  sessionPlan: favorite.sessionPlan,
})
