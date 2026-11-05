import { describe, expect, it } from 'vitest'
import {
  loadReflectionEntries,
  MAX_REFLECTION_ENTRIES,
  REFLECTION_STORAGE_KEY,
  saveReflectionEntries,
  serializeReflectionEntries,
} from './reflection'
import type { ReflectionEntry } from './reflection'

const entry: ReflectionEntry = {
  id: 'one',
  createdAt: '2026-11-05T10:00:00.000Z',
  promptId: 'present',
  prompt: 'Was ist gerade da?',
  text: 'Ich brauche einen ruhigen Moment.',
  strain: 4,
}

describe('lokales Reflexionsjournal', () => {
  it('speichert und lädt gültige Einträge', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    expect(saveReflectionEntries([entry], storage)).toBe(true)
    expect(values.has(REFLECTION_STORAGE_KEY)).toBe(true)
    expect(loadReflectionEntries(storage)).toEqual([entry])
  })

  it('verwirft beschädigte und ungültige Einträge', () => {
    const storage = {
      getItem: () => JSON.stringify([
        entry,
        { ...entry, id: 'empty', text: '   ' },
        { ...entry, id: 'strain', strain: 12 },
        { ...entry, id: 'date', createdAt: 'kein-datum' },
      ]),
    }
    expect(loadReflectionEntries(storage)).toEqual([entry])
  })

  it('begrenzt die lokale Historie und exportiert ein versioniertes Format', () => {
    const entries = Array.from({ length: MAX_REFLECTION_ENTRIES + 5 }, (_, index) => ({
      ...entry,
      id: String(index),
    }))
    const exported = JSON.parse(serializeReflectionEntries(entries)) as { version: number; entries: unknown[] }
    expect(exported.version).toBe(1)
    expect(exported.entries).toHaveLength(MAX_REFLECTION_ENTRIES)
  })

  it('meldet blockierten Gerätespeicher ohne Ausnahme', () => {
    expect(saveReflectionEntries([entry], { setItem: () => { throw new Error('blocked') } })).toBe(false)
    expect(loadReflectionEntries({ getItem: () => '{kaputt' })).toEqual([])
  })
})
