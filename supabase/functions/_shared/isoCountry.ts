/**
 * ISO 3166-1 alpha-2 codes for Goody mailing addresses.
 * Goody rejects English names such as "United States"; it requires "US".
 * Two-letter codes are accepted in any case. Common non-ISO abbreviations
 * such as "UK" are mapped to the real alpha-2 code ("GB").
 */

export const ISO_COUNTRY_ALIASES: readonly (readonly [string, readonly string[]])[] = [
  ["US", ["United States", "United States of America", "USA", "US of A"]],
  ["CA", ["Canada", "CAN"]],
  ["GB", ["United Kingdom", "UK", "Great Britain", "Britain", "England", "Scotland", "Wales", "Northern Ireland", "GBR"]],
  ["AU", ["Australia", "AUS"]],
  ["AD", ["Andorra"]],
  ["AE", ["United Arab Emirates", "UAE"]],
  ["AF", ["Afghanistan"]],
  ["AG", ["Antigua and Barbuda"]],
  ["AL", ["Albania"]],
  ["AM", ["Armenia"]],
  ["AO", ["Angola"]],
  ["AR", ["Argentina"]],
  ["AT", ["Austria"]],
  ["AZ", ["Azerbaijan"]],
  ["BA", ["Bosnia and Herzegovina"]],
  ["BB", ["Barbados"]],
  ["BD", ["Bangladesh"]],
  ["BE", ["Belgium"]],
  ["BF", ["Burkina Faso"]],
  ["BG", ["Bulgaria"]],
  ["BH", ["Bahrain"]],
  ["BI", ["Burundi"]],
  ["BJ", ["Benin"]],
  ["BN", ["Brunei", "Brunei Darussalam"]],
  ["BO", ["Bolivia"]],
  ["BR", ["Brazil"]],
  ["BS", ["Bahamas"]],
  ["BT", ["Bhutan"]],
  ["BW", ["Botswana"]],
  ["BY", ["Belarus"]],
  ["BZ", ["Belize"]],
  ["CD", ["Democratic Republic of the Congo", "DR Congo", "DRC"]],
  ["CF", ["Central African Republic"]],
  ["CG", ["Republic of the Congo", "Congo Brazzaville"]],
  ["CH", ["Switzerland"]],
  ["CI", ["Côte d'Ivoire", "Ivory Coast"]],
  ["CL", ["Chile"]],
  ["CM", ["Cameroon"]],
  ["CN", ["China", "People's Republic of China"]],
  ["CO", ["Colombia"]],
  ["CR", ["Costa Rica"]],
  ["CU", ["Cuba"]],
  ["CV", ["Cabo Verde", "Cape Verde"]],
  ["CY", ["Cyprus"]],
  ["CZ", ["Czechia", "Czech Republic"]],
  ["DE", ["Germany"]],
  ["DJ", ["Djibouti"]],
  ["DK", ["Denmark"]],
  ["DM", ["Dominica"]],
  ["DO", ["Dominican Republic"]],
  ["DZ", ["Algeria"]],
  ["EC", ["Ecuador"]],
  ["EE", ["Estonia"]],
  ["EG", ["Egypt"]],
  ["ER", ["Eritrea"]],
  ["ES", ["Spain"]],
  ["ET", ["Ethiopia"]],
  ["FI", ["Finland"]],
  ["FJ", ["Fiji"]],
  ["FM", ["Micronesia", "Federated States of Micronesia"]],
  ["FR", ["France"]],
  ["GA", ["Gabon"]],
  ["GD", ["Grenada"]],
  ["GE", ["Georgia"]],
  ["GH", ["Ghana"]],
  ["GM", ["Gambia"]],
  ["GN", ["Guinea"]],
  ["GQ", ["Equatorial Guinea"]],
  ["GR", ["Greece", "EL"]],
  ["GT", ["Guatemala"]],
  ["GW", ["Guinea-Bissau"]],
  ["GY", ["Guyana"]],
  ["HN", ["Honduras"]],
  ["HR", ["Croatia"]],
  ["HT", ["Haiti"]],
  ["HU", ["Hungary"]],
  ["ID", ["Indonesia"]],
  ["IE", ["Ireland"]],
  ["IL", ["Israel"]],
  ["IN", ["India"]],
  ["IQ", ["Iraq"]],
  ["IR", ["Iran"]],
  ["IS", ["Iceland"]],
  ["IT", ["Italy"]],
  ["JM", ["Jamaica"]],
  ["JO", ["Jordan"]],
  ["JP", ["Japan"]],
  ["KE", ["Kenya"]],
  ["KG", ["Kyrgyzstan"]],
  ["KH", ["Cambodia"]],
  ["KI", ["Kiribati"]],
  ["KM", ["Comoros"]],
  ["KN", ["Saint Kitts and Nevis"]],
  ["KP", ["North Korea", "Democratic People's Republic of Korea"]],
  ["KR", ["South Korea", "Republic of Korea"]],
  ["KW", ["Kuwait"]],
  ["KZ", ["Kazakhstan"]],
  ["LA", ["Laos"]],
  ["LB", ["Lebanon"]],
  ["LC", ["Saint Lucia"]],
  ["LI", ["Liechtenstein"]],
  ["LK", ["Sri Lanka"]],
  ["LR", ["Liberia"]],
  ["LS", ["Lesotho"]],
  ["LT", ["Lithuania"]],
  ["LU", ["Luxembourg"]],
  ["LV", ["Latvia"]],
  ["LY", ["Libya"]],
  ["MA", ["Morocco"]],
  ["MC", ["Monaco"]],
  ["MD", ["Moldova"]],
  ["ME", ["Montenegro"]],
  ["MG", ["Madagascar"]],
  ["MH", ["Marshall Islands"]],
  ["MK", ["North Macedonia", "Macedonia"]],
  ["ML", ["Mali"]],
  ["MM", ["Myanmar", "Burma"]],
  ["MN", ["Mongolia"]],
  ["MR", ["Mauritania"]],
  ["MT", ["Malta"]],
  ["MU", ["Mauritius"]],
  ["MV", ["Maldives"]],
  ["MW", ["Malawi"]],
  ["MX", ["Mexico"]],
  ["MY", ["Malaysia"]],
  ["MZ", ["Mozambique"]],
  ["NA", ["Namibia"]],
  ["NE", ["Niger"]],
  ["NG", ["Nigeria"]],
  ["NI", ["Nicaragua"]],
  ["NL", ["Netherlands", "Holland"]],
  ["NO", ["Norway"]],
  ["NP", ["Nepal"]],
  ["NR", ["Nauru"]],
  ["NZ", ["New Zealand"]],
  ["OM", ["Oman"]],
  ["PA", ["Panama"]],
  ["PE", ["Peru"]],
  ["PG", ["Papua New Guinea"]],
  ["PH", ["Philippines"]],
  ["PK", ["Pakistan"]],
  ["PL", ["Poland"]],
  ["PS", ["Palestine", "State of Palestine"]],
  ["PT", ["Portugal"]],
  ["PW", ["Palau"]],
  ["PY", ["Paraguay"]],
  ["QA", ["Qatar"]],
  ["RO", ["Romania"]],
  ["RS", ["Serbia"]],
  ["RU", ["Russia", "Russian Federation"]],
  ["RW", ["Rwanda"]],
  ["SA", ["Saudi Arabia"]],
  ["SB", ["Solomon Islands"]],
  ["SC", ["Seychelles"]],
  ["SD", ["Sudan"]],
  ["SE", ["Sweden"]],
  ["SG", ["Singapore"]],
  ["SI", ["Slovenia"]],
  ["SK", ["Slovakia"]],
  ["SL", ["Sierra Leone"]],
  ["SM", ["San Marino"]],
  ["SN", ["Senegal"]],
  ["SO", ["Somalia"]],
  ["SR", ["Suriname"]],
  ["SS", ["South Sudan"]],
  ["ST", ["São Tomé and Príncipe"]],
  ["SV", ["El Salvador"]],
  ["SY", ["Syria"]],
  ["SZ", ["Eswatini", "Swaziland"]],
  ["TD", ["Chad"]],
  ["TG", ["Togo"]],
  ["TH", ["Thailand"]],
  ["TJ", ["Tajikistan"]],
  ["TL", ["Timor-Leste", "East Timor"]],
  ["TM", ["Turkmenistan"]],
  ["TN", ["Tunisia"]],
  ["TO", ["Tonga"]],
  ["TR", ["Turkey", "Türkiye"]],
  ["TT", ["Trinidad and Tobago"]],
  ["TV", ["Tuvalu"]],
  ["TW", ["Taiwan"]],
  ["TZ", ["Tanzania"]],
  ["UA", ["Ukraine"]],
  ["UG", ["Uganda"]],
  ["UY", ["Uruguay"]],
  ["UZ", ["Uzbekistan"]],
  ["VA", ["Vatican City", "Holy See", "Vatican"]],
  ["VC", ["Saint Vincent and the Grenadines"]],
  ["VE", ["Venezuela"]],
  ["VN", ["Vietnam", "Viet Nam"]],
  ["VU", ["Vanuatu"]],
  ["WS", ["Samoa"]],
  ["XK", ["Kosovo"]],
  ["YE", ["Yemen"]],
  ["ZA", ["South Africa"]],
  ["ZM", ["Zambia"]],
  ["ZW", ["Zimbabwe"]],
  ["AS", ["American Samoa"]],
  ["BM", ["Bermuda"]],
  ["KY", ["Cayman Islands"]],
  ["FO", ["Faroe Islands"]],
  ["GI", ["Gibraltar"]],
  ["GL", ["Greenland"]],
  ["GU", ["Guam"]],
  ["GG", ["Guernsey"]],
  ["HK", ["Hong Kong"]],
  ["IM", ["Isle of Man"]],
  ["JE", ["Jersey"]],
  ["MO", ["Macao", "Macau"]],
  ["MP", ["Northern Mariana Islands"]],
  ["PR", ["Puerto Rico"]],
  ["VG", ["British Virgin Islands"]],
  ["VI", ["US Virgin Islands", "United States Virgin Islands"]],
];

