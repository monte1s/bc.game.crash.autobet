import { defineStrategy } from '../../createStrategy'

export const fixedMultiplierStrategy = defineStrategy({
  id: 'fixed-multiplier',
  name: 'Fixed Multiplier',
  description: 'Use a configured target cash-out multiplier.',
  accent: 'pink',
  icon: 'target',
  defaultConfig: {
    adjustmentMode: 'fixed',
    targetMultiplier: 1.5,
  },
})
