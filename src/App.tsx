import { useEffect, useRef, useState } from 'react'
import { AudioEngineError, WebAudioEngine } from './audio/WebAudioEngine'
import { droneCutoffHz, droneLfoRateHz } from './audio/drone-filter'
import {
  DEFAULT_TINNITUS_SETTINGS,
  tinnitusFrequencyFromPosition,
  tinnitusPositionFromFrequency,
} from './audio/tinnitus-tools'
import {
  BINAURAL_BASE_HZ,
  BINAURAL_DIFFERENCES,
  BINAURAL_PARTIAL_RATIOS,
  DEFAULT_DRONE_SETTINGS,
  DEFAULT_SOUND_EFFECTS,
  DEFAULT_SOUND_MACROS,
} from './audio/types'
import type {
  AudioEngine,
  AudioLayerId,
  AudioMix,
  BinauralDifference,
  DroneFilterMode,
  DroneSettings,
  PlaybackState,
  Sound,
  SoundEffects,
  SoundKind,
  SoundMacros,
  TinnitusSettings,
} from './audio/types'
import {
  favoriteSetup,
  loadFavorites,
  loadLastSetup,
  MAX_FAVORITES,
  parseFavoritesImport,
  saveFavorites,
  saveLastSetup,
  serializeFavorites,
} from './favorites'
import type { FavoritePreset, SavedSetup } from './favorites'
import {
  DEFAULT_SESSION_PLAN,
  normalizeSessionPlan,
  SESSION_PRESETS,
  sessionPhaseAt,
  sessionPhaseLabel,
  sessionTotalSeconds,
} from './session-plan'
import type { SessionPhase, SessionPlan } from './session-plan'
import { SOUND_OPTIONS, soundForKind, soundLabel } from './sound-catalog'

const DEFAULT_MASTER_VOLUME = 18
const DEFAULT_PRIMARY_VOLUME = 100
const DEFAULT_SECONDARY_VOLUME = 35
const TIMER_OPTIONS = [0, 5, 10, 20, 30] as const
const QUICK_SLOTS = [1, 2, 3] as const

const statusLabels: Record<PlaybackState, string> = {
  stopped: 'Bereit, wenn du es bist',
  playing: 'Klang läuft',
  paused: 'Pausiert',
}

const macroDefinitions: ReadonlyArray<{
  key: keyof SoundMacros
  label: string
  low: string
  high: string
}> = [
  { key: 'warmth', label: 'Wärme', low: 'klar', high: 'warm' },
  { key: 'softness', label: 'Weichheit', low: 'direkt', high: 'weich' },
  { key: 'airiness', label: 'Luftigkeit', low: 'dunkel', high: 'luftig' },
  { key: 'movement', label: 'Bewegung', low: 'ruhig', high: 'lebendig' },
]

const effectDefinitions: ReadonlyArray<{
  key: keyof SoundEffects
  label: string
  low: string
  high: string
}> = [
  { key: 'room', label: 'Raumgefühl', low: 'trocken', high: 'weit' },
  { key: 'tape', label: 'Tape-Sättigung', low: 'sauber', high: 'warm' },
]

const filterModes: ReadonlyArray<{ mode: DroneFilterMode; short: string; label: string }> = [
  { mode: 'lowpass', short: 'LP', label: 'Tiefpass' },
  { mode: 'bandpass', short: 'BP', label: 'Bandpass' },
  { mode: 'highpass', short: 'HP', label: 'Hochpass' },
]

type DroneValueKey = 'cutoff' | 'resonance' | 'lfoRate' | 'lfoDepth'
type DroneControlState = Record<DroneValueKey, number> & { filterMode: DroneFilterMode }

interface AppProps {
  engine?: AudioEngine
}

interface BinauralSettingsProps {
  idPrefix: string
  difference: BinauralDifference
  disabled: boolean
  onChange: (difference: BinauralDifference) => void
}

