import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SIGNAL13_CONFIG,
  createSignal13State,
  decide,
  isSignalOn,
  onRoundResult,
  type Signal13Config,
  type StrategyState,
} from './signal13'

/** Build 10 crashes with exactly `under` values strictly below 1.3. */
function windowWithUnder(under: number): number[] {
  const lows = Array.from({ length: under }, () => 1.2)
  const highs = Array.from({ length: 10 - under }, () => 1.5)
  return [...lows, ...highs]
}

function filterConfig(overrides: Partial<Signal13Config> = {}): Signal13Config {
  return { ...DEFAULT_SIGNAL13_CONFIG, mode: 'filter', ...overrides }
}

function sessionConfig(overrides: Partial<Signal13Config> = {}): Signal13Config {
  return { ...DEFAULT_SIGNAL13_CONFIG, mode: 'session', ...overrides }
}

function runRound(state: StrategyState, config: Signal13Config, crash: number) {
  const decision = decide(state, config)
  const next = onRoundResult(state, config, crash)
  return { decision, next }
}

describe('signal13 filter mode', () => {
  it('skips when history has fewer than 10 points', () => {
    const config = filterConfig()
    const state = createSignal13State(config, [1.1, 1.1, 1.1])
    const decision = decide(state, config)
    expect(decision.action).toBe('skip')
    expect(decision.reason).toMatch(/warming up/)
  })

  it('skips when fewer than 2 of last 10 are under 1.3', () => {
    const config = filterConfig()
    const state = createSignal13State(config, windowWithUnder(1))
    expect(isSignalOn(state.history, config)).toBe(false)
    const decision = decide(state, config)
    expect(decision.action).toBe('skip')
    expect(decision.reason).toMatch(/signal off/)
  })

  it('bets baseBet @ 1.3 when ≥2/10 under 1.3', () => {
    const config = filterConfig({ baseBet: 2 })
    const state = createSignal13State(config, windowWithUnder(2))
    const decision = decide(state, config)
    expect(decision).toEqual({
      action: 'bet',
      stake: 2,
      target: 1.3,
      reason: expect.stringMatching(/signal on/),
    })
  })

  it('never doubles stake in filter mode across win/loss', () => {
    const config = filterConfig({ baseBet: 1 })
    let state = createSignal13State(config, windowWithUnder(3))

    const loss = runRound(state, config, 1.1)
    expect(loss.decision.action).toBe('bet')
    expect(loss.decision.action === 'bet' && loss.decision.stake).toBe(1)
    state = loss.next

    // After a low crash, under-count stays high — still signal on, flat stake
    const again = decide(state, config)
    expect(again.action).toBe('bet')
    if (again.action === 'bet') expect(again.stake).toBe(1)

    const win = runRound(state, config, 2.0)
    expect(win.next.stake).toBe(1)
    expect(win.next.active).toBe(false)
  })

  it('evaluates signal excluding the current unresolved round', () => {
    const config = filterConfig()
    // 9 highs then 1 low — adding one more low becomes 2/10 only after append
    const history = [...Array.from({ length: 9 }, () => 1.5), 1.2]
    const state = createSignal13State(config, history)
    expect(decide(state, config).action).toBe('skip')

    // Current round's 1.1 must not count until onRoundResult
    const next = onRoundResult(state, config, 1.1)
    expect(next.history).toHaveLength(11)
    expect(isSignalOn(next.history, config)).toBe(true)
    expect(decide(next, config).action).toBe('bet')
  })
})

describe('signal13 session mode', () => {
  it('stays idle until signal on, then opens at baseBet', () => {
    const config = sessionConfig({ baseBet: 1 })
    const idle = createSignal13State(config, windowWithUnder(1))
    expect(decide(idle, config).action).toBe('skip')
    expect(idle.active).toBe(false)

    const ready = createSignal13State(config, windowWithUnder(2))
    const decision = decide(ready, config)
    expect(decision).toMatchObject({ action: 'bet', stake: 1, target: 1.3 })
  })

  it('doubles stake on loss and keeps session active', () => {
    const config = sessionConfig({ baseBet: 1, betMultiplier: 2 })
    let state = createSignal13State(config, windowWithUnder(2))

    const first = runRound(state, config, 1.1)
    expect(first.decision.action).toBe('bet')
    state = first.next
    expect(state.active).toBe(true)
    expect(state.stake).toBe(2)
    expect(state.lossStreak).toBe(1)

    const second = decide(state, config)
    expect(second).toMatchObject({ action: 'bet', stake: 2 })

    state = onRoundResult(state, config, 1.0)
    expect(state.stake).toBe(4)
    expect(state.lossStreak).toBe(2)
    expect(state.active).toBe(true)
  })

  it('resets stake and goes idle on win', () => {
    const config = sessionConfig({ baseBet: 1, betMultiplier: 2 })
    let state = createSignal13State(config, windowWithUnder(2))
    state = onRoundResult(state, config, 1.1) // loss → active, stake 2
    expect(state.active).toBe(true)
    expect(state.stake).toBe(2)

    state = onRoundResult(state, config, 1.5) // win → idle
    expect(state.active).toBe(false)
    expect(state.stake).toBe(1)
    expect(state.lossStreak).toBe(0)
  })

  it('keeps betting every round while session active even if signal turns off', () => {
    const config = sessionConfig({ baseBet: 1 })
    let state = createSignal13State(config, windowWithUnder(2))
    state = onRoundResult(state, config, 1.1) // open session on loss
    expect(state.active).toBe(true)

    // Flood history with highs so signal would be off if we required it
    for (let i = 0; i < 10; i += 1) {
      state = {
        ...state,
        history: [...state.history, 3.0],
      }
    }
    expect(isSignalOn(state.history, config)).toBe(false)
    expect(decide(state, config).action).toBe('bet')
  })

  it('respects maxLossStreak safety cap', () => {
    const config = sessionConfig({
      baseBet: 1,
      betMultiplier: 2,
      maxLossStreak: 2,
    })
    let state = createSignal13State(config, windowWithUnder(2))
    state = onRoundResult(state, config, 1.1) // streak 1
    state = onRoundResult(state, config, 1.1) // streak 2
    expect(state.lossStreak).toBe(2)

    const blocked = decide(state, config)
    expect(blocked.action).toBe('skip')
    expect(blocked.reason).toMatch(/max loss streak/)

    const watched = onRoundResult(state, config, 1.0)
    expect(watched.stake).toBe(state.stake)
    expect(watched.lossStreak).toBe(2)
  })
})
