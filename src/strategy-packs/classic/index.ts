import type { StrategyPack } from '../types'
import { antiMartingaleStrategy } from './strategies/antiMartingale'
import { dalembertStrategy } from './strategies/dalembert'
import { fibonacciStrategy } from './strategies/fibonacci'
import { fixedAmountStrategy } from './strategies/fixedAmount'
import { fixedMultiplierStrategy } from './strategies/fixedMultiplier'
import { martingaleStrategy } from './strategies/martingale'

/** Built-in classic Crash betting systems. */
export const classicStrategyPack: StrategyPack = {
  id: 'classic',
  name: 'Classic',
  description: 'Standard Crash progression systems.',
  version: '1.0.0',
  strategies: [
    martingaleStrategy,
    antiMartingaleStrategy,
    fixedAmountStrategy,
    fixedMultiplierStrategy,
    dalembertStrategy,
    fibonacciStrategy,
  ],
}
