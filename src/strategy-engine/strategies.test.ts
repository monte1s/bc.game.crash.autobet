import { describe, expect, it } from 'vitest'
import { DEFAULT_STRATEGY_CONFIG } from '../data/defaults'
import { listStrategySkills } from '../strategy-packs'
import type { StrategyConfig } from '../types'
import {
  applyRoundResult,
  createEngineSession,
  decideRound,
  progressionKind,
  simulateStrategy,
} from './index'

function config(overrides: Partial<StrategyConfig> = {}): StrategyConfig {
  return {
    ...DEFAULT_STRATEGY_CONFIG,
    maxBets: 100,
    stopLoss: 0,
    takeProfit: 0,
    ...overrides,
  }
}

/** Paper-test config: 0 stake, still evaluates W/L vs target. */
function paperConfig(overrides: Partial<StrategyConfig> = {}): StrategyConfig {
  return config({
    initialBet: 0,
    maxBetAmount: 0,
    unitStep: 0,
    ...overrides,
  })
}

describe('strategy engine — all registered skills', () => {
  const skills = listStrategySkills()

  it('registers classic + signal13 strategies', () => {
    const ids = skills.map((s) => s.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'martingale',
        'anti-martingale',
        'fixed-amount',
        'fixed-multiplier',
        'dalembert',
        'fibonacci',
        'signal13',
      ]),
    )
  })

  it.each(skills.map((s) => [s.id, s.name] as const))(
    '%s (%s) paper-tests at 0 bet with W/L analysis',
    (strategyId) => {
      const cfg = paperConfig({
        targetMultiplier: 2,
        adjustmentMode:
          strategyId === 'martingale'
            ? 'increase-after-loss'
            : strategyId === 'anti-martingale'
              ? 'increase-after-win'
              : strategyId === 'dalembert' || strategyId === 'fibonacci'
                ? 'custom-progression'
                : 'fixed',
        // signal13 needs history; seed enough lows so filter mode bets
      })

      const history =
        strategyId === 'signal13'
          ? [...Array.from({ length: 6 }, () => 1.1), ...Array.from({ length: 5 }, () => 2)]
          : []

      // Mix of wins (crash >= 2) and losses (crash < 2); signal13 target is 1.3
      const crashes =
        strategyId === 'signal13'
          ? [1.5, 1.1, 2.0, 1.0, 1.4]
          : [2.5, 1.2, 3.0, 1.5, 2.0]

      const report = simulateStrategy({
        strategyId,
        config: cfg,
        crashes,
        history,
      })

      expect(report.betsPlaced + report.skips).toBeGreaterThan(0)
      expect(report.totalProfit).toBe(0) // 0 stake → no money movement
      expect(report.wins + report.losses + report.skips).toBe(report.rounds.length)
      if (report.wins + report.losses > 0) {
        expect(report.winRate).toBe(
          report.wins / (report.wins + report.losses),
        )
      }
    },
  )
})

