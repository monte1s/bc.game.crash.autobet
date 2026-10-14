import { defineStrategy } from '../../createStrategy'

export const martingaleStrategy = defineStrategy({
  id: 'martingale',
  name: 'Martingale',
  description: 'Increase the bet after a loss.',
  accent: 'green',
  icon: 'trending-up',
  configFields: ['lossMultiplier'],
  defaultConfig: {
    adjustmentMode: 'increase-after-loss',
    lossMultiplier: 2,
  },
})
