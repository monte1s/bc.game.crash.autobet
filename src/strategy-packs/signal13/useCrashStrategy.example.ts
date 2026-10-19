/**
 * Minimal wiring example for a content-script / React hook.
 * This file is documentation — import the real API from `./signal13`.
 *
 * Flow:
 * 1. Seed history from completed crashes (oldest → newest), excluding the open round.
 * 2. On betting window open → `decide(state, config)`.
 * 3. If `action === 'bet'`, place stake @ target via your existing bet helper.
 * 4. When the round resolves → `setState(onRoundResult(state, config, crash))`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createSignal13State,
  decide,
  onRoundResult,
  type Decision,
  type Signal13Config,
  type StrategyState,
} from './signal13'

export interface UseCrashStrategyOptions {
  config: Signal13Config
  /** Place a bet on the Crash page (you already own this). */
  placeBet: (stake: number, target: number) => Promise<void> | void
}

export interface UseCrashStrategyResult {
  state: StrategyState
  lastDecision: Decision | null
  /** Call when a new round is about to accept bets. */
  onBettingOpen: () => Promise<Decision>
  /** Call when the round ends with a known crash multiplier. */
  onCrashResolved: (crash: number) => void
  /** Replace history (e.g. after loading stored rounds). Excludes current open round. */
  seedHistory: (crashes: number[]) => void
  reset: () => void
}

export function useCrashStrategy(
  options: UseCrashStrategyOptions,
): UseCrashStrategyResult {
  const { config, placeBet } = options
  const configRef = useRef(config)
  const stateRef = useRef<StrategyState>(createSignal13State(config))

  const [state, setState] = useState<StrategyState>(() =>
    createSignal13State(config),
  )
  const [lastDecision, setLastDecision] = useState<Decision | null>(null)

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const seedHistory = useCallback((crashes: number[]) => {
    setState(createSignal13State(configRef.current, crashes))
  }, [])

  const reset = useCallback(() => {
    setState(createSignal13State(configRef.current))
    setLastDecision(null)
  }, [])

  const onBettingOpen = useCallback(async () => {
    const decision = decide(stateRef.current, configRef.current)
    setLastDecision(decision)
    if (decision.action === 'bet') {
      await placeBet(decision.stake, decision.target)
    }
    return decision
  }, [placeBet])

  const onCrashResolved = useCallback((crash: number) => {
    setState((current) => onRoundResult(current, configRef.current, crash))
  }, [])

  return {
    state,
    lastDecision,
    onBettingOpen,
    onCrashResolved,
    seedHistory,
    reset,
  }
}
