/**
 * signal13 — bet 1.3x only after a cluster of low crashes.
 *
 * Rules:
 * - Cashout target is always 1.3x (never change mid-session).
 * - Look at the last `window` (default 10) completed crashes before the current round.
 * - Count how many are strictly under 1.3 (`crash < 1.3`).
 * - Signal ON when history.length >= window AND underCount >= minUnder (default 2).
 *
 * Modes:
 * - `filter` (default): bet flat `baseBet` @ 1.3 only when signal is ON; no martingale.
 * - `session`: idle until signal ON, then martingale on loss (`stake * betMultiplier`)
 *   until a win resets to idle at `baseBet`.
 *
 * History must exclude the current unresolved round when evaluating the signal.
 * WIN: crash >= 1.3 · LOSS: crash < 1.3
 */

export const SIGNAL13_TARGET = 1.3 as const

export type Signal13Mode = 'filter' | 'session'

export type CrashPoint = {
  gameId?: string | number
  crash: number
}

export interface Signal13Config {
  /** Flat stake in filter mode; opening stake in session mode. Default 1. */
  baseBet: number
  /** Fixed cashout for this strategy. Always 1.3. */
  target: typeof SIGNAL13_TARGET
  /** Lookback window (completed crashes before current round). Default 10. */
  window: number
  /** Min crashes strictly under `target` in the window. Default 2. */
  minUnder: number
  /** `filter` = flat bets when signal on; `session` = martingale until win. */
  mode: Signal13Mode
  /** Session-mode loss multiplier. Default 2. */
  betMultiplier: number
  /** Optional session-mode stake cap. Skip if next stake would exceed. */
  maxBet?: number
  /** Optional session-mode max consecutive losses before skipping. */
  maxLossStreak?: number
}

export interface StrategyState {
  /** Past crash multipliers, chronological (oldest → newest). */
  history: number[]
  mode: Signal13Mode
  /** Session mode only: true while a martingale session is open. */
  active: boolean
  /** Next stake to use when betting (session mode). */
  stake: number
  /** Consecutive losses in the current session. */
  lossStreak: number
}

export type Decision =
  | { action: 'skip'; reason: string }
  | { action: 'bet'; stake: number; target: number; reason: string }

export const DEFAULT_SIGNAL13_CONFIG: Signal13Config = {
  baseBet: 1,
  target: SIGNAL13_TARGET,
  window: 10,
  minUnder: 2,
  mode: 'filter',
  betMultiplier: 2,
}

const HISTORY_CAP = 128

function clampHistory(history: number[]): number[] {
  if (history.length <= HISTORY_CAP) return history
  return history.slice(history.length - HISTORY_CAP)
}

/** Count crashes strictly under `target` in the last `window` points. */
export function countUnderInWindow(
  history: number[],
  window: number,
  target: number = SIGNAL13_TARGET,
): number {
  if (window <= 0 || history.length === 0) return 0
  const slice = history.slice(-window)
  let count = 0
  for (const crash of slice) {
    if (crash < target) count += 1
  }
  return count
}

/** Signal uses history only — never the current unresolved round. */
export function isSignalOn(
  history: number[],
  config: Pick<Signal13Config, 'window' | 'minUnder' | 'target'>,
): boolean {
  if (history.length < config.window) return false
  return countUnderInWindow(history, config.window, config.target) >= config.minUnder
}

function normalizeConfig(config: Signal13Config): Signal13Config {
  return {
    ...DEFAULT_SIGNAL13_CONFIG,
    ...config,
    target: SIGNAL13_TARGET,
    mode: config.mode === 'session' ? 'session' : 'filter',
    // Allow 0 for paper testing (BC.GAME accepts 0 stakes)
    baseBet:
      Number.isFinite(config.baseBet) && config.baseBet >= 0
        ? config.baseBet
        : DEFAULT_SIGNAL13_CONFIG.baseBet,
    window: config.window > 0 ? Math.floor(config.window) : DEFAULT_SIGNAL13_CONFIG.window,
    minUnder:
      config.minUnder > 0 ? Math.floor(config.minUnder) : DEFAULT_SIGNAL13_CONFIG.minUnder,
    betMultiplier:
      config.betMultiplier > 0
        ? config.betMultiplier
        : DEFAULT_SIGNAL13_CONFIG.betMultiplier,
  }
}

