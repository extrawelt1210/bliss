import { describe, expect, it, vi } from 'vitest'
import {
  FAVORITES_STORAGE_KEY,
  LAST_SETUP_STORAGE_KEY,
  loadFavorites,
  loadLastSetup,
  MAX_FAVORITES,
  parseFavoritesImport,
  saveFavorites,
  saveLastSetup,
  serializeFavorites,
} from './favorites'
import type { FavoritePreset, SavedSetup } from './favorites'

const setup: SavedSetup = {
  mix: { primary: { sound: { kind: 'rain' }, volume: 0.75 } },
  masterVolume: 0.16,
  timerMinutes: 20,
  macros: { warmth: 0.7, softness: 0.8, airiness: 0.2, movement: 0.3 },
  effects: { room: 0.22, tape: 0.18 },
  droneSettings: { filterMode: 'bandpass', cutoff: 0.46, resonance: 0.2, lfoRate: 0.3, lfoDepth: 0.18 },
  tinnitusSettings: { notchEnabled: true, frequency: 6_000, notchWidth: 1 },
  sessionPlan: { enabled: true, settleMinutes: 2, soundMinutes: 15, fadeMinutes: 3, silentEnd: true },
}

const favorite = (id = 'abend'): FavoritePreset => ({ id, name: 'Ruhiger Abend', quickSlot: 1, ...setup })

describe('lokale Favoriten und letzte Mischung', () => {
  it('liest vollständige Favoriten der aktuellen Version', () => {
    const storage = { getItem: vi.fn((key: string) => key === FAVORITES_STORAGE_KEY ? JSON.stringify([favorite()]) : null) }
    expect(loadFavorites(storage)).toEqual([favorite()])
  })

  it('ignoriert alte unvollständige Favoriten ohne Abwärtskompatibilität', () => {
    const oldFavorite = {
      id: 'alt',
      name: 'Alter Favorit',
      mix: { primary: { sound: { kind: 'brown' }, volume: 1 } },
      masterVolume: 0.18,
      timerMinutes: 0,
    }
    const storage = { getItem: vi.fn(() => JSON.stringify([oldFavorite])) }
    expect(loadFavorites(storage)).toEqual([])
  })

  it('verwirft ungültige Einträge und begrenzt die Liste', () => {
    const values = [
      ...Array.from({ length: MAX_FAVORITES + 4 }, (_, index) => favorite(String(index))),
      { nope: true },
    ]
    const storage = { getItem: vi.fn(() => JSON.stringify(values)) }
    expect(loadFavorites(storage)).toHaveLength(MAX_FAVORITES)
  })

  it('speichert Favoriten und behandelt blockierten Speicher ohne Absturz', () => {
    const setItem = vi.fn()
    expect(saveFavorites([favorite()], { setItem })).toBe(true)
    expect(setItem).toHaveBeenCalledWith(FAVORITES_STORAGE_KEY, expect.stringContaining('Ruhiger Abend'))

    expect(saveFavorites([favorite()], { setItem: () => { throw new Error('blocked') } })).toBe(false)
  })

  it('speichert und lädt die letzte Mischung lokal', () => {
    let value: string | null = null
    const storage = {
      getItem: vi.fn((key: string) => key === LAST_SETUP_STORAGE_KEY ? value : null),
      setItem: vi.fn((_key: string, next: string) => { value = next }),
    }
    expect(saveLastSetup(setup, storage)).toBe(true)
    expect(loadLastSetup(storage)).toEqual(setup)
  })

  it('exportiert und importiert die versionierte JSON-Datei', () => {
    const serialized = serializeFavorites([favorite()])
    expect(JSON.parse(serialized)).toMatchObject({ format: 'bliss-favorites', version: 4 })
    expect(parseFavoritesImport(serialized)).toEqual([favorite()])
  })

  it('lehnt unbekannte oder ausschließlich ungültige Importdaten ab', () => {
    expect(() => parseFavoritesImport('{"unknown":[]}')).toThrow('Unbekanntes Favoritenformat')
    expect(() => parseFavoritesImport(JSON.stringify([favorite('alt')]))).toThrow('Unbekanntes Favoritenformat')
    expect(() => parseFavoritesImport(JSON.stringify({
      format: 'bliss-favorites',
      version: 4,
      favorites: [{ nope: true }],
    }))).toThrow('Keine gültigen Favoriten')
    expect(() => parseFavoritesImport('kein json')).toThrow()
  })
})
