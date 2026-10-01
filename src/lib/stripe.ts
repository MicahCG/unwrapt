/** Shared Stripe price IDs  -  keep in sync with create-subscription-checkout edge function. */
export const VIP_MONTHLY_PRICE_ID = 'price_1SbpNlRvvOzjYUzy9iakOpwv';
export const VIP_MONTHLY_AMOUNT_LABEL = '$4.99';

/** Paid VIP access  -  free users are blocked from the product surface. */
export function isPaidVip(profile: {
  subscription_tier?: string | null;
  subscription_status?: string | null;
} | null | undefined): boolean {
  if (!profile || profile.subscription_tier !== 'vip') return false;
  const status = (profile.subscription_status || 'active').toLowerCase();
  return status === 'active' || status === 'trialing';
}
