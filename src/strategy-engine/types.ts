import type { StrategyConfig } from '../types'
import type { StrategyState as Signal13State } from '../strategy-packs/signal13/signal13'

/** Decision before a round accepts bets. */
export type EngineDecision =
  | { action: 'skip'; reason: string }
  | { action: 'bet'; stake: number; target: number; reason: string }

export type RoundOutcome = 'win' | 'loss' | 'skip'

/** Mutable session used by the paper / live strategy runner. */
export interface EngineSession {
  strategyId: string
  config: StrategyConfig
  /** Next stake to use when betting. */
  stake: number
  /** Bets actually placed (skips excluded). */
  betsPlaced: number
  consecutiveLosses: number
  consecutiveWins: number
  /** Running P/L (0 when paper-testing with 0 stake). */
  profit: number
  /** Fibonacci sequence index (classic fibonacci / custom-progression). */
  fibIndex: number
  /** Optional signal13 internal state. */
  signal13?: Signal13State
  stopped: boolean
  stopReason: string | null
}

export interface RoundRecord {
  index: number
  crash: number
  decision: EngineDecision
  outcome: RoundOutcome
  /** Cash delta for this round (negative stake on loss, stake*(target-1) on win). */
  profitDelta: number
  stakeAfter: number
  profitAfter: number
}

export interface SimulationReport {
  strategyId: string
  config: StrategyConfig
  rounds: RoundRecord[]
  betsPlaced: number
  wins: number
  losses: number
  skips: number
  /** wins / (wins + losses), or 0 if no resolved bets. */
  winRate: number
  totalStaked: number
  totalProfit: number
  stopped: boolean
  stopReason: string | null
}

export interface CreateSessionOptions {
  strategyId: string
  config: StrategyConfig
  /** Seed crash history for signal strategies (oldest → newest). */
  history?: number[]
}
