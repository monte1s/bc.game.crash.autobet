import type { EngineDecision, RoundOutcome } from './types'

/** WIN if crash reaches the cashout target; LOSS otherwise. Skip if no bet. */
export function resolveOutcome(
  decision: EngineDecision,
  crash: number,
): RoundOutcome {
  if (decision.action !== 'bet') return 'skip'
  return crash >= decision.target ? 'win' : 'loss'
}

/**
 * Cash delta for a resolved bet.
 * WIN  → +stake * (target - 1)
 * LOSS → -stake
 * SKIP → 0
 * With stake 0 (paper test), profit is always 0 while W/L still count.
 */
export function profitDelta(
  decision: EngineDecision,
  outcome: RoundOutcome,
): number {
  if (decision.action !== 'bet' || outcome === 'skip') return 0
  if (outcome === 'win') return decision.stake * (decision.target - 1)
  return -decision.stake
}
