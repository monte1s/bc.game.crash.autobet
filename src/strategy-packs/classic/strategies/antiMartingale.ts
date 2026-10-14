import { defineStrategy } from '../../createStrategy'

export const antiMartingaleStrategy = defineStrategy({
  id: 'anti-martingale',
  name: 'Anti-Martingale',
  description: 'Increase the bet after a win.',
  accent: 'blue',
  icon: 'stairs',
  configFields: ['winMultiplier'],
  defaultConfig: {
    adjustmentMode: 'increase-after-win',
    winMultiplier: 2,
  },
})
