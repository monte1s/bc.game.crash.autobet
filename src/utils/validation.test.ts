import { describe, expect, it } from 'vitest'
import { DEFAULT_STRATEGY_CONFIG } from '../data/defaults'
import { configToFormValues, validateStrategyForm } from './validation'

describe('validateStrategyForm — 0 bet paper mode', () => {
  it('allows initial bet of 0', () => {
    const values = configToFormValues({
      ...DEFAULT_STRATEGY_CONFIG,
      initialBet: 0,
      maxBetAmount: 0,
      unitStep: 0,
    })
    const result = validateStrategyForm(values)
    expect(result.errors).toEqual({})
    expect(result.config?.initialBet).toBe(0)
    expect(result.config?.maxBetAmount).toBe(0)
  })

  it('still rejects negative bets', () => {
    const values = configToFormValues(DEFAULT_STRATEGY_CONFIG)
    values.initialBet = '-0.1'
    const result = validateStrategyForm(values)
    expect(result.errors.initialBet).toMatch(/cannot be negative/)
  })

  it('requires target multiplier >= 1.01', () => {
    const values = configToFormValues(DEFAULT_STRATEGY_CONFIG)
    values.targetMultiplier = '1'
    const result = validateStrategyForm(values)
    expect(result.errors.targetMultiplier).toMatch(/at least 1.01/)
  })
})
