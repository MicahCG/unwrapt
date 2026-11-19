// Pure helpers for validate-address: decide whether a standardized address from the US Census
// geocoder is "the same" as what the user typed, and build a friendly suggestion when it isn't.

export type Addr = { street: string; city: string; state: string; zip: string };

const SUFFIXES: Record<string, string> = {
  avenue: "ave", street: "st", road: "rd", drive: "dr", lane: "ln", boulevard: "blvd", court: "ct",
  place: "pl", circle: "cir", highway: "hwy", parkway: "pkwy", terrace: "ter", trail: "trl", square: "sq",
};
const DIRECTIONS: Record<string, string> = {
  north: "n", south: "s", east: "e", west: "w", northeast: "ne", northwest: "nw", southeast: "se", southwest: "sw",
};

export const isPoBox = (street: string): boolean => /^\s*p\.?\s*o\.?\s*box\b/i.test(street);

/** Split a trailing unit ("Apt 4B", "#12", "Suite 200") off a street line; the geocoder only knows the building. */
export const splitUnit = (street: string): { base: string; unit: string } => {
  const m = street.match(/^(.*?)[\s,]*((?:\b(?:apt|apartment|unit|suite|ste)\b\.?|#)\s*[\w-]+.*)$/i);
  return m ? { base: m[1].trim(), unit: m[2].trim() } : { base: street.trim(), unit: "" };
};

/** Lowercase, drop punctuation, and fold "Avenue"/"Ave", "North"/"N" so cosmetic differences don't count. */
export const normalizeStreet = (street: string): string =>
  street
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SUFFIXES[w] ?? DIRECTIONS[w] ?? w)
    .join(" ");

const normalizeWord = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const titleCase = (s: string): string =>
  s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase())
    // keep directional/unit abbreviations and ordinals sensible: "Nw", "Ne" -> "NW", "NE"; "3Rd" -> "3rd"
    .replace(/\b(N|S|E|W|Ne|Nw|Se|Sw)\b/g, (d) => d.toUpperCase())
    .replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (_m, n, suf) => `${n}${suf.toLowerCase()}`);

/** "1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500" -> parts. */
export const parseMatchedAddress = (matched: string): Addr | null => {
  const parts = matched.split(",").map((p) => p.trim());
  if (parts.length < 4) return null;
  const [zip, state, city] = [parts[parts.length - 1], parts[parts.length - 2], parts[parts.length - 3]];
  const street = parts.slice(0, parts.length - 3).join(", ");
  return { street, city, state, zip: zip.slice(0, 5) };
};

/** Null when the geocoder's answer is the same address (ignoring case/abbreviations), else a title-cased suggestion. */
export const buildSuggestion = (input: Addr, matchedRaw: string): Addr | null => {
  const matched = parseMatchedAddress(matchedRaw);
  if (!matched) return null;
  const { base, unit } = splitUnit(input.street);
  const sameStreet = normalizeStreet(base) === normalizeStreet(matched.street);
  const sameCity = normalizeWord(input.city) === normalizeWord(matched.city);
  const sameState = normalizeWord(input.state) === normalizeWord(matched.state) || input.state.trim().length > 2; // full state names are checked elsewhere
  const sameZip = input.zip.trim().slice(0, 5) === matched.zip;
  if (sameStreet && sameCity && sameState && sameZip) return null;
  const street = titleCase(matched.street) + (unit ? ` ${unit}` : "");
  return { street, city: titleCase(matched.city), state: matched.state.toUpperCase(), zip: matched.zip };
};
