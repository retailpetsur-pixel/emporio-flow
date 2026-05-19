export function nextDaySuggestedProduction(elaborated: number, waste: number) {
  return Math.max(Number(elaborated || 0) - Number(waste || 0), 0);
}
