import type { StrategyConfig } from '../types'
import { applyRoundResult, createEngineSession, decideRound } from './session'
import type { RoundRecord, SimulationReport } from './types'

export interface SimulateOptions {
  strategyId: string
  config: StrategyConfig
  /** Crash multipliers in chronological order (oldest → newest). */
  crashes: number[]
  /** Optional seed history for signal strategies (excluded from simulation rounds). */
  history?: number[]
}

/** Summarize win rate from resolved bets only. */
export function computeWinRate(wins: number, losses: number): number {
  const resolved = wins + losses
  if (resolved === 0) return 0
  return wins / resolved
}

/**
 * Replay a strategy against a fixed crash series (paper test friendly).
 * Stake may be 0 — W/L analysis still works; profit stays 0.
 */
export function simulateStrategy(options: SimulateOptions): SimulationReport {
  const { strategyId, config, crashes, history = [] } = options
  let session = createEngineSession({ strategyId, config, history })
  const rounds: RoundRecord[] = []
  let wins = 0
  let losses = 0
  let skips = 0
  let totalStaked = 0

  for (let index = 0; index < crashes.length; index += 1) {
    if (session.stopped) break

    const crash = crashes[index]
    const decision = decideRound(session)
    const applied = applyRoundResult(session, crash, decision)
    session = applied.session

    if (applied.outcome === 'win') wins += 1
    else if (applied.outcome === 'loss') losses += 1
    else skips += 1

    if (decision.action === 'bet') {
      totalStaked += decision.stake
    }

    rounds.push({
      index,
      crash,
      decision,
      outcome: applied.outcome,
      profitDelta: applied.profitDelta,
      stakeAfter: session.stake,
      profitAfter: session.profit,
    })
  }

  return {
    strategyId,
    config,
    rounds,
    betsPlaced: session.betsPlaced,
    wins,
    losses,
    skips,
    winRate: computeWinRate(wins, losses),
    totalStaked,
    totalProfit: session.profit,
    stopped: session.stopped,
    stopReason: session.stopReason,
  }
}
