/**
 * Calculate protection plan fee in cents based on daily fee and rental duration
 */
export function calcPlanFee(dailyFeeCents: number, startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return dailyFeeCents * diffDays
}