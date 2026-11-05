export const REFLECTION_STORAGE_KEY = 'bliss-reflections-v1'
export const MAX_REFLECTION_ENTRIES = 200
export const MAX_REFLECTION_LENGTH = 4_000

export interface ReflectionPrompt {
  id: string
  text: string
}

export interface ReflectionEntry {
  id: string
  createdAt: string
  promptId: string
  prompt: string
  text: string
  strain: number | null
}

export const REFLECTION_PROMPTS: readonly ReflectionPrompt[] = [
  { id: 'present', text: 'Was ist gerade da, ohne dass du es verändern musst?' },
  { id: 'need', text: 'Was würde dir für die nächste kleine Weile guttun?' },
  { id: 'lighter', text: 'Was darf heute ein wenig leichter werden?' },
  { id: 'body', text: 'Was bemerkst du gerade in deinem Körper?' },
  { id: 'kindness', text: 'Wie könntest du heute freundlich mit dir umgehen?' },
  { id: 'open', text: 'Freie Notiz' },
] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const entryFrom = (value: unknown): ReflectionEntry | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.createdAt !== 'string' ||
      typeof value.promptId !== 'string' || typeof value.prompt !== 'string' || typeof value.text !== 'string') {
    return null
  }
  if (Number.isNaN(Date.parse(value.createdAt)) || value.text.trim().length === 0 ||
      value.text.length > MAX_REFLECTION_LENGTH) return null
  const strain = value.strain === null
    ? null
    : typeof value.strain === 'number' && Number.isInteger(value.strain) && value.strain >= 0 && value.strain <= 10
      ? value.strain
      : undefined
  if (strain === undefined) return null
  return {
    id: value.id.slice(0, 120),
    createdAt: value.createdAt,
    promptId: value.promptId.slice(0, 80),
    prompt: value.prompt.slice(0, 240),
    text: value.text,
    strain,
  }
}

export function loadReflectionEntries(
  storage: Pick<Storage, 'getItem'> = localStorage,
): ReflectionEntry[] {
  try {
    const stored = storage.getItem(REFLECTION_STORAGE_KEY)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed)
      ? parsed
        .map(entryFrom)
        .filter((entry): entry is ReflectionEntry => Boolean(entry))
        .slice(0, MAX_REFLECTION_ENTRIES)
      : []
  } catch {
    return []
  }
}

export function saveReflectionEntries(
  entries: readonly ReflectionEntry[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): boolean {
  try {
    storage.setItem(REFLECTION_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_REFLECTION_ENTRIES)))
    return true
  } catch {
    return false
  }
}

export function serializeReflectionEntries(entries: readonly ReflectionEntry[]): string {
  return JSON.stringify({
    format: 'bliss-reflections',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: entries.slice(0, MAX_REFLECTION_ENTRIES),
  }, null, 2)
}
