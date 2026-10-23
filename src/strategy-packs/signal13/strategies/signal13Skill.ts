import { defineStrategy } from '../../createStrategy'
import { SIGNAL13_TARGET } from '../signal13'

/** UI / registry metadata for the signal13 skill. Logic lives in `../signal13`. */
export const signal13Strategy = defineStrategy({
  id: 'signal13',
  name: 'Signal 1.3x',
  description:
    'Bet 1.3x after ≥2 of the last 10 crashes are under 1.3. Filter mode (flat) or session martingale.',
  accent: 'cyan',
  icon: 'target',
  configFields: ['lossMultiplier'],
  defaultConfig: {
    initialBet: 0.0001,
    targetMultiplier: SIGNAL13_TARGET,
    adjustmentMode: 'fixed',
    lossMultiplier: 2,
  },
})
