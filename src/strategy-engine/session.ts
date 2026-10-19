import {
  createSignal13State,
  decide as signal13Decide,
  onRoundResult as signal13OnRoundResult,
  signal13ConfigFromStrategyConfig,
} from '../strategy-packs/signal13'
import type { StrategyConfig } from '../types'
import { fibFactorAt, nextFibIndex } from './fibonacci'
import { profitDelta, resolveOutcome } from './outcome'
import type {
  CreateSessionOptions,
  EngineDecision,
  EngineSession,
  RoundOutcome,
} from './types'

function clampStake(stake: number, config: StrategyConfig): number {
  if (stake < 0) return 0
  if (config.maxBetAmount > 0 && stake > config.maxBetAmount) {
    return config.maxBetAmount
  }
  return stake
}

function baseStake(config: StrategyConfig): number {
  return Math.max(0, config.initialBet)
}

type ProgressionKind =
  | 'fixed'
  | 'martingale'
  | 'anti'
  | 'dalembert'
  | 'fibonacci'
  | 'signal13'

/** Resolve progression from strategy id + config adjustment mode. */
export function progressionKind(
  strategyId: string,
  config: StrategyConfig,
): ProgressionKind {
  if (strategyId === 'signal13') return 'signal13'
  if (strategyId === 'fibonacci') return 'fibonacci'
  if (strategyId === 'dalembert') return 'dalembert'
  if (strategyId === 'martingale' || config.adjustmentMode === 'increase-after-loss') {
    return 'martingale'
  }
  if (
    strategyId === 'anti-martingale' ||
    config.adjustmentMode === 'increase-after-win'
  ) {
    return 'anti'
  }
  if (config.adjustmentMode === 'custom-progression') {
    // Custom strategies: unitStep-driven → D'Alembert; otherwise Fibonacci steps
    return config.unitStep > 0 ? 'dalembert' : 'fibonacci'
  }
  return 'fixed'
}

export function createEngineSession(options: CreateSessionOptions): EngineSession {
  const { strategyId, config, history = [] } = options
  const kind = progressionKind(strategyId, config)
  const stake = baseStake(config)

  const session: EngineSession = {
    strategyId,
    config: { ...config },
    stake,
    betsPlaced: 0,
    consecutiveLosses: 0,
    consecutiveWins: 0,
    profit: 0,
    fibIndex: 0,
    stopped: false,
    stopReason: null,
  }

  if (kind === 'signal13') {
    const signalConfig = signal13ConfigFromStrategyConfig(config)
    session.signal13 = createSignal13State(signalConfig, history)
    session.stake = signalConfig.baseBet
  } else if (kind === 'fibonacci') {
    session.stake = clampStake(stake * fibFactorAt(0), config)
  }

  return session
}

export function decideRound(session: EngineSession): EngineDecision {
  if (session.stopped) {
    return { action: 'skip', reason: session.stopReason ?? 'session stopped' }
  }

  const { config, strategyId } = session
  const kind = progressionKind(strategyId, config)
  const target = Math.max(1.01, config.targetMultiplier)

  if (kind === 'signal13' && session.signal13) {
    const signalConfig = signal13ConfigFromStrategyConfig(config)
    return signal13Decide(session.signal13, signalConfig)
  }

  if (config.maxBets > 0 && session.betsPlaced >= config.maxBets) {
    return { action: 'skip', reason: `max bets reached (${config.maxBets})` }
  }

  if (config.stopLoss > 0 && session.profit <= -config.stopLoss) {
    return { action: 'skip', reason: 'stop-loss hit' }
  }

  if (config.takeProfit > 0 && session.profit >= config.takeProfit) {
    return { action: 'skip', reason: 'take-profit hit' }
  }

  const stake = clampStake(session.stake, config)
  return {
    action: 'bet',
    stake,
    target,
    reason: `${kind} · stake ${stake} @ ${target}x`,
  }
}

function nextClassicStake(
  session: EngineSession,
  outcome: RoundOutcome,
  decision: EngineDecision,
): { stake: number; fibIndex: number } {
  const { config, strategyId } = session
  const kind = progressionKind(strategyId, config)
  const base = baseStake(config)
  let fibIndex = session.fibIndex

  if (outcome === 'skip' || decision.action !== 'bet') {
    return { stake: session.stake, fibIndex }
  }

  const won = outcome === 'win'

  switch (kind) {
    case 'fixed':
      return { stake: base, fibIndex: 0 }

    case 'martingale':
      if (won) return { stake: base, fibIndex: 0 }
      return {
        stake: clampStake(decision.stake * config.lossMultiplier, config),
        fibIndex: 0,
      }

    case 'anti':
      if (!won) return { stake: base, fibIndex: 0 }
      return {
        stake: clampStake(decision.stake * config.winMultiplier, config),
        fibIndex: 0,
      }

    case 'dalembert': {
      const step = Math.max(0, config.unitStep)
      if (won) {
        return {
          stake: clampStake(Math.max(base, decision.stake - step), config),
          fibIndex: 0,
        }
      }
      return {
        stake: clampStake(decision.stake + step, config),
        fibIndex: 0,
      }
    }

    case 'fibonacci': {
      fibIndex = nextFibIndex(fibIndex, won)
      return {
        stake: clampStake(base * fibFactorAt(fibIndex), config),
        fibIndex,
      }
    }

    default:
      return { stake: base, fibIndex: 0 }
  }
}

/**
 * Apply a resolved crash multiplier to the session.
 * Returns a new session (immutable) plus the outcome metadata.
 */
export function applyRoundResult(
  session: EngineSession,
  crash: number,
  decision: EngineDecision = decideRound(session),
): {
  session: EngineSession
  outcome: RoundOutcome
  profitDelta: number
  decision: EngineDecision
} {
  const outcome = resolveOutcome(decision, crash)
  const delta = profitDelta(decision, outcome)
  const { config, strategyId } = session
  const kind = progressionKind(strategyId, config)

  let next: EngineSession = {
    ...session,
    profit: session.profit + delta,
    betsPlaced:
      decision.action === 'bet' ? session.betsPlaced + 1 : session.betsPlaced,
    consecutiveLosses:
      outcome === 'loss'
        ? session.consecutiveLosses + 1
        : outcome === 'win'
          ? 0
          : session.consecutiveLosses,
    consecutiveWins:
      outcome === 'win'
        ? session.consecutiveWins + 1
        : outcome === 'loss'
          ? 0
          : session.consecutiveWins,
  }

  if (kind === 'signal13' && session.signal13) {
    const signalConfig = signal13ConfigFromStrategyConfig(config)
    const signal13 = signal13OnRoundResult(session.signal13, signalConfig, crash)
    next = {
      ...next,
      signal13,
      stake: signal13.stake,
    }
  } else {
    const progressed = nextClassicStake(session, outcome, decision)
    next = {
      ...next,
      stake: progressed.stake,
      fibIndex: progressed.fibIndex,
    }
  }

  if (config.maxBets > 0 && next.betsPlaced >= config.maxBets) {
    next = {
      ...next,
      stopped: true,
      stopReason: `max bets reached (${config.maxBets})`,
    }
  } else if (config.stopLoss > 0 && next.profit <= -config.stopLoss) {
    next = { ...next, stopped: true, stopReason: 'stop-loss hit' }
  } else if (config.takeProfit > 0 && next.profit >= config.takeProfit) {
    next = { ...next, stopped: true, stopReason: 'take-profit hit' }
  }

  return { session: next, outcome, profitDelta: delta, decision }
}
