/**
 * Sample a Crash-style multiplier.
 * Uses the common e / (1-r) house-edge model with a small instant-bust chance.
 */
export function sampleCrashMultiplier(random: () => number = Math.random): number {
  const r = random()
  // ~1% chance of an instant 1.00 bust (house edge flavor)
  if (r < 0.01) return 1
  const crash = 0.99 / (1 - r)
  return Math.max(1, Math.floor(crash * 100) / 100)
}

/** Generate N synthetic crash points for paper testing. */
export function generateCrashSeries(
  count: number,
  random: () => number = Math.random,
): number[] {
  const series: number[] = []
  for (let i = 0; i < count; i += 1) {
    series.push(sampleCrashMultiplier(random))
  }
  return series
}
