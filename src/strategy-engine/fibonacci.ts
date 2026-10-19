/** Standard Fibonacci multipliers used for stake sizing (1-based steps). */
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987]

export function fibFactorAt(index: number): number {
  if (index <= 0) return FIB[0]
  if (index >= FIB.length) return FIB[FIB.length - 1]
  return FIB[index]
}

/** On win, step back two; on loss, advance one. */
export function nextFibIndex(index: number, won: boolean): number {
  if (won) return Math.max(0, index - 2)
  return Math.min(FIB.length - 1, index + 1)
}