describe('classic progressions', () => {
  it('martingale doubles stake after loss and resets on win', () => {
    let session = createEngineSession({
      strategyId: 'martingale',
      config: config({
        initialBet: 1,
        maxBetAmount: 100,
        lossMultiplier: 2,
        targetMultiplier: 2,
        adjustmentMode: 'increase-after-loss',
      }),
    })

    let decision = decideRound(session)
    expect(decision).toMatchObject({ action: 'bet', stake: 1, target: 2 })
    session = applyRoundResult(session, 1.5, decision).session // loss
    expect(session.stake).toBe(2)

    decision = decideRound(session)
    expect(decision).toMatchObject({ action: 'bet', stake: 2 })
    session = applyRoundResult(session, 3, decision).session // win
    expect(session.stake).toBe(1)
  })

  it('anti-martingale doubles after win and resets on loss', () => {
    let session = createEngineSession({
      strategyId: 'anti-martingale',
      config: config({
        initialBet: 1,
        maxBetAmount: 100,
        winMultiplier: 2,
        targetMultiplier: 2,
        adjustmentMode: 'increase-after-win',
      }),
    })

    let decision = decideRound(session)
    session = applyRoundResult(session, 3, decision).session
    expect(session.stake).toBe(2)

    decision = decideRound(session)
    session = applyRoundResult(session, 1.1, decision).session
    expect(session.stake).toBe(1)
  })

  it('fixed-amount keeps flat stake', () => {
    let session = createEngineSession({
      strategyId: 'fixed-amount',
      config: config({ initialBet: 0.5, targetMultiplier: 1.5, adjustmentMode: 'fixed' }),
    })
    let decision = decideRound(session)
    session = applyRoundResult(session, 1.1, decision).session
    expect(session.stake).toBe(0.5)
    decision = decideRound(session)
    session = applyRoundResult(session, 2, decision).session
    expect(session.stake).toBe(0.5)
  })

  it('dalembert steps unit up on loss and down on win', () => {
    let session = createEngineSession({
      strategyId: 'dalembert',
      config: config({
        initialBet: 1,
        maxBetAmount: 100,
        unitStep: 1,
        targetMultiplier: 2,
        adjustmentMode: 'custom-progression',
      }),
    })
    let decision = decideRound(session)
    session = applyRoundResult(session, 1.1, decision).session
    expect(session.stake).toBe(2)
    decision = decideRound(session)
    session = applyRoundResult(session, 3, decision).session
    expect(session.stake).toBe(1)
  })

  it('fibonacci advances on loss and steps back on win', () => {
    let session = createEngineSession({
      strategyId: 'fibonacci',
      config: config({
        initialBet: 1,
        maxBetAmount: 100,
        targetMultiplier: 2,
        adjustmentMode: 'custom-progression',
        unitStep: 0,
      }),
    })
    expect(decideRound(session)).toMatchObject({ action: 'bet', stake: 1 })
    session = applyRoundResult(session, 1.0).session // loss → index 1 → still 1
    expect(session.stake).toBe(1)
    session = applyRoundResult(session, 1.0).session // loss → index 2 → 2
    expect(session.stake).toBe(2)
    session = applyRoundResult(session, 3).session // win → index 0 → 1
    expect(session.stake).toBe(1)
  })
})

describe('win / loss vs multiplier', () => {
  it('counts win when crash >= target and loss when crash < target', () => {
    const report = simulateStrategy({
      strategyId: 'fixed-amount',
      config: config({ initialBet: 1, targetMultiplier: 1.5, maxBets: 10 }),
      crashes: [1.5, 1.49, 2.0],
    })
    expect(report.wins).toBe(2)
    expect(report.losses).toBe(1)
    expect(report.totalProfit).toBeCloseTo(1 * 0.5 + -1 + 1 * 0.5, 8)
  })

  it('0-bet paper mode still tracks outcomes with zero profit', () => {
    const report = simulateStrategy({
      strategyId: 'martingale',
      config: paperConfig({
        targetMultiplier: 2,
        adjustmentMode: 'increase-after-loss',
        lossMultiplier: 2,
      }),
      crashes: [3, 1.1, 2.5],
    })
    expect(report.wins).toBe(2)
    expect(report.losses).toBe(1)
    expect(report.totalStaked).toBe(0)
    expect(report.totalProfit).toBe(0)
    expect(report.winRate).toBeCloseTo(2 / 3)
  })
})

describe('progressionKind mapping', () => {
  it('maps each known id to the expected kind', () => {
    expect(progressionKind('martingale', config({ adjustmentMode: 'increase-after-loss' }))).toBe(
      'martingale',
    )
    expect(
      progressionKind('anti-martingale', config({ adjustmentMode: 'increase-after-win' })),
    ).toBe('anti')
    expect(progressionKind('fixed-amount', config({ adjustmentMode: 'fixed' }))).toBe('fixed')
    expect(progressionKind('fixed-multiplier', config({ adjustmentMode: 'fixed' }))).toBe('fixed')
    expect(progressionKind('dalembert', config({ adjustmentMode: 'custom-progression' }))).toBe(
      'dalembert',
    )
    expect(progressionKind('fibonacci', config({ adjustmentMode: 'custom-progression' }))).toBe(
      'fibonacci',
    )
    expect(progressionKind('signal13', config())).toBe('signal13')
  })
})
