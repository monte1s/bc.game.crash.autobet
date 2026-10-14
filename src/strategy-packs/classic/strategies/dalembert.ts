import { defineStrategy } from '../../createStrategy'

export const dalembertStrategy = defineStrategy({
  id: 'dalembert',
  name: "D'Alembert",
  description: 'Adjust the bet by a fixed unit after wins or losses.',
  accent: 'cyan',
  icon: 'scale',
  configFields: ['unitStep'],
  defaultConfig: {
    adjustmentMode: 'custom-progression',
    unitStep: 0.0001,
  },
})
