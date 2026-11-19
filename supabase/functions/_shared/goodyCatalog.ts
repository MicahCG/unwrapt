// Pure helpers for reading Goody's catalog (no I/O), shared by thea-chat and tested on their own.

type Brand = { shipping_price?: number | null; free_shipping_minimum?: number | null } | null | undefined;
type Category = { name?: string | null; sets?: string[] | null } | null | undefined;

const dollars = (cents: unknown): number | null => (typeof cents === "number" && Number.isFinite(cents) ? Math.round(cents) / 100 : null);

/** Goody reports the brand's shipping price and free-shipping minimum in cents; null when it does not say. */
export const shippingFromBrand = (brand: Brand): { shipping_price: number | null; free_shipping_minimum: number | null } => ({
  shipping_price: dollars(brand?.shipping_price),
  free_shipping_minimum: dollars(brand?.free_shipping_minimum),
});

/** Names of the occasion categories a product belongs to ("Birthday", "Christmas"...), lowercased. */
export const productOccasions = (categories: Category[] | null | undefined): string[] =>
  (categories || [])
    .filter((c): c is NonNullable<Category> => Boolean(c) && Array.isArray(c!.sets) && c!.sets!.includes("occasions") && typeof c!.name === "string")
    .map((c) => c.name!.trim().toLowerCase())
    .filter(Boolean);

/** Does a product belong to the occasion asked for ("birthday", "holiday", "christmas")? Matches loosely. */
export const matchesOccasion = (occasions: string[] | undefined, wanted: string | undefined): boolean => {
  const w = (wanted || "").trim().toLowerCase();
  if (!w || !occasions?.length) return false;
  const aliases = w === "holiday" || w === "holidays" ? ["holiday", "christmas", "hanukkah"] : [w];
  return occasions.some((o) => aliases.some((a) => o.includes(a) || a.includes(o)));
};

export const PAGE_SIZE = 100;
export const MAX_CATALOG_PAGES = 40;

/** Pages still to fetch after page 1, given Goody's total_count (capped so a huge catalog cannot run away). */
export const remainingPages = (totalCount: unknown): number[] => {
  const total = typeof totalCount === "number" && totalCount > 0 ? totalCount : 0;
  const pages = Math.min(MAX_CATALOG_PAGES, Math.ceil(total / PAGE_SIZE));
  return Array.from({ length: Math.max(0, pages - 1) }, (_v, i) => i + 2);
};

/**
 * Catalog products whose full name appears in a reply. Lets a reply that names a gift ("the Holiday Cookie
 * & Brownie Duo") always come with its picture. Names under 10 characters are ignored to avoid accidents.
 */
export const productsMentionedIn = <T extends { id: string; name: string }>(reply: string, catalog: T[], limit = 6): T[] => {
  const text = reply.toLowerCase();
  const hits = catalog.filter((p) => {
    const name = p.name.trim().toLowerCase();
    return name.length >= 10 && text.includes(name);
  });
  // A name that sits inside a longer matched name is the same mention ("Grateful Mug" in "Grateful Mug Set of 4").
  const longestFirst = hits.sort((a, b) => b.name.length - a.name.length);
  return longestFirst
    .filter((p, i) => !longestFirst.slice(0, i).some((longer) => longer.name.toLowerCase().includes(p.name.trim().toLowerCase())))
    .slice(0, limit);
};

/** "Free shipping", "+ $10 shipping" or null when Goody gives no figure. Used for the gift cards. */
export const shippingLabel = (
  price: number,
  shipping: { shipping_price?: number | null; free_shipping_minimum?: number | null },
): string | null => {
  const ship = shipping.shipping_price;
  const min = shipping.free_shipping_minimum;
  if (typeof min === "number" && min > 0 && price >= min) return "Free shipping";
  if (typeof ship !== "number") return null;
  if (ship <= 0) return "Free shipping";
  return `+ $${Number.isInteger(ship) ? ship : ship.toFixed(2)} shipping`;
};
