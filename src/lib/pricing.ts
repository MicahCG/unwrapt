/** Flat Unwrapt service fee added to every wallet-paid gift (mirrors SERVICE_FEE in the edge functions). */
export const SERVICE_FEE = 7;

/** What a wallet-paid gift costs before shipping & tax: catalog price plus the service fee. */
export const withServiceFee = (price: number): number => Math.round((price + SERVICE_FEE) * 100) / 100;
