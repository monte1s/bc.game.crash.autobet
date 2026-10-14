import { defineStrategy } from '../../createStrategy'

export const fixedAmountStrategy = defineStrategy({
  id: 'fixed-amount',
  name: 'Fixed Amount',
  description: 'Keep the bet amount constant.',
  accent: 'yellow',
  icon: 'coins',
  defaultConfig: {
    adjustmentMode: 'fixed',
    initialBet: 0.0001,
    targetMultiplier: 2,
    maxBets: 10,
  },
})
