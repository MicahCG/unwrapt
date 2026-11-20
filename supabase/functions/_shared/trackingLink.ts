// A clickable tracking link for a carrier tracking number, so the email needs no Goody account.
export const trackingUrl = (raw: string): string => {
  const n = raw.replace(/\s+/g, "").toUpperCase();
  const q = encodeURIComponent(n);
  if (/^1Z[0-9A-Z]{16}$/.test(n)) return `https://www.ups.com/track?tracknum=${q}`;
  if (/^9\d{19,25}$/.test(n)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${q}`;
  if (/^(\d{12}|\d{15})$/.test(n)) return `https://www.fedex.com/fedextrack/?trknbr=${q}`;
  // Unknown carrier: a universal tracker detects it from the number.
  return `https://parcelsapp.com/en/tracking/${q}`;
};
