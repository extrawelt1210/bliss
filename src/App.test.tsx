import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import type { AudioEngine } from './audio/types'

const createEngine = (): AudioEngine => ({
  start: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  setVolume: vi.fn(),
  setLayerSound: vi.fn().mockResolvedValue(undefined),
  setLayerVolume: vi.fn(),
  setSoundMacros: vi.fn(),
  setSoundEffects: vi.fn(),
  setDroneSettings: vi.fn(),
  setTinnitusSettings: vi.fn(),
  startTunerTone: vi.fn().mockResolvedValue(undefined),
  setTunerFrequency: vi.fn(),
  stopTunerTone: vi.fn().mockResolvedValue(undefined),
  playCompletionCue: vi.fn().mockResolvedValue(undefined),
  setInterruptionHandler: vi.fn(),
  dispose: vi.fn().mockResolvedValue(undefined),
})

describe('Bliss Bedienoberfläche', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('startet erst nach Klick mit leisem Master und einer Ebene', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)

    expect(engine.start).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Starten' }))

    expect(engine.start).toHaveBeenCalledWith({
      primary: { sound: { kind: 'brown' }, volume: 1 },
    }, 0.18)
    expect(screen.getByRole('button', { name: 'Pausieren' })).toBeInTheDocument()
  })

  it('mischt zwei Klänge mit unabhängigen Pegeln', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)

    await user.click(screen.getByRole('checkbox', { name: 'Zweite Ebene aktivieren' }))
    await user.selectOptions(screen.getByLabelText('Klang für Ebene 2'), 'white')
    fireEvent.change(screen.getByRole('slider', { name: 'Pegel Ebene 1' }), { target: { value: '70' } })
    fireEvent.change(screen.getByRole('slider', { name: 'Pegel Ebene 2' }), { target: { value: '25' } })
    await user.click(screen.getByRole('button', { name: 'Starten' }))

    expect(engine.start).toHaveBeenCalledWith({
      primary: { sound: { kind: 'brown' }, volume: 0.7 },
      secondary: { sound: { kind: 'white' }, volume: 0.25 },
    }, 0.18)
  })

  it('wechselt jede Ebene während der Wiedergabe separat', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)

    await user.click(screen.getByRole('button', { name: 'Starten' }))
    await user.click(screen.getByRole('radio', { name: /Rosa Rauschen/ }))
    expect(engine.setLayerSound).toHaveBeenCalledWith('primary', { kind: 'pink' })

    await user.click(screen.getByRole('checkbox', { name: 'Zweite Ebene aktivieren' }))
    expect(engine.setLayerSound).toHaveBeenCalledWith('secondary', { kind: 'sea' })
    await user.selectOptions(screen.getByLabelText('Klang für Ebene 2'), 'drone')
    expect(engine.setLayerSound).toHaveBeenCalledWith('secondary', { kind: 'drone' })
  })

  it('reicht Master- und Ebenenpegel normalisiert weiter', () => {
    const engine = createEngine()
    render(<App engine={engine} />)
    fireEvent.change(screen.getByRole('slider', { name: 'Gesamtlautstärke' }), { target: { value: '24' } })
    fireEvent.change(screen.getByRole('slider', { name: 'Pegel Ebene 1' }), { target: { value: '60' } })
    expect(engine.setVolume).toHaveBeenLastCalledWith(0.24)
    expect(engine.setLayerVolume).toHaveBeenLastCalledWith('primary', 0.6)
  })

  it('wählt binaural mit getrenntem Frequenzabstand je Ebene', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)
    await user.click(screen.getByRole('radio', { name: /Binaurale Klänge/ }))
    await user.click(screen.getByRole('radio', { name: '4 Hz' }))
    expect(screen.getByText('Grundton: links 200 Hz · rechts 204 Hz')).toBeInTheDocument()
    expect(screen.getByText('Leise Teiltöne links: 300 / 400 / 600 Hz · rechts jeweils +4 Hz')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Starten' }))
    expect(engine.start).toHaveBeenCalledWith({
      primary: { sound: { kind: 'binaural', difference: 4 }, volume: 1 },
    }, 0.18)
  })

  it('pausiert, setzt fort und stoppt zentral', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)
    await user.click(screen.getByRole('button', { name: 'Starten' }))
    await user.click(screen.getByRole('button', { name: 'Pausieren' }))
    expect(engine.pause).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Fortsetzen' }))
    expect(engine.start).toHaveBeenCalledTimes(2)
    await user.click(screen.getByRole('button', { name: 'Sofort stoppen' }))
    expect(engine.stop).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Starten' })).toBeInTheDocument()
  })

  it('stoppt nach Ablauf des Timers', async () => {
    vi.useFakeTimers()
    const engine = createEngine()
    render(<App engine={engine} />)
    fireEvent.click(screen.getByRole('button', { name: '5 Min.' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Starten' })) })
    expect(screen.getByText(/5:00/)).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(300_000) })
    await act(async () => { await Promise.resolve() })
    expect(engine.stop).toHaveBeenCalled()
    expect(screen.getByText('Der Timer ist ruhig ausgelaufen.')).toBeInTheDocument()
  })

  it('zeigt die freiwillige Atembegleitung und Check-ins', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)
    await user.click(screen.getByRole('button', { name: 'Atemkreis an' }))
    expect(screen.getByText('4 Sekunden ein · 6 Sekunden aus')).toBeInTheDocument()
    const voluntary = screen.getAllByRole('button', { name: 'Freiwillig eintragen' })
    await user.click(voluntary[0])
    expect(screen.getByRole('slider', { name: /Belastung vorher von 0 bis 10/ })).toHaveValue('5')
    expect(screen.getByText(/bleiben nur in dieser geöffneten Seite/)).toBeInTheDocument()
  })

  it('speichert und entfernt Favoriten ausschließlich lokal', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)
    await user.click(screen.getByRole('button', { name: 'Aktuelle Mischung speichern' }))
    expect(screen.getByRole('button', { name: 'Brown' })).toBeInTheDocument()
    expect(localStorage.getItem('bliss-favorites-v4')).toContain('brown')
    await user.click(screen.getByRole('button', { name: 'Brown entfernen' }))
    expect(screen.getByText('Noch keine Favoriten gespeichert.')).toBeInTheDocument()
  })

  it('formt lokal generierte Klänge mit sicheren Makros', () => {
    const engine = createEngine()
    render(<App engine={engine} />)
    expect(screen.getByRole('radio', { name: /Sanfter Regen/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider', { name: 'Wärme' }), { target: { value: '82' } })
    expect(engine.setSoundMacros).toHaveBeenLastCalledWith({
      warmth: 0.82,
      softness: 0.5,
      airiness: 0.35,
      movement: 0.35,
    })
  })

  it('dosiert Raum und Tape während der Wiedergabe unabhängig', () => {
    const engine = createEngine()
    render(<App engine={engine} />)
    fireEvent.change(screen.getByRole('slider', { name: 'Raumgefühl' }), { target: { value: '24' } })
    expect(engine.setSoundEffects).toHaveBeenLastCalledWith({ room: 0.24, tape: 0.14 })
    fireEvent.change(screen.getByRole('slider', { name: 'Tape-Sättigung' }), { target: { value: '20' } })
    expect(engine.setSoundEffects).toHaveBeenLastCalledWith({ room: 0.24, tape: 0.2 })
  })

  it('spielt den Frequenzvergleich nur nach Tastendruck und aktiviert den Notch getrennt', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)

    expect(engine.startTunerTone).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Vergleichston leise anhören' }))
    expect(engine.startTunerTone).toHaveBeenCalledWith(6_000)
    expect(screen.getByRole('button', { name: 'Vergleichston stoppen' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('checkbox', { name: 'Notch-Filter aktivieren' }))
    expect(engine.setTinnitusSettings).toHaveBeenLastCalledWith({
      notchEnabled: true,
      frequency: 6_000,
      notchWidth: 1,
    })
    await user.click(screen.getByRole('button', { name: 'Vergleichston stoppen' }))
    expect(engine.stopTunerTone).toHaveBeenCalled()
  })

  it('zeigt für den warmen Drone acht Oszillatoren, LFO und LP/BP/HP-Regler', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)
    await user.click(screen.getByRole('radio', { name: /Warmer Drone/ }))
    expect(screen.getByRole('heading', { name: 'Oszillatoren & Multimode-Filter' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'BP – Bandpass' }))
    expect(engine.setDroneSettings).toHaveBeenLastCalledWith({
      filterMode: 'bandpass',
      cutoff: 0.52,
      resonance: 0.18,
      lfoRate: 0.24,
      lfoDepth: 0.16,
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Drone Filter-Cutoff' }), { target: { value: '64' } })
    fireEvent.change(screen.getByRole('slider', { name: 'Drone LFO-Tiefe' }), { target: { value: '28' } })
    expect(engine.setDroneSettings).toHaveBeenLastCalledWith({
      filterMode: 'bandpass',
      cutoff: 0.64,
      resonance: 0.18,
      lfoRate: 0.24,
      lfoDepth: 0.28,
    })
  })

  it('startet einen Sitzungsablauf stumm und blendet nach dem Ankommen ein', async () => {
    vi.useFakeTimers()
    const engine = createEngine()
    render(<App engine={engine} />)
    fireEvent.click(screen.getByRole('button', { name: '20 Min. ruhig' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Starten' })) })
    expect(engine.start).toHaveBeenCalledWith({
      primary: { sound: { kind: 'brown' }, volume: 1 },
    }, 0)
    expect(screen.getByText(/Ankommen · Klang läuft · 20:00/)).toBeInTheDocument()

    await act(async () => { vi.advanceTimersByTime(120_000) })
    expect(engine.setVolume).toHaveBeenCalledWith(0.18, 4)
    expect(screen.getByText(/Klangzeit · Klang läuft/)).toBeInTheDocument()
  })

  it('setzt ein pausiertes langes Ausblenden mit der verbleibenden Dauer fort', async () => {
    vi.useFakeTimers()
    const engine = createEngine()
    render(<App engine={engine} />)
    fireEvent.click(screen.getByRole('button', { name: '10 Min. sanft' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Starten' })) })
    await act(async () => { vi.advanceTimersByTime(8 * 60_000) })
    expect(engine.setVolume).toHaveBeenCalledWith(0, 120)

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Pausieren' })) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Fortsetzen' })) })
    expect(engine.setVolume).toHaveBeenLastCalledWith(0, 120)
  })

  it('spielt den Abschlussklang nur nach bewusster Aktivierung und in gewählter Lautstärke', async () => {
    vi.useFakeTimers()
    const engine = createEngine()
    render(<App engine={engine} />)
    fireEvent.click(screen.getByRole('button', { name: '10 Min. sanft' }))
    fireEvent.change(screen.getByLabelText('Minuten ankommen'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Minuten Klangzeit'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Minuten ausblenden'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Still beenden/ }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Starten' })) })
    await act(async () => { vi.advanceTimersByTime(60_000) })
    await act(async () => { await Promise.resolve() })
    expect(engine.playCompletionCue).toHaveBeenCalledWith(0.18)
    expect(engine.stop).toHaveBeenCalled()
  })

  it('benennt und dupliziert Favoriten und belegt Schnellplätze', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)
    await user.type(screen.getByPlaceholderText('z. B. Abend am Meer'), 'Mein Abend')
    await user.click(screen.getByRole('button', { name: 'Aktuelle Mischung speichern' }))
    await user.click(screen.getByRole('button', { name: 'Mein Abend duplizieren' }))
    expect(screen.getByDisplayValue('Mein Abend Kopie')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mein Abend Schnellplatz 1' }))
    expect(localStorage.getItem('bliss-favorites-v4')).toContain('"quickSlot":1')
    expect(screen.getByRole('button', { name: /Schnellplatz 1.*Mein Abend/ })).toBeEnabled()
  })

  it('reduziert die Oberfläche im Kompaktmodus auf Wiedergabe und Schnellzugriff', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)
    await user.click(screen.getByRole('button', { name: 'Kompaktmodus' }))
    expect(screen.getByRole('heading', { name: 'Brown' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Grundklang wählen' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Alle Einstellungen' }))
    expect(screen.getByRole('heading', { name: 'Grundklang wählen' })).toBeInTheDocument()
  })

  it('zeigt Geräteunterbrechungen als bewusste Pause', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)
    await user.click(screen.getByRole('button', { name: 'Starten' }))
    const handler = vi.mocked(engine.setInterruptionHandler).mock.calls[0][0]
    act(() => handler?.())
    expect(screen.getByText(/vom Gerät unterbrochen/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fortsetzen' })).toBeInTheDocument()
  })

  it('zeigt Audiofehler und lässt einen neuen Versuch zu', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    vi.mocked(engine.start).mockRejectedValueOnce(new Error('blocked'))
    render(<App engine={engine} />)
    await user.click(screen.getByRole('button', { name: 'Starten' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Das hat gerade nicht geklappt')
    expect(screen.getByRole('button', { name: 'Starten' })).toBeEnabled()
  })

  it('macht Stopp auch beim wartenden Start bedienbar', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    let finishStart!: () => void
    vi.mocked(engine.start).mockReturnValueOnce(new Promise<void>((resolve) => { finishStart = resolve }))
    render(<App engine={engine} />)
    await user.click(screen.getByRole('button', { name: 'Starten' }))
    expect(screen.getByRole('button', { name: 'Sofort stoppen' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Sofort stoppen' }))
    await act(async () => { finishStart() })
    expect(engine.stop).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Starten' })).toBeEnabled()
  })

  it('erlaubt die Grundklangwahl mit Pfeiltasten', async () => {
    const user = userEvent.setup()
    const engine = createEngine()
    render(<App engine={engine} />)
    screen.getByRole('radio', { name: /Braunes Rauschen/ }).focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('radio', { name: /Weißes Rauschen/ })).toBeChecked()
    expect(engine.start).not.toHaveBeenCalled()
  })
})