export function normalizeCountryKey(value: string): string {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the /, "");
}

const ALIAS_TO_CODE = new Map<string, string>();

for (const [code, names] of ISO_COUNTRY_ALIASES) {
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new Error(`Invalid ISO country code: ${code}`);
  }
  for (const name of names) {
    const key = normalizeCountryKey(name);
    if (!key) throw new Error(`Empty ISO country alias for ${code}`);
    const existing = ALIAS_TO_CODE.get(key);
    if (existing && existing !== code) {
      throw new Error(`ISO country alias "${name}" maps to both ${existing} and ${code}`);
    }
    ALIAS_TO_CODE.set(key, code);
  }
}

/** Map a country name or code to ISO 3166-1 alpha-2. Blank or unknown values return null. */
export function toIso3166Alpha2(country: string | null | undefined): string | null {
  if (typeof country !== "string") return null;
  const key = normalizeCountryKey(country);
  if (!key) return null;
  const alias = ALIAS_TO_CODE.get(key);
  if (alias) return alias;
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  return null;
}

/**
 * Country for a Goody mailing address.
 * A blank value keeps the historical default of "US".
 * A present value is sent only after it resolves to an alpha-2 code.
 */
export function goodyMailingCountry(country: string | null | undefined): string | null {
  if (typeof country !== "string" || !country.trim()) return "US";
  return toIso3166Alpha2(country);
}
