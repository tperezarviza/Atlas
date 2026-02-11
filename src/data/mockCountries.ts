import type { CountryProfile } from '../types';

export const mockCountries: CountryProfile[] = [
  {
    code: 'US', name: 'United States', flag: '🇺🇸', region: 'North America',
    capital: 'Washington, D.C.', population: 335000000, gdp: 27360, government: 'Federal Presidential Republic',
    leader: 'Donald Trump', leaderTitle: 'President',
    military: { activePersonnel: 1328000, reservePersonnel: 799000, nuclearStatus: 'declared', branches: ['Army', 'Navy', 'Air Force', 'Marines', 'Space Force', 'Coast Guard'] },
    alliances: ['NATO', 'Five Eyes', 'QUAD', 'AUKUS'], sanctioned: false, sanctionPrograms: [],
    recentEvents: 12, cdsSpread: 35, activeConflicts: 0,
  },
  {
    code: 'RU', name: 'Russia', flag: '🇷🇺', region: 'Eastern Europe',
    capital: 'Moscow', population: 144000000, gdp: 2020, government: 'Federal Semi-Presidential Republic',
    leader: 'Vladimir Putin', leaderTitle: 'President',
    military: { activePersonnel: 1150000, reservePersonnel: 2000000, nuclearStatus: 'declared', branches: ['Ground Forces', 'Navy', 'Aerospace Forces', 'Airborne', 'Strategic Rocket Forces'] },
    alliances: ['CSTO', 'SCO'], sanctioned: true, sanctionPrograms: ['RUSSIA', 'UKRAINE-EO13661'],
    recentEvents: 245, cdsSpread: 450, activeConflicts: 1,
  },
  {
    code: 'CN', name: 'China', flag: '🇨🇳', region: 'East Asia',
    capital: 'Beijing', population: 1425000000, gdp: 17790, government: 'One-Party Socialist Republic',
    leader: 'Xi Jinping', leaderTitle: 'President',
    military: { activePersonnel: 2035000, reservePersonnel: 510000, nuclearStatus: 'declared', branches: ['Ground Force', 'Navy', 'Air Force', 'Rocket Force', 'Strategic Support Force'] },
    alliances: ['SCO'], sanctioned: false, sanctionPrograms: [],
    recentEvents: 8, cdsSpread: 72, activeConflicts: 0,
  },
  {
    code: 'IR', name: 'Iran', flag: '🇮🇷', region: 'Middle East',
    capital: 'Tehran', population: 88500000, gdp: 402, government: 'Islamic Republic',
    leader: 'Masoud Pezeshkian', leaderTitle: 'President',
    military: { activePersonnel: 580000, reservePersonnel: 350000, nuclearStatus: 'threshold', branches: ['Army', 'Navy', 'Air Force', 'IRGC', 'Basij'] },
    alliances: ['SCO'], sanctioned: true, sanctionPrograms: ['IRAN', 'SDGT'],
    recentEvents: 18, cdsSpread: 890, activeConflicts: 0,
  },
  {
    code: 'UA', name: 'Ukraine', flag: '🇺🇦', region: 'Eastern Europe',
    capital: 'Kyiv', population: 37000000, gdp: 179, government: 'Unitary Semi-Presidential Republic',
    leader: 'Volodymyr Zelenskyy', leaderTitle: 'President',
    military: { activePersonnel: 900000, reservePersonnel: 400000, nuclearStatus: 'none', branches: ['Ground Forces', 'Air Force', 'Navy', 'Territorial Defense'] },
    alliances: [], sanctioned: false, sanctionPrograms: [],
    recentEvents: 320, cdsSpread: 3200, activeConflicts: 1,
  },
];
