import type { BinauralDifference, Sound, SoundKind } from './audio/types'

export interface SoundOption {
  kind: SoundKind
  label: string
  shortLabel: string
  description: string
  color: string
}

export const SOUND_OPTIONS: readonly SoundOption[] = [
  { kind: 'brown', label: 'Braunes Rauschen', shortLabel: 'Brown', description: 'Tief und weich', color: 'warm' },
  { kind: 'pink', label: 'Rosa Rauschen', shortLabel: 'Pink', description: 'Sanft und ausgewogen', color: 'rose' },
  { kind: 'white', label: 'Weißes Rauschen', shortLabel: 'White', description: 'Hell und gleichmäßig', color: 'white' },
  { kind: 'binaural', label: 'Binaurale Klänge', shortLabel: 'Binaural', description: 'Zwei Töne · mit Kopfhörern', color: 'blue' },
  { kind: 'sea', label: 'Sanftes Meer', shortLabel: 'Meer', description: 'Langsame, weiche Wellen', color: 'sea' },
  { kind: 'coast', label: 'Offene Küste', shortLabel: 'Küste', description: 'Weite, überlagerte Brandung', color: 'coast' },
  { kind: 'cove', label: 'Geschützte Bucht', shortLabel: 'Bucht', description: 'Dunkles, langsames Wasser', color: 'cove' },
  { kind: 'wind', label: 'Leichter Wind', shortLabel: 'Wind', description: 'Ruhig und luftig', color: 'wind' },
  { kind: 'rain', label: 'Sanfter Regen', shortLabel: 'Regen', description: 'Weicher, gleichmäßiger Regen', color: 'rain' },
  { kind: 'thunder', label: 'Fernes Gewitter', shortLabel: 'Gewitter', description: 'Tiefe Rollen ohne Knall', color: 'thunder' },
  { kind: 'night', label: 'Nachtluft', shortLabel: 'Nacht', description: 'Dunkle Luft und ferne Töne', color: 'night' },
  { kind: 'drone', label: 'Warmer Drone', shortLabel: 'Drone', description: 'Tief und schwebend', color: 'drone' },
  { kind: 'space', label: 'Schwebende Fläche', shortLabel: 'Fläche', description: 'Hell, langsam und offen', color: 'space' },
]

export const soundForKind = (kind: SoundKind, difference: BinauralDifference): Sound =>
  kind === 'binaural' ? { kind, difference } : { kind }

export const soundLabel = (sound: Sound): string => {
  const option = SOUND_OPTIONS.find(({ kind }) => kind === sound.kind)
  return sound.kind === 'binaural'
    ? `${option?.shortLabel ?? 'Binaural'} ${sound.difference} Hz`
    : option?.shortLabel ?? sound.kind
}
