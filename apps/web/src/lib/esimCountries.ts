export interface EsimCountry { code: string; name: string; flag: string }

// Small curated list — there's no confirmed "list countries" endpoint on
// the provider, so this is a static set the user can expand later.
export const ESIM_COUNTRIES: EsimCountry[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
];

export const esimFlagFor = (countryCode: string): string =>
  ESIM_COUNTRIES.find((c) => c.code === countryCode)?.flag ?? '🌍';

export const esimCountryNameFor = (countryCode: string): string =>
  ESIM_COUNTRIES.find((c) => c.code === countryCode)?.name ?? countryCode;