function crashesFromPoints(points: Array<number | CrashPoint>): number[] {
  return points.map((p) => (typeof p === 'number' ? p : p.crash))
}

/**
 * Create initial strategy state.
 * Optional `initialHistory` / crash points seed lookback (oldest → newest).
 */
export function createSignal13State(
  config: Signal13Config,
  initialHistory: Array<number | CrashPoint> = [],
): StrategyState {
  const normalized = normalizeConfig(config)
  return {
    history: clampHistory(crashesFromPoints(initialHistory)),
    mode: normalized.mode,
    active: false,
    stake: normalized.baseBet,
    lossStreak: 0,
  }
}

function signalReason(
  history: number[],
  config: Signal13Config,
  on: boolean,
): string {
  const under = countUnderInWindow(history, config.window, config.target)
  if (history.length < config.window) {
    return `warming up: ${history.length}/${config.window} crashes`
  }
  if (on) {
    return `signal on: ${under}/${config.window} under ${config.target}`
  }
  return `signal off: ${under}/${config.window} under ${config.target} (need ${config.minUnder})`
}

/**
 * Decide whether to bet before a round starts.
 * Call with state whose `history` excludes the current unresolved round.
 */
export function decide(state: StrategyState, config: Signal13Config): Decision {
  const cfg = normalizeConfig(config)
  const on = isSignalOn(state.history, cfg)
  const target = cfg.target

  if (cfg.mode === 'filter') {
    if (!on) {
      return { action: 'skip', reason: signalReason(state.history, cfg, false) }
    }
    return {
      action: 'bet',
      stake: cfg.baseBet,
      target,
      reason: signalReason(state.history, cfg, true),
    }
  }

  // session mode
  if (state.active) {
    if (cfg.maxLossStreak !== undefined && state.lossStreak >= cfg.maxLossStreak) {
      return {
        action: 'skip',
        reason: `max loss streak reached (${state.lossStreak}/${cfg.maxLossStreak})`,
      }
    }
    if (cfg.maxBet !== undefined && state.stake > cfg.maxBet) {
      return {
        action: 'skip',
        reason: `stake ${state.stake} exceeds maxBet ${cfg.maxBet}`,
      }
    }
    return {
      action: 'bet',
      stake: state.stake,
      target,
      reason: `session active · loss streak ${state.lossStreak}`,
    }
  }

  if (!on) {
    return { action: 'skip', reason: `idle · ${signalReason(state.history, cfg, false)}` }
  }

  if (cfg.maxBet !== undefined && cfg.baseBet > cfg.maxBet) {
    return {
      action: 'skip',
      reason: `baseBet ${cfg.baseBet} exceeds maxBet ${cfg.maxBet}`,
    }
  }

  return {
    action: 'bet',
    stake: cfg.baseBet,
    target,
    reason: `session open · ${signalReason(state.history, cfg, true)}`,
  }
}

/**
 * Apply a resolved crash: append to history and update session stake/active.
 * Pass the same history that `decide` used (current round was not in history yet).
 *
 * Assumes the UI followed the last `decide()` result (bet only when action was `bet`).
 * Safety-cap skips only append history and do not progress stake / lossStreak.
 */
export function onRoundResult(
  state: StrategyState,
  config: Signal13Config,
  crash: number,
): StrategyState {
  const cfg = normalizeConfig(config)
  const history = clampHistory([...state.history, crash])
  const won = crash >= cfg.target

  if (cfg.mode === 'filter') {
    return {
      history,
      mode: 'filter',
      active: false,
      stake: cfg.baseBet,
      lossStreak: 0,
    }
  }

  const priorDecision = decide(state, cfg)
  const betPlaced = priorDecision.action === 'bet'

  if (!betPlaced) {
    return {
      ...state,
      history,
      mode: 'session',
      stake: state.active ? state.stake : cfg.baseBet,
    }
  }

  if (won) {
    return {
      history,
      mode: 'session',
      active: false,
      stake: cfg.baseBet,
      lossStreak: 0,
    }
  }

  const previousStake = state.active ? state.stake : cfg.baseBet
  let nextStake = previousStake * cfg.betMultiplier
  if (cfg.maxBet !== undefined) {
    nextStake = Math.min(nextStake, cfg.maxBet)
  }

  return {
    history,
    mode: 'session',
    active: true,
    stake: nextStake,
    lossStreak: state.lossStreak + 1,
  }
}
