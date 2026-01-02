/**
 * Calculate payout amounts for marketplace transactions
 */

/**
 * Calculate platform fee and dealer payout amount
 * @param rentalAmountCents - Total rental amount in cents (before fees)
 * @param platformFeePercent - Platform fee percentage (e.g., 0.1 for 10%)
 * @returns Object with platform fee and dealer payout amounts in cents
 */
export function calculatePayoutAmounts(
  rentalAmountCents: number,
  platformFeePercent: number = 0.1
): {
  platformFeeCents: number
  dealerPayoutCents: number
} {
  const platformFeeCents = Math.round(rentalAmountCents * platformFeePercent)
  const dealerPayoutCents = rentalAmountCents - platformFeeCents

  return {
    platformFeeCents,
    dealerPayoutCents,
  }
}

/**
 * Calculate total booking amount including platform fee
 * @param rentalAmountCents - Base rental amount in cents
 * @param platformFeePercent - Platform fee percentage (e.g., 0.1 for 10%)
 * @returns Total amount renter pays (rental + platform fee)
 */
export function calculateTotalWithFee(
  rentalAmountCents: number,
  platformFeePercent: number = 0.1
): number {
  return rentalAmountCents + Math.round(rentalAmountCents * platformFeePercent)
}