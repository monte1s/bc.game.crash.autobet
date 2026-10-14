import { defineStrategy } from '../../createStrategy'

export const fibonacciStrategy = defineStrategy({
  id: 'fibonacci',
  name: 'Fibonacci',
  description: 'Adjust bet sizing using a Fibonacci sequence.',
  accent: 'purple',
  icon: 'spiral',
  defaultConfig: {
    adjustmentMode: 'custom-progression',
  },
})
