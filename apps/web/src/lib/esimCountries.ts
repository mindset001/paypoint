export interface EsimCountry { code: string; name: string }

// Fallback only, used if the live /esim/countries fetch fails — the real
// list (currently 202 countries) comes from the backend, derived from
// eSIM Access's own package catalog.
export const ESIM_COUNTRIES_FALLBACK: EsimCountry[] = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AE', name: 'UAE' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'GH', name: 'Ghana' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'TR', name: 'Turkey' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'MY', name: 'Malaysia' },
];

// Computes the flag emoji for any ISO 3166-1 alpha-2 code from Unicode
// Regional Indicator Symbols — works for all 202 real countries with no
// per-country data needed.
export const esimFlagFor = (countryCode: string): string => {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) return '🌍';
  const codePoints = Array.from(countryCode.toUpperCase()).map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
};
