// City presets — auto-fills night cap + suggests permit types when a city is selected
// Used in Onboarding wizard and AddProperty page
// Last verified: February 2026

export const CITY_PRESETS = {
  'Austin': {
    state: 'TX',
    nightCap: null,
    permitTypes: ['STR License (2-year)', 'Hotel Occupancy Tax Registration', 'Fire Safety Inspection'],
    notes: 'License required — operating without one can result in fines and legal action. License number must appear in all ads (effective Oct 1, 2025). From July 1, 2026, platforms must delist unlicensed properties. Platforms collect HOT on your behalf since April 2025.',
    applicationUrl: 'https://www.austintexas.gov/department/short-term-rentals',
  },
  'Nashville': {
    state: 'TN',
    nightCap: null,
    permitTypes: ['Owner-Occupied STR Permit', 'Non-Owner STR Permit', 'Fire Inspection Certificate'],
    notes: 'Two permit types: owner-occupied (broadly available) and non-owner-occupied (restricted to commercial zones only — banned in residential R, RS, and RM zones). Annual permit renewal required. Permit number must be displayed in listings.',
    applicationUrl: 'https://www.nashville.gov/departments/codes/short-term-rentals',
  },
  'Portland': {
    state: 'OR',
    nightCap: 95,
    permitTypes: ['Accessory STR Permit (Type A or B)', 'Business License'],
    notes: 'Owner-occupancy required — you must live in the property at least 270 days/year. Whole-home investor rentals are NOT allowed in residential zones. 95 unhosted nights/year cap (hosted nights are unlimited). Permit number required in all ads.',
    applicationUrl: 'https://www.portland.gov/bds/astr-permits',
  },
  'Denver': {
    state: 'CO',
    nightCap: null,
    permitTypes: ['Short-Term Rental License', 'General Business License', 'Lodger\'s Tax Registration'],
    notes: 'Primary residence only — you must actually live there. Both a General Business License AND a Short-Term Rental License are required. Annual renewal ($100 fee). Providing false information about primary residence can result in felony charges.',
    applicationUrl: 'https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Business-Licensing/Business-licenses/Short-term-rentals',
  },
  'New York City': {
    state: 'NY',
    nightCap: null,
    permitTypes: ['STR Registration (Local Law 18)', 'OSE Registration'],
    notes: 'Host must be present during all guest stays. Max 2 guests at a time. Platforms cannot process bookings without a valid OSE registration. Up to $5,000/violation. One of the strictest STR regimes in the US.',
    applicationUrl: 'https://www.nyc.gov/site/specialenforcement/registration/registration.page',
  },
  'Los Angeles': {
    state: 'CA',
    nightCap: 120,
    permitTypes: ['Home-Sharing Registration', 'Transient Occupancy Tax Registration'],
    notes: 'Primary residence only — non-primary homes cannot be listed at all. 120 unhosted nights/year cap (standard registration). Extended Home-Sharing permit available for year-round hosting if eligible. Fines up to $2,000/day for violations.',
    applicationUrl: 'https://planning.lacity.gov/blog/what-home-sharing-program',
  },
  'Miami': {
    state: 'FL',
    nightCap: null,
    permitTypes: ['BTR License', 'State DBPR License', 'Tourist Development Tax Registration'],
    notes: 'Both city BTR and state DBPR license required. Miami Beach bans STRs in most residential districts — verify zoning before listing. City of Miami is also generally restrictive. Check your specific address carefully.',
    applicationUrl: 'https://www.miamidade.gov/permits',
  },
  'Chicago': {
    state: 'IL',
    nightCap: null,
    permitTypes: ['Shared Housing Unit License', 'Vacation Rental License'],
    notes: 'Two license types: Shared Housing (renting a room while you live there) vs Vacation Rental (whole unit). Hosts must submit monthly data reports to the city (required since 2025). License required for every unit.',
    applicationUrl: 'https://www.chicago.gov/city/en/depts/bacp/sbc/short-term-residential-rentals.html',
  },
  'Houston': {
    state: 'TX',
    nightCap: null,
    permitTypes: ['Certificate of Registration', 'Hotel Occupancy Tax Registration'],
    notes: "Houston's first STR ordinance took effect Jan 1, 2026. Certificate of Registration required per unit ($275 application fee, annual renewal). Operators must register, observe noise/safety/waste rules, and file HOT returns.",
    applicationUrl: 'https://www.houstontx.gov/planning/DevelopRegs/short-term-rentals.html',
  },
  'San Antonio': {
    state: 'TX',
    nightCap: null,
    permitTypes: ['STR Permit', 'Hotel Occupancy Tax Registration'],
    notes: 'Permit required and must be renewed annually. Permit number required in all listings. 9% city + state hotel occupancy tax applies.',
    applicationUrl: 'https://www.sanantonio.gov/DSD/Permitting/STR',
  },
  'Palm Springs': {
    state: 'CA',
    nightCap: null,
    permitTypes: ['Vacation Rental Certificate', 'TOT Registration'],
    notes: 'Unique cap: 26 CONTRACTS/year — not nights. Each booking counts as one contract regardless of how many nights it covers. Certificate renewal required annually.',
    applicationUrl: 'https://www.palmspringsca.gov/government/departments/planning-services/vacation-rentals',
  },
  'Other': {
    state: '',
    nightCap: null,
    permitTypes: ['STR License', 'Business License', 'Fire Safety Inspection'],
    notes: '',
    applicationUrl: '',
  },
};

export const CITY_NAMES = Object.keys(CITY_PRESETS);

export function getPreset(city) {
  return CITY_PRESETS[city] || CITY_PRESETS['Other'];
}
