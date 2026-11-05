export type SessionPhase = 'settle' | 'sound' | 'fade'

export interface SessionPlan {
  enabled: boolean
  settleMinutes: number
  soundMinutes: number
  fadeMinutes: number
  silentEnd: boolean
}

export const DEFAULT_SESSION_PLAN: Readonly<SessionPlan> = {
  enabled: false,
  settleMinutes: 2,
  soundMinutes: 15,
  fadeMinutes: 3,
  silentEnd: true,
}

export const SESSION_PRESETS: ReadonlyArray<{ label: string; plan: SessionPlan }> = [
  { label: '10 Min. sanft', plan: { enabled: true, settleMinutes: 1, soundMinutes: 7, fadeMinutes: 2, silentEnd: true } },
  { label: '20 Min. ruhig', plan: { enabled: true, settleMinutes: 2, soundMinutes: 15, fadeMinutes: 3, silentEnd: true } },
  { label: '30 Min. lang', plan: { enabled: true, settleMinutes: 3, soundMinutes: 22, fadeMinutes: 5, silentEnd: true } },
]

const safeMinutes = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? Math.round(value) : minimum))

export const normalizeSessionPlan = (plan: Partial<SessionPlan> | undefined): SessionPlan => ({
  enabled: Boolean(plan?.enabled),
  settleMinutes: safeMinutes(plan?.settleMinutes ?? DEFAULT_SESSION_PLAN.settleMinutes, 0, 10),
  soundMinutes: safeMinutes(plan?.soundMinutes ?? DEFAULT_SESSION_PLAN.soundMinutes, 1, 60),
  fadeMinutes: safeMinutes(plan?.fadeMinutes ?? DEFAULT_SESSION_PLAN.fadeMinutes, 0, 10),
  silentEnd: plan?.silentEnd !== false,
})

export const sessionTotalSeconds = (plan: SessionPlan): number =>
  (plan.settleMinutes + plan.soundMinutes + plan.fadeMinutes) * 60

export const sessionPhaseAt = (plan: SessionPlan, elapsedSeconds: number): SessionPhase => {
  if (elapsedSeconds < plan.settleMinutes * 60) return 'settle'
  if (elapsedSeconds < (plan.settleMinutes + plan.soundMinutes) * 60) return 'sound'
  return 'fade'
}

export const sessionPhaseLabel = (phase: SessionPhase): string => ({
  settle: 'Ankommen',
  sound: 'Klangzeit',
  fade: 'Sanft ausblenden',
})[phase]