function BinauralSettings({ idPrefix, difference, disabled, onChange }: BinauralSettingsProps) {
  const hintId = `${idPrefix}-headphone-hint`
  return (
    <section className="binaural-settings" aria-labelledby={`${idPrefix}-heading`}>
      <h3 id={`${idPrefix}-heading`}>Ein Ton für jedes Ohr</h3>
      <p id={hintId}>Nutze Stereo-Kopfhörer und schalte Mono-Audio aus, damit beide Ohren getrennte Töne hören.</p>
      <fieldset className="beat-options" disabled={disabled} aria-describedby={hintId}>
        <legend>Frequenzabstand</legend>
        <div className="beat-options__choices">
          {BINAURAL_DIFFERENCES.map((beat) => (
            <label className={`beat-option${difference === beat ? ' is-selected' : ''}`} key={beat}>
              <input
                className="option-input"
                type="radio"
                name={`${idPrefix}-difference`}
                value={beat}
                checked={difference === beat}
                onChange={() => onChange(beat)}
              />
              <span>{beat} Hz</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="stereo-detail">Grundton: links {BINAURAL_BASE_HZ} Hz · rechts {BINAURAL_BASE_HZ + difference} Hz</p>
      <p className="stereo-detail">
        Leise Teiltöne links: {BINAURAL_PARTIAL_RATIOS.slice(1).map((ratio) => BINAURAL_BASE_HZ * ratio).join(' / ')} Hz · rechts jeweils +{difference} Hz
      </p>
    </section>
  )
}

interface CheckInControlProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
}

function CheckInControl({ label, value, onChange }: CheckInControlProps) {
  return (
    <div className="check-in-control">
      <div className="check-in-control__heading">
        <strong>{label}</strong>
        {value === null ? (
          <button type="button" onClick={() => onChange(5)}>Freiwillig eintragen</button>
        ) : (
          <button type="button" onClick={() => onChange(null)}>Zurücksetzen</button>
        )}
      </div>
      {value !== null && (
        <label>
          <span className="sr-only">{label} von 0 bis 10</span>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={value}
            style={{ '--range-progress': `${value * 10}%` } as React.CSSProperties}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <output>{value} / 10</output>
        </label>
      )}
    </div>
  )
}

const formatTimer = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

const differenceFor = (sound: Sound | undefined): BinauralDifference =>
  sound?.kind === 'binaural' ? sound.difference : 8

const integerMacro = (value: number) => Math.round(value * 100)
const defaultMix: AudioMix = { primary: { sound: { kind: 'brown' }, volume: 1 } }

export function App({ engine: providedEngine }: AppProps) {
  const engineRef = useRef<AudioEngine | null>(null)
  if (!engineRef.current) engineRef.current = providedEngine ?? new WebAudioEngine()
  const engine = engineRef.current

  const [initialSetup] = useState<SavedSetup | null>(() => loadLastSetup())
  const initialMix = initialSetup?.mix ?? defaultMix
  const initialMacros = initialSetup?.macros ?? DEFAULT_SOUND_MACROS
  const initialEffects = initialSetup?.effects ?? DEFAULT_SOUND_EFFECTS
  const initialDroneSettings = initialSetup?.droneSettings ?? DEFAULT_DRONE_SETTINGS
  const initialTinnitusSettings = initialSetup?.tinnitusSettings ?? DEFAULT_TINNITUS_SETTINGS

  const [primaryKind, setPrimaryKind] = useState<SoundKind>(initialMix.primary.sound.kind)
  const [primaryDifference, setPrimaryDifference] = useState<BinauralDifference>(differenceFor(initialMix.primary.sound))
  const [primaryVolume, setPrimaryVolume] = useState(Math.round(initialMix.primary.volume * 100))
  const [secondaryEnabled, setSecondaryEnabled] = useState(Boolean(initialMix.secondary))
  const [secondaryKind, setSecondaryKind] = useState<SoundKind>(initialMix.secondary?.sound.kind ?? 'sea')
  const [secondaryDifference, setSecondaryDifference] = useState<BinauralDifference>(differenceFor(initialMix.secondary?.sound))
  const [secondaryVolume, setSecondaryVolume] = useState(Math.round((initialMix.secondary?.volume ?? 0.35) * 100))
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped')
  const [masterVolume, setMasterVolume] = useState(
    Math.round((initialSetup?.masterVolume ?? DEFAULT_MASTER_VOLUME / 100) * 100),
  )
  const [timerMinutes, setTimerMinutes] = useState<(typeof TIMER_OPTIONS)[number]>(
    (initialSetup?.timerMinutes as (typeof TIMER_OPTIONS)[number]) ?? 0,
  )
  const [macros, setMacros] = useState<Record<keyof SoundMacros, number>>({
    warmth: integerMacro(initialMacros.warmth),
    softness: integerMacro(initialMacros.softness),
    airiness: integerMacro(initialMacros.airiness),
    movement: integerMacro(initialMacros.movement),
  })
  const [effects, setEffects] = useState<Record<keyof SoundEffects, number>>({
    room: integerMacro(initialEffects.room),
    tape: integerMacro(initialEffects.tape),
  })
  const [droneSettings, setDroneSettings] = useState<DroneControlState>({
    filterMode: initialDroneSettings.filterMode,
    cutoff: integerMacro(initialDroneSettings.cutoff),
    resonance: integerMacro(initialDroneSettings.resonance),
    lfoRate: integerMacro(initialDroneSettings.lfoRate),
    lfoDepth: integerMacro(initialDroneSettings.lfoDepth),
  })
  const [tinnitusSettings, setTinnitusSettings] = useState<TinnitusSettings>(initialTinnitusSettings)
  const [tunerPlaying, setTunerPlaying] = useState(false)
  const [sessionPlan, setSessionPlan] = useState<SessionPlan>(() =>
    normalizeSessionPlan(initialSetup?.sessionPlan ?? DEFAULT_SESSION_PLAN),
  )
  const [activeSessionPlan, setActiveSessionPlan] = useState<SessionPlan | null>(null)
  const [sessionPhase, setSessionPhase] = useState<SessionPhase | null>(null)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [breathingEnabled, setBreathingEnabled] = useState(false)
  const [breathPhase, setBreathPhase] = useState('Bereit')
  const [beforeCheckIn, setBeforeCheckIn] = useState<number | null>(null)
  const [afterCheckIn, setAfterCheckIn] = useState<number | null>(null)
  const [sessionBeforeCheckIn, setSessionBeforeCheckIn] = useState<number | null>(null)
  const [favorites, setFavorites] = useState<FavoritePreset[]>(() => loadFavorites())
  const [favoriteName, setFavoriteName] = useState('')
  const [lastSetup, setLastSetup] = useState<SavedSetup | null>(initialSetup)
  const [compactMode, setCompactMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const actionId = useRef(0)
  const inFlight = useRef(false)
  const finishing = useRef(false)

  const primarySound = (): Sound => soundForKind(primaryKind, primaryDifference)
  const secondarySound = (): Sound => soundForKind(secondaryKind, secondaryDifference)
  const currentMix = (): AudioMix => ({
    primary: { sound: primarySound(), volume: primaryVolume / 100 },
    ...(secondaryEnabled ? { secondary: { sound: secondarySound(), volume: secondaryVolume / 100 } } : {}),
  })
  const currentMacros = (): SoundMacros => ({
    warmth: macros.warmth / 100,
    softness: macros.softness / 100,
    airiness: macros.airiness / 100,
    movement: macros.movement / 100,
  })
  const currentEffects = (): SoundEffects => ({
    room: effects.room / 100,
    tape: effects.tape / 100,
  })
  const normalizedDroneSettings = (settings: DroneControlState): DroneSettings => ({
    filterMode: settings.filterMode,
    cutoff: settings.cutoff / 100,
    resonance: settings.resonance / 100,
    lfoRate: settings.lfoRate / 100,
    lfoDepth: settings.lfoDepth / 100,
  })
  const currentDroneSettings = (): DroneSettings => normalizedDroneSettings(droneSettings)
  const currentSetup = (): SavedSetup => ({
    mix: currentMix(),
    masterVolume: masterVolume / 100,
    timerMinutes,
    macros: currentMacros(),
    effects: currentEffects(),
    droneSettings: currentDroneSettings(),
    tinnitusSettings,
    sessionPlan,
  })

  useEffect(() => {
    engine.setInterruptionHandler(() => {
      actionId.current += 1
      inFlight.current = false
      finishing.current = false
      setBusy(false)
      setStopping(false)
      setPlaybackState('paused')
      setNotice('Die Audiowiedergabe wurde vom Gerät unterbrochen. Du kannst sie bewusst fortsetzen.')
    })
    return () => {
      actionId.current += 1
      engine.setInterruptionHandler(null)
      void engine.dispose().catch(() => undefined)
    }
  }, [engine])

  useEffect(() => {
    if (!breathingEnabled || playbackState !== 'playing') {
      setBreathPhase('Bereit')
      return
    }
    setBreathPhase('Einatmen')
    let phaseTimer = window.setTimeout(() => setBreathPhase('Ausatmen'), 4_000)
    const cycleTimer = window.setInterval(() => {
      setBreathPhase('Einatmen')
      window.clearTimeout(phaseTimer)
      phaseTimer = window.setTimeout(() => setBreathPhase('Ausatmen'), 4_000)
    }, 10_000)
    return () => {
      window.clearInterval(cycleTimer)
      window.clearTimeout(phaseTimer)
    }
  }, [breathingEnabled, playbackState])

  useEffect(() => {
    saveLastSetup(currentSetup())
  }, [
    primaryKind, primaryDifference, primaryVolume, secondaryEnabled, secondaryKind,
    secondaryDifference, secondaryVolume, masterVolume, timerMinutes, macros,
    effects, droneSettings, tinnitusSettings, sessionPlan,
  ])

  const showError = (caughtError: unknown) => {
    setPlaybackState('stopped')
    setError(
      caughtError instanceof AudioEngineError
        ? caughtError.message
        : 'Das hat gerade nicht geklappt. Bitte versuche es noch einmal.',
    )
  }

  const runAction = async (
    operation: () => Promise<void>,
    nextState = playbackState,
  ): Promise<boolean> => {
    if (inFlight.current) return false
    inFlight.current = true
    const id = ++actionId.current
    setBusy(true)
    setError(null)
    try {
      await operation()
      if (id === actionId.current) setPlaybackState(nextState)
      return id === actionId.current
    } catch (caughtError) {
      if (id !== actionId.current) return false
      await engine.stop().catch(() => undefined)
      if (id === actionId.current) showError(caughtError)
      return false
    } finally {
      if (id === actionId.current) {
        inFlight.current = false
        setBusy(false)
      }
    }
  }

  const initializeRunningSession = (setup: SavedSetup) => {
    const plan = normalizeSessionPlan(setup.sessionPlan)
    setSessionBeforeCheckIn(beforeCheckIn)
    setAfterCheckIn(null)
    setSessionElapsed(0)
    finishing.current = false
    if (plan.enabled) {
      setActiveSessionPlan(plan)
      setSessionPhase(sessionPhaseAt(plan, 0))
      setRemainingSeconds(sessionTotalSeconds(plan))
    } else {
      setActiveSessionPlan(null)
      setSessionPhase(null)
      setRemainingSeconds(setup.timerMinutes > 0 ? setup.timerMinutes * 60 : null)
    }
    setLastSetup(setup)
    saveLastSetup(setup)
  }

  const startSetup = async (setup: SavedSetup, replaceCurrent = false) => {
    const plan = normalizeSessionPlan(setup.sessionPlan)
    const startVolume = plan.enabled && plan.settleMinutes > 0 ? 0 : setup.masterVolume
    engine.setSoundMacros(setup.macros)
    engine.setSoundEffects(setup.effects)
    engine.setDroneSettings(setup.droneSettings)
    engine.setTinnitusSettings(setup.tinnitusSettings)
    setTunerPlaying(false)
    const started = await runAction(async () => {
      await engine.stopTunerTone()
      if (replaceCurrent && playbackState !== 'stopped') await engine.stop()
      await engine.start(setup.mix, startVolume)
    }, 'playing')
    if (started) initializeRunningSession(setup)
  }

  const resumeVolume = () => {
    if (!activeSessionPlan || !sessionPhase) return masterVolume / 100
    if (sessionPhase === 'settle') return 0
    if (sessionPhase === 'fade' && activeSessionPlan.fadeMinutes > 0 && remainingSeconds !== null) {
      return masterVolume / 100 * Math.min(1, remainingSeconds / (activeSessionPlan.fadeMinutes * 60))
    }
    return masterVolume / 100
  }

  const handlePrimaryAction = async () => {
    setNotice(null)
    if (playbackState === 'playing') {
      await runAction(() => engine.pause(), 'paused')
      return
    }
    if (playbackState === 'paused') {
      engine.setSoundMacros(currentMacros())
      engine.setSoundEffects(currentEffects())
      engine.setDroneSettings(currentDroneSettings())
      engine.setTinnitusSettings(tinnitusSettings)
      setTunerPlaying(false)
      const resumed = await runAction(async () => {
        await engine.stopTunerTone()
        await engine.start(currentMix(), resumeVolume())
      }, 'playing')
      if (resumed && activeSessionPlan && sessionPhase === 'fade' && remainingSeconds !== null) {
        engine.setVolume(0, remainingSeconds)
      }
      return
    }
    await startSetup(currentSetup())
  }

  const handleStop = async (reason: 'manual' | 'timer' | 'session' = 'manual') => {
    const id = ++actionId.current
    inFlight.current = true
    setStopping(true)
    setBusy(true)
    setError(null)
    try {
      await engine.stop()
      if (id !== actionId.current) return
      setPlaybackState('stopped')
      setTunerPlaying(false)
      setRemainingSeconds(null)
      setActiveSessionPlan(null)
      setSessionPhase(null)
      setSessionElapsed(0)
      setNotice(
        reason === 'timer'
          ? 'Der Timer ist ruhig ausgelaufen.'
          : reason === 'session' ? 'Die Sitzung ist sanft beendet.' : null,
      )
    } catch (caughtError) {
      if (id === actionId.current) showError(caughtError)
    } finally {
      if (id === actionId.current) {
        inFlight.current = false
        finishing.current = false
        setStopping(false)
        setBusy(false)
      }
    }
  }

  useEffect(() => {
    if (playbackState !== 'playing' || remainingSeconds === null) return
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => current === null ? null : Math.max(0, current - 1))
      if (activeSessionPlan) setSessionElapsed((current) => current + 1)
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [playbackState, remainingSeconds === null, activeSessionPlan])

  useEffect(() => {
    if (!activeSessionPlan || playbackState !== 'playing') return
    const nextPhase = sessionPhaseAt(activeSessionPlan, sessionElapsed)
    if (nextPhase === sessionPhase) return
    setSessionPhase(nextPhase)
    if (nextPhase === 'sound') engine.setVolume(masterVolume / 100, 4)
    if (nextPhase === 'fade') engine.setVolume(0, activeSessionPlan.fadeMinutes * 60)
  }, [activeSessionPlan, engine, masterVolume, playbackState, sessionElapsed, sessionPhase])

  useEffect(() => {
    if (playbackState !== 'playing' || remainingSeconds !== 0 || finishing.current) return
    finishing.current = true
    void (async () => {
      if (activeSessionPlan && !activeSessionPlan.silentEnd) await engine.playCompletionCue(masterVolume / 100)
      await handleStop(activeSessionPlan ? 'session' : 'timer')
    })()
  }, [activeSessionPlan, engine, playbackState, remainingSeconds])

  const handleSoundChange = (layer: AudioLayerId, kind: SoundKind) => {
    if (inFlight.current) return
    if (layer === 'primary') setPrimaryKind(kind)
    else setSecondaryKind(kind)
    setError(null)
    if (playbackState !== 'stopped') {
      const difference = layer === 'primary' ? primaryDifference : secondaryDifference
      void runAction(() => engine.setLayerSound(layer, soundForKind(kind, difference)))
    }
  }

  const handleDifferenceChange = (layer: AudioLayerId, difference: BinauralDifference) => {
    if (inFlight.current) return
    if (layer === 'primary') setPrimaryDifference(difference)
    else setSecondaryDifference(difference)
    if (playbackState !== 'stopped') {
      void runAction(() => engine.setLayerSound(layer, { kind: 'binaural', difference }))
    }
  }

  const handleLayerVolumeChange = (layer: AudioLayerId, nextVolume: number) => {
    if (layer === 'primary') setPrimaryVolume(nextVolume)
    else setSecondaryVolume(nextVolume)
    engine.setLayerVolume(layer, nextVolume / 100)
  }

  const handleSecondaryToggle = (enabled: boolean) => {
    if (inFlight.current) return
    setSecondaryEnabled(enabled)
    if (playbackState !== 'stopped') {
      void runAction(() => engine.setLayerSound('secondary', enabled ? secondarySound() : null))
    }
  }

  const handleMacroChange = (key: keyof SoundMacros, value: number) => {
    const next = { ...macros, [key]: value }
    setMacros(next)
    engine.setSoundMacros({
      warmth: next.warmth / 100,
      softness: next.softness / 100,
      airiness: next.airiness / 100,
      movement: next.movement / 100,
    })
  }

  const handleEffectChange = (key: keyof SoundEffects, value: number) => {
    const next = { ...effects, [key]: value }
    setEffects(next)
    engine.setSoundEffects({ room: next.room / 100, tape: next.tape / 100 })
  }

  const handleDroneModeChange = (filterMode: DroneFilterMode) => {
    const next = { ...droneSettings, filterMode }
    setDroneSettings(next)
    engine.setDroneSettings(normalizedDroneSettings(next))
  }

  const handleDroneValueChange = (key: DroneValueKey, value: number) => {
    const next = { ...droneSettings, [key]: value }
    setDroneSettings(next)
    engine.setDroneSettings(normalizedDroneSettings(next))
  }

  const updateTinnitusSettings = (next: TinnitusSettings) => {
    setTinnitusSettings(next)
    engine.setTinnitusSettings(next)
    if (tunerPlaying) engine.setTunerFrequency(next.frequency)
  }

  const handleTunerToggle = async () => {
    setError(null)
    if (tunerPlaying) {
      await engine.stopTunerTone()
      setTunerPlaying(false)
      return
    }
    if (playbackState !== 'stopped') await handleStop()
    try {
      await engine.startTunerTone(tinnitusSettings.frequency)
      setTunerPlaying(true)
      setNotice('Sehr leiser Vergleichston aktiv. Stoppe sofort, wenn er unangenehm ist.')
    } catch (caughtError) {
      showError(caughtError)
    }
  }

  const applySoundToState = (layer: AudioLayerId, sound: Sound) => {
    if (layer === 'primary') {
      setPrimaryKind(sound.kind)
      if (sound.kind === 'binaural') setPrimaryDifference(sound.difference)
    } else {
      setSecondaryKind(sound.kind)
      if (sound.kind === 'binaural') setSecondaryDifference(sound.difference)
    }
  }

  const applySetupToState = (setup: SavedSetup) => {
    applySoundToState('primary', setup.mix.primary.sound)
    setPrimaryVolume(Math.round(setup.mix.primary.volume * 100))
    setSecondaryEnabled(Boolean(setup.mix.secondary))
    if (setup.mix.secondary) {
      applySoundToState('secondary', setup.mix.secondary.sound)
      setSecondaryVolume(Math.round(setup.mix.secondary.volume * 100))
    }
    setMasterVolume(Math.round(setup.masterVolume * 100))
    setTimerMinutes(setup.timerMinutes as (typeof TIMER_OPTIONS)[number])
    setMacros({
      warmth: integerMacro(setup.macros.warmth),
      softness: integerMacro(setup.macros.softness),
      airiness: integerMacro(setup.macros.airiness),
      movement: integerMacro(setup.macros.movement),
    })
    setEffects({
      room: integerMacro(setup.effects.room),
      tape: integerMacro(setup.effects.tape),
    })
    setDroneSettings({
      filterMode: setup.droneSettings.filterMode,
      cutoff: integerMacro(setup.droneSettings.cutoff),
      resonance: integerMacro(setup.droneSettings.resonance),
      lfoRate: integerMacro(setup.droneSettings.lfoRate),
      lfoDepth: integerMacro(setup.droneSettings.lfoDepth),
    })
    setTinnitusSettings(setup.tinnitusSettings)
    setSessionPlan(normalizeSessionPlan(setup.sessionPlan))
    engine.setSoundMacros(setup.macros)
    engine.setSoundEffects(setup.effects)
    engine.setDroneSettings(setup.droneSettings)
    engine.setTinnitusSettings(setup.tinnitusSettings)
    engine.setVolume(setup.masterVolume)
  }

  const handleApplyFavorite = (favorite: FavoritePreset) => {
    if (inFlight.current) return
    const setup = favoriteSetup(favorite)
    applySetupToState(setup)
    if (playbackState !== 'stopped') {
      void runAction(async () => {
        engine.setLayerVolume('primary', setup.mix.primary.volume)
        await engine.setLayerSound('primary', setup.mix.primary.sound)
        if (setup.mix.secondary) {
          engine.setLayerVolume('secondary', setup.mix.secondary.volume)
          await engine.setLayerSound('secondary', setup.mix.secondary.sound)
        } else {
          await engine.setLayerSound('secondary', null)
        }
      })
    }
  }

  const handleQuickStart = (setup: SavedSetup) => {
    if (inFlight.current) return
    applySetupToState(setup)
    void startSetup(setup, true)
  }

  const persistFavorites = (next: FavoritePreset[], message?: string) => {
    if (!saveFavorites(next)) {
      setError('Die Favoriten konnten auf diesem Gerät nicht gespeichert werden.')
      return false
    }
    setFavorites(next)
    if (message) setNotice(message)
    return true
  }

  const handleSaveFavorite = () => {
    const setup = currentSetup()
    const automaticName = [soundLabel(setup.mix.primary.sound), setup.mix.secondary && soundLabel(setup.mix.secondary.sound)]
      .filter(Boolean)
      .join(' + ')
    const preset: FavoritePreset = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: favoriteName.trim().slice(0, 60) || automaticName,
      ...setup,
    }
    if (persistFavorites([preset, ...favorites].slice(0, MAX_FAVORITES), 'Favorit wurde nur auf diesem Gerät gespeichert.')) {
      setFavoriteName('')
    }
  }

  const handleRenameFavorite = (id: string, name: string) => {
    persistFavorites(favorites.map((favorite) => favorite.id === id ? { ...favorite, name: name.slice(0, 60) } : favorite))
  }

  const handleDuplicateFavorite = (favorite: FavoritePreset) => {
    const duplicate: FavoritePreset = {
      ...favorite,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: `${favorite.name || 'Favorit'} Kopie`.slice(0, 60),
      quickSlot: undefined,
    }
    persistFavorites([duplicate, ...favorites].slice(0, MAX_FAVORITES), 'Favorit wurde dupliziert.')
  }

  const handleMoveFavorite = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= favorites.length) return
    const next = [...favorites]
    ;[next[index], next[target]] = [next[target], next[index]]
    persistFavorites(next)
  }

  const handleAssignSlot = (id: string, slot: 1 | 2 | 3) => {
    const next = favorites.map((favorite) => {
      if (favorite.id === id) return { ...favorite, quickSlot: favorite.quickSlot === slot ? undefined : slot }
      return favorite.quickSlot === slot ? { ...favorite, quickSlot: undefined } : favorite
    })
    persistFavorites(next, `Schnellplatz ${slot} wurde aktualisiert.`)
  }

  const handleRemoveFavorite = (id: string) => {
    persistFavorites(favorites.filter((favorite) => favorite.id !== id))
  }

  const handleExportFavorites = () => {
    try {
      const blob = new Blob([serializeFavorites(favorites)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'bliss-favoriten.json'
      link.click()
      URL.revokeObjectURL(url)
      setNotice('Favoriten wurden als lokale Datei vorbereitet.')
    } catch {
      setError('Die Exportdatei konnte nicht erstellt werden.')
    }
  }

  const handleImportFavorites = async (file: File | undefined) => {
    if (!file) return
    try {
      const imported = parseFavoritesImport(await file.text())
      const known = new Set(favorites.map(({ id }) => id))
      const next = [...imported.filter(({ id }) => !known.has(id)), ...favorites].slice(0, MAX_FAVORITES)
      persistFavorites(next, `${imported.length} Favorit${imported.length === 1 ? '' : 'en'} lokal importiert.`)
    } catch {
      setError('Die Datei enthält keine gültigen Bliss-Favoriten.')
    }
  }

  const toggleCompactMode = () => {
    const next = !compactMode
    setCompactMode(next)
    if (next) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
    } else if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined)
    }
  }

  const primaryLabel = playbackState === 'playing'
    ? 'Pausieren'
    : playbackState === 'paused' ? 'Fortsetzen' : 'Starten'
  const droneSelected = primaryKind === 'drone' || (secondaryEnabled && secondaryKind === 'drone')
  const quickFavorites = QUICK_SLOTS.map((slot) => favorites.find((favorite) => favorite.quickSlot === slot))
  const phaseStatus = sessionPhase ? sessionPhaseLabel(sessionPhase) : null

  const masterVolumeControl = (id: string) => (
    <div className="volume-control">
      <div className="volume-label-row">
        <label htmlFor={id}>Gesamtlautstärke</label><output htmlFor={id}>{masterVolume} %</output>
      </div>
      <div className="range-row">
        <span aria-hidden="true">◖</span>
        <input
          id={id}
          type="range"
          min="0"
          max="100"
          value={masterVolume}
          aria-describedby={`${id}-hint`}
          style={{ '--range-progress': `${masterVolume}%` } as React.CSSProperties}
          onChange={(event) => {
            const nextVolume = Number(event.target.value)
            setMasterVolume(nextVolume)
            engine.setVolume(nextVolume / 100)
          }}
        />
      </div>
      <p id={`${id}-hint`}>Beginne leise und erhöhe nur, solange es angenehm bleibt.</p>
    </div>
  )

  const primaryAction = (className = 'primary-action') => (
    <button
      className={className}
      type="button"
      disabled={busy}
      aria-busy={busy}
      onClick={() => void handlePrimaryAction()}
    >
      <span className="primary-action__icon" aria-hidden="true">
        {playbackState === 'playing' ? <><i /><i /></> : <span>▶</span>}
      </span>
      {busy ? 'Einen Moment …' : primaryLabel}
    </button>
  )

  return (
    <div className={`app-shell${compactMode ? ' is-compact' : ''}`}>
      <div className="ambient-glow ambient-glow--one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow--two" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#main" aria-label="Bliss – zum Hauptinhalt">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>Bliss</span>
        </a>
        <div className="topbar__actions">
          <button type="button" className="compact-toggle" onClick={toggleCompactMode}>
            {compactMode ? 'Alle Einstellungen' : 'Kompaktmodus'}
          </button>
          <span className={`status status--${playbackState}`} role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            {phaseStatus && playbackState !== 'stopped' ? `${phaseStatus} · ` : ''}
            {remainingSeconds !== null && playbackState !== 'stopped'
              ? `${statusLabels[playbackState]} · ${formatTimer(remainingSeconds)}`
              : statusLabels[playbackState]}
          </span>
        </div>
      </header>

      <main id="main" className="main-content">
        {compactMode ? (
          <section className="compact-player" aria-labelledby="compact-heading">
            <p className="eyebrow">Nur das Wesentliche</p>
            <h1 id="compact-heading">{soundLabel(primarySound())}{secondaryEnabled ? ` + ${soundLabel(secondarySound())}` : ''}</h1>
            <p>{phaseStatus ?? 'Freie Wiedergabe'}{remainingSeconds !== null ? ` · ${formatTimer(remainingSeconds)}` : ''}</p>
            <div className="compact-slots" aria-label="Schnellfavoriten">
              {quickFavorites.map((favorite, index) => (
                <button
                  type="button"
                  disabled={!favorite || busy}
                  onClick={() => favorite && handleQuickStart(favoriteSetup(favorite))}
                  key={QUICK_SLOTS[index]}
                >
                  <small>S{QUICK_SLOTS[index]}</small>{favorite?.name || 'Frei'}
                </button>
              ))}
            </div>
            {masterVolumeControl('compact-volume')}
            {(error || notice) && (
              <div className={error ? 'error-message' : 'notice-message'} role={error ? 'alert' : 'status'}>{error ?? notice}</div>
            )}
            {primaryAction()}
          </section>
        ) : (
          <>
            <section className="intro" aria-labelledby="page-title">
              <p className="eyebrow">Ein ruhiger Moment für dich</p>
              <h1 id="page-title">Lass einen sanften Klang mitlaufen.</h1>
              <p className="intro-copy">Wähle einen Klang oder kombiniere behutsam zwei Ebenen. Du kannst jederzeit stoppen.</p>
            </section>

            <section className="quick-access" aria-labelledby="quick-heading">
              <div>
                <p className="section-kicker">Schnellzugriff</p>
                <h2 id="quick-heading">Direkt in deine Mischung</h2>
              </div>
              <div className="quick-access__buttons">
                <button type="button" disabled={!lastSetup || busy} onClick={() => lastSetup && handleQuickStart(lastSetup)}>
                  <small>Zuletzt</small>Letzte Mischung starten
                </button>
                {quickFavorites.map((favorite, index) => (
                  <button
                    type="button"
                    disabled={!favorite || busy}
                    onClick={() => favorite && handleQuickStart(favoriteSetup(favorite))}
                    key={QUICK_SLOTS[index]}
                  >
                    <small>Schnellplatz {QUICK_SLOTS[index]}</small>{favorite?.name || 'Noch frei'}
                  </button>
                ))}
              </div>
            </section>

            <section className="sound-card" aria-labelledby="sound-heading">
              <div className={`sound-orbit sound-orbit--${playbackState}`} aria-hidden="true">
                <div className="sound-orbit__halo" />
                <div className="sound-orbit__core">
                  <span className="wave wave--one" /><span className="wave wave--two" /><span className="wave wave--three" />
                </div>
              </div>

              <div className="sound-card__content">
                <div className="section-heading">
                  <div><p className="section-kicker">Ebene 1</p><h2 id="sound-heading">Grundklang wählen</h2></div>
                  <span className="local-badge">Bleibt auf deinem Gerät</span>
                </div>

                <div className="noise-options" role="radiogroup" aria-label="Grundklang wählen">
                  {SOUND_OPTIONS.map((option) => (
                    <label
                      className={`noise-option noise-option--${option.color}${primaryKind === option.kind ? ' is-selected' : ''}`}
                      key={option.kind}
                    >
                      <input
                        className="option-input"
                        type="radio"
                        name="primary-sound"
                        value={option.kind}
                        checked={primaryKind === option.kind}
                        disabled={busy}
                        onChange={() => handleSoundChange('primary', option.kind)}
                      />
                      <span className="noise-option__icon" aria-hidden="true"><span /><span /><span /></span>
                      <span className="noise-option__text"><strong>{option.label}</strong><small>{option.description}</small></span>
                      <span className="radio-mark" aria-hidden="true" />
                    </label>
                  ))}
                </div>

                {primaryKind === 'binaural' && (
                  <BinauralSettings
                    idPrefix="primary"
                    difference={primaryDifference}
                    disabled={busy}
                    onChange={(difference) => handleDifferenceChange('primary', difference)}
                  />
                )}

                <div className="layer-volume">
                  <div><label htmlFor="primary-volume">Pegel Ebene 1</label><output>{primaryVolume} %</output></div>
                  <input
                    id="primary-volume"
                    type="range"
                    min="0"
                    max="100"
                    value={primaryVolume}
                    style={{ '--range-progress': `${primaryVolume}%` } as React.CSSProperties}
                    onChange={(event) => handleLayerVolumeChange('primary', Number(event.target.value))}
                  />
                </div>

                <section className="macro-panel" aria-labelledby="macro-heading">
                  <div><p className="section-kicker">Klang-Makros</p><h3 id="macro-heading">Farbe behutsam formen</h3></div>
                  <p>Begrenzte Bereiche ohne Resonanzspitzen. Binaurale Sinustöne bleiben bewusst neutral.</p>
                  <div className="macro-grid">
                    {macroDefinitions.map(({ key, label, low, high }) => (
                      <label key={key}>
                        <span><strong>{label}</strong><output>{macros[key]} %</output></span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={macros[key]}
                          aria-label={label}
                          style={{ '--range-progress': `${macros[key]}%` } as React.CSSProperties}
                          onChange={(event) => handleMacroChange(key, Number(event.target.value))}
                        />
                        <small><span>{low}</span><span>{high}</span></small>
                      </label>
                    ))}
                  </div>
                </section>

                {droneSelected && (
                  <section className="drone-panel" aria-labelledby="drone-heading">
                    <div>
                      <p className="section-kicker">Warmer Drone</p>
                      <h3 id="drone-heading">Oszillatoren &amp; Multimode-Filter</h3>
                    </div>
                    <p>Acht leise Oszillatoren und ein langsamer LFO. Der direkte LP/BP/HP-Workflow ist eigenständig und sanft begrenzt.</p>
                    <fieldset className="filter-modes">
                      <legend>Filtertyp</legend>
                      <div>
                        {filterModes.map(({ mode, short, label }) => (
                          <label className={droneSettings.filterMode === mode ? 'is-selected' : ''} key={mode}>
                            <input
                              type="radio"
                              name="drone-filter-mode"
                              value={mode}
                            aria-label={`${short} – ${label}`}
                              checked={droneSettings.filterMode === mode}
                              onChange={() => handleDroneModeChange(mode)}
                            />
                            <strong>{short}</strong><span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="drone-grid">
                      <label>
                        <span><strong>Cutoff</strong><output>{Math.round(droneCutoffHz(droneSettings.cutoff / 100))} Hz</output></span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={droneSettings.cutoff}
                          aria-label="Drone Filter-Cutoff"
                          style={{ '--range-progress': `${droneSettings.cutoff}%` } as React.CSSProperties}
                          onChange={(event) => handleDroneValueChange('cutoff', Number(event.target.value))}
                        />
                        <small><span>dunkel</span><span>offen</span></small>
                      </label>
                      <label>
                        <span><strong>Resonanz</strong><output>{droneSettings.resonance} %</output></span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={droneSettings.resonance}
                          aria-label="Drone Filter-Resonanz"
                          style={{ '--range-progress': `${droneSettings.resonance}%` } as React.CSSProperties}
                          onChange={(event) => handleDroneValueChange('resonance', Number(event.target.value))}
                        />
                        <small><span>flach</span><span>betont</span></small>
                      </label>
                      <label>
                        <span>
                          <strong>LFO-Tempo</strong>
                          <output>{droneLfoRateHz(droneSettings.lfoRate / 100).toFixed(2).replace('.', ',')} Hz</output>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={droneSettings.lfoRate}
                          aria-label="Drone LFO-Tempo"
                          style={{ '--range-progress': `${droneSettings.lfoRate}%` } as React.CSSProperties}
                          onChange={(event) => handleDroneValueChange('lfoRate', Number(event.target.value))}
                        />
                        <small><span>sehr langsam</span><span>fließend</span></small>
                      </label>
                      <label>
                        <span><strong>LFO-Tiefe</strong><output>{droneSettings.lfoDepth} %</output></span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={droneSettings.lfoDepth}
                          aria-label="Drone LFO-Tiefe"
                          style={{ '--range-progress': `${droneSettings.lfoDepth}%` } as React.CSSProperties}
                          onChange={(event) => handleDroneValueChange('lfoDepth', Number(event.target.value))}
                        />
                        <small><span>statisch</span><span>bewegter</span></small>
                      </label>
                    </div>
                  </section>
                )}

                <section className="effects-panel" aria-labelledby="effects-heading">
                  <div><p className="section-kicker">Raum &amp; Wärme</p><h3 id="effects-heading">Sanft in den Raum setzen</h3></div>
                  <p>Ein kurzer diffuser Raum ohne Federhall-Charakter. Tape rundet Spitzen ab und komprimiert nur leicht.</p>
                  <div className="effect-grid">
                    {effectDefinitions.map(({ key, label, low, high }) => (
                      <label key={key}>
                        <span><strong>{label}</strong><output>{effects[key]} %</output></span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={effects[key]}
                          aria-label={label}
                          style={{ '--range-progress': `${effects[key]}%` } as React.CSSProperties}
                          onChange={(event) => handleEffectChange(key, Number(event.target.value))}
                        />
                        <small><span>{low}</span><span>{high}</span></small>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="tinnitus-panel" aria-labelledby="tinnitus-heading">
                  <div className="tinnitus-panel__heading">
                    <div>
                      <p className="section-kicker">Experimentelles Werkzeug</p>
                      <h3 id="tinnitus-heading">Frequenz &amp; Notch</h3>
                    </div>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        aria-label="Notch-Filter aktivieren"
                        checked={tinnitusSettings.notchEnabled}
                        onChange={(event) => updateTinnitusSettings({
                          ...tinnitusSettings,
                          notchEnabled: event.target.checked,
                        })}
                      />
                      <span aria-hidden="true" />
                      {tinnitusSettings.notchEnabled ? 'Aktiv' : 'Aus'}
                    </label>
                  </div>
                  <p>
                    Der Vergleichston hilft nur bei einer subjektiven Annäherung an einen gleichbleibenden Ton.
                    Er stellt keine Messung oder Diagnose dar.
                  </p>
                  <div className="tinnitus-frequency">
                    <div>
                      <label htmlFor="tinnitus-frequency">Vergleichsfrequenz</label>
                      <output htmlFor="tinnitus-frequency">{tinnitusSettings.frequency.toLocaleString('de-DE')} Hz</output>
                    </div>
                    <input
                      id="tinnitus-frequency"
                      type="range"
                      min="0"
                      max="1000"
                      value={Math.round(tinnitusPositionFromFrequency(tinnitusSettings.frequency) * 1000)}
                      aria-describedby="tinnitus-frequency-hint"
                      style={{
                        '--range-progress': `${tinnitusPositionFromFrequency(tinnitusSettings.frequency) * 100}%`,
                      } as React.CSSProperties}
                      onChange={(event) => updateTinnitusSettings({
                        ...tinnitusSettings,
                        frequency: tinnitusFrequencyFromPosition(Number(event.target.value) / 1000),
                      })}
                    />
                    <small id="tinnitus-frequency-hint"><span>250 Hz</span><span>12.000 Hz</span></small>
                  </div>
                  <div className="tinnitus-actions">
                    <button
                      type="button"
                      className={tunerPlaying ? 'secondary-action is-active' : 'secondary-action'}
                      aria-pressed={tunerPlaying}
                      onClick={() => void handleTunerToggle()}
                    >
                      {tunerPlaying ? 'Vergleichston stoppen' : 'Vergleichston leise anhören'}
                    </button>
                    <label>
                      Notch-Breite
                      <select
                        aria-label="Notch-Breite"
                        value={tinnitusSettings.notchWidth}
                        onChange={(event) => updateTinnitusSettings({
                          ...tinnitusSettings,
                          notchWidth: Number(event.target.value),
                        })}
                      >
                        <option value="0.5">schmal · ½ Oktave</option>
                        <option value="1">mittel · 1 Oktave</option>
                        <option value="1.5">breit · 1½ Oktaven</option>
                      </select>
                    </label>
                  </div>
                  <p className="tinnitus-caution" role="note">
                    Nicht bei pulsierendem oder rauschendem Tinnitus verwenden. Nur kurz und sehr leise vergleichen;
                    hohe Töne nicht durch mehr Gerätelautstärke erzwingen. Bei Unbehagen, Druckgefühl oder Verstärkung
                    sofort stoppen. Die Wirksamkeit personalisierter Notch-Verfahren ist wissenschaftlich nicht gesichert.
                  </p>
                </section>

                <section className="mixer-panel" aria-labelledby="mixer-heading">
                  <div className="mixer-panel__heading">
                    <div><p className="section-kicker">Klangmixer</p><h3 id="mixer-heading">Zweite Ebene</h3></div>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        aria-label="Zweite Ebene aktivieren"
                        checked={secondaryEnabled}
                        disabled={busy}
                        onChange={(event) => handleSecondaryToggle(event.target.checked)}
                      />
                      <span aria-hidden="true" />
                      {secondaryEnabled ? 'Aktiv' : 'Aus'}
                    </label>
                  </div>
                  <p className="mixer-hint">Eine leise zweite Ebene kann Tiefe geben. Beide Pegel bleiben getrennt regelbar.</p>

                  {secondaryEnabled && (
                    <div className="secondary-controls">
                      <label htmlFor="secondary-sound">Klang für Ebene 2</label>
                      <select
                        id="secondary-sound"
                        value={secondaryKind}
                        disabled={busy}
                        onChange={(event) => handleSoundChange('secondary', event.target.value as SoundKind)}
                      >
                        {SOUND_OPTIONS.map((option) => <option value={option.kind} key={option.kind}>{option.label}</option>)}
                      </select>
                      {secondaryKind === 'binaural' && (
                        <BinauralSettings
                          idPrefix="secondary"
                          difference={secondaryDifference}
                          disabled={busy}
                          onChange={(difference) => handleDifferenceChange('secondary', difference)}
                        />
                      )}
                      <div className="layer-volume">
                        <div><label htmlFor="secondary-volume">Pegel Ebene 2</label><output>{secondaryVolume} %</output></div>
                        <input
                          id="secondary-volume"
                          type="range"
                          min="0"
                          max="100"
                          value={secondaryVolume}
                          style={{ '--range-progress': `${secondaryVolume}%` } as React.CSSProperties}
                          onChange={(event) => handleLayerVolumeChange('secondary', Number(event.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </section>

                <section className="session-panel" aria-labelledby="session-heading">
                  <div className="session-panel__heading">
                    <div><p className="section-kicker">Sitzungsablauf</p><h3 id="session-heading">Ankommen, Klang, Ausblenden</h3></div>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        aria-label="Sitzungsablauf aktivieren"
                        checked={sessionPlan.enabled}
                        disabled={playbackState !== 'stopped'}
                        onChange={(event) => setSessionPlan((plan) => ({ ...plan, enabled: event.target.checked }))}
                      />
                      <span aria-hidden="true" />
                      {sessionPlan.enabled ? 'Aktiv' : 'Aus'}
                    </label>
                  </div>
                  <p>Die Mischung bleibt beim Ankommen stumm, wird sanft eingeblendet und am Ende langsam leiser.</p>
                  <div className="session-presets" aria-label="Sitzungsvorlagen">
                    {SESSION_PRESETS.map(({ label, plan }) => (
                      <button type="button" disabled={playbackState !== 'stopped'} onClick={() => setSessionPlan(plan)} key={label}>{label}</button>
                    ))}
                  </div>
                  {sessionPlan.enabled && (
                    <div className="session-editor">
                      <label>Ankommen<input aria-label="Minuten ankommen" type="number" min="0" max="10" value={sessionPlan.settleMinutes} onChange={(event) => setSessionPlan(normalizeSessionPlan({ ...sessionPlan, settleMinutes: Number(event.target.value) }))} /><span>Min.</span></label>
                      <label>Klangzeit<input aria-label="Minuten Klangzeit" type="number" min="1" max="60" value={sessionPlan.soundMinutes} onChange={(event) => setSessionPlan(normalizeSessionPlan({ ...sessionPlan, soundMinutes: Number(event.target.value) }))} /><span>Min.</span></label>
                      <label>Ausblenden<input aria-label="Minuten ausblenden" type="number" min="0" max="10" value={sessionPlan.fadeMinutes} onChange={(event) => setSessionPlan(normalizeSessionPlan({ ...sessionPlan, fadeMinutes: Number(event.target.value) }))} /><span>Min.</span></label>
                      <label className="silent-end"><input type="checkbox" checked={sessionPlan.silentEnd} onChange={(event) => setSessionPlan({ ...sessionPlan, silentEnd: event.target.checked })} />Still beenden <small>{sessionPlan.silentEnd ? 'ohne Signalton' : 'mit sehr leisem Abschlussklang'}</small></label>
                      <strong>Gesamt: {sessionPlan.settleMinutes + sessionPlan.soundMinutes + sessionPlan.fadeMinutes} Minuten</strong>
                    </div>
                  )}
                </section>

                <section className="timer-control" aria-labelledby="timer-heading">
                  <div><p className="section-kicker">Einfacher Timer</p><h3 id="timer-heading">Timer</h3></div>
                  <div className="timer-options" role="group" aria-label="Timer auswählen">
                    {TIMER_OPTIONS.map((minutes) => (
                      <button
                        type="button"
                        className={timerMinutes === minutes ? 'is-selected' : ''}
                        aria-pressed={timerMinutes === minutes}
                        disabled={sessionPlan.enabled}
                        onClick={() => setTimerMinutes(minutes)}
                        key={minutes}
                      >
                        {minutes === 0 ? 'Aus' : `${minutes} Min.`}
                      </button>
                    ))}
                  </div>
                  {sessionPlan.enabled && <p className="mixer-hint">Der Sitzungsablauf ersetzt den einfachen Timer.</p>}
                </section>

                {masterVolumeControl('volume')}

                {(error || notice) && (
                  <div className={error ? 'error-message' : 'notice-message'} role={error ? 'alert' : 'status'}>
                    <span>{error ?? notice}</span>
                  </div>
                )}

                {primaryAction()}
              </div>
            </section>

            <section className="quiet-tools" aria-labelledby="quiet-heading">
              <div className="quiet-tools__heading">
                <div><p className="section-kicker">Ruhemodus</p><h2 id="quiet-heading">Optional begleiten</h2></div>
                <button type="button" className="secondary-action" onClick={() => setBreathingEnabled((enabled) => !enabled)} aria-pressed={breathingEnabled}>
                  {breathingEnabled ? 'Atemkreis aus' : 'Atemkreis an'}
                </button>
              </div>

              {breathingEnabled && (
                <div className={`breathing-guide${playbackState === 'playing' ? ' is-active' : ''}`} aria-live="polite">
                  <div className="breathing-guide__circle" aria-hidden="true" />
                  <div><strong>{breathPhase}</strong><span>4 Sekunden ein · 6 Sekunden aus</span></div>
                </div>
              )}

              <div className="check-in-grid">
                <CheckInControl label="Belastung vorher" value={beforeCheckIn} onChange={setBeforeCheckIn} />
                <CheckInControl label="Belastung nachher" value={afterCheckIn} onChange={setAfterCheckIn} />
              </div>
              <p className="privacy-hint">Check-ins sind freiwillig und bleiben nur in dieser geöffneten Seite.</p>
              {sessionBeforeCheckIn !== null && afterCheckIn !== null && (
                <p className="check-in-summary">Für diesen Moment: vorher {sessionBeforeCheckIn} · nachher {afterCheckIn}</p>
              )}
            </section>

            <section className="favorites" aria-labelledby="favorites-heading">
              <div className="favorites__heading">
                <div><p className="section-kicker">Auf diesem Gerät</p><h2 id="favorites-heading">Favoriten</h2></div>
                <div className="favorite-transfer">
                  <button type="button" className="secondary-action" disabled={favorites.length === 0} onClick={handleExportFavorites}>Export</button>
                  <label className="secondary-action">Import<input type="file" accept="application/json,.json" onChange={(event) => { void handleImportFavorites(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
                </div>
              </div>
              <div className="favorite-create">
                <label><span>Name, optional</span><input value={favoriteName} maxLength={60} placeholder="z. B. Abend am Meer" onChange={(event) => setFavoriteName(event.target.value)} /></label>
                <button type="button" className="secondary-action" onClick={handleSaveFavorite}>Aktuelle Mischung speichern</button>
              </div>
              {favorites.length === 0 ? (
                <p className="empty-state">Noch keine Favoriten gespeichert.</p>
              ) : (
                <ul>
                  {favorites.map((favorite, index) => (
                    <li key={favorite.id}>
                      <div className="favorite-main">
                        <input aria-label={`${favorite.name || 'Favorit'} umbenennen`} value={favorite.name} maxLength={60} onChange={(event) => handleRenameFavorite(favorite.id, event.target.value)} />
                        <button type="button" onClick={() => handleApplyFavorite(favorite)}>{favorite.name || 'Unbenannter Favorit'}</button>
                      </div>
                      <div className="favorite-actions">
                        <button type="button" aria-label={`${favorite.name} duplizieren`} onClick={() => handleDuplicateFavorite(favorite)}>Kopie</button>
                        <button type="button" aria-label={`${favorite.name} nach oben`} disabled={index === 0} onClick={() => handleMoveFavorite(index, -1)}>↑</button>
                        <button type="button" aria-label={`${favorite.name} nach unten`} disabled={index === favorites.length - 1} onClick={() => handleMoveFavorite(index, 1)}>↓</button>
                        {QUICK_SLOTS.map((slot) => <button type="button" className={favorite.quickSlot === slot ? 'is-selected' : ''} aria-label={`${favorite.name} Schnellplatz ${slot}`} onClick={() => handleAssignSlot(favorite.id, slot)} key={slot}>S{slot}</button>)}
                        <button type="button" className="remove-favorite" aria-label={`${favorite.name} entfernen`} onClick={() => handleRemoveFavorite(favorite.id)}>×</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <aside className="offline-note" aria-label="Offline und Installation">
              <strong>Offline nutzbar nach dem ersten Laden.</strong>
              <span>Auf dem iPhone: Teilen → Zum Home-Bildschirm.</span>
            </aside>

            <aside className="care-note" aria-label="Hinweis zum Hören">
              <span className="care-note__icon" aria-hidden="true">i</span>
              <p><strong>Höre auf dein Gefühl.</strong> Der Klang soll begleiten, nicht alles überdecken. Bliss ersetzt keine medizinische Abklärung.</p>
            </aside>
          </>
        )}
      </main>

      <div className="stop-dock">
        <button
          className="stop-action"
          type="button"
          disabled={stopping || (playbackState === 'stopped' && !busy && !tunerPlaying)}
          onClick={() => void handleStop()}
        >
          <span aria-hidden="true" />
          Sofort stoppen
        </button>
      </div>
    </div>
  )
}
