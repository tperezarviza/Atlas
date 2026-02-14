import type { ArmedGroup } from '../types';

export const mockArmedGroups: ArmedGroup[] = [
  {
    id: 'ag-isis', name: 'Islamic State (ISIS/ISIL)', aliases: ['Daesh', 'ISIL', 'IS'],
    type: 'jihadist', ideology: 'Salafi-jihadism, caliphate restoration',
    status: 'Degraded — insurgency mode', foundedYear: 2013,
    regions: ['Middle East', 'North Africa', 'West Africa', 'Central Asia'],
    countries: ['Iraq', 'Syria', 'Libya', 'Mozambique', 'Afghanistan'],
    estimatedStrength: '5,000-10,000', leadership: 'Abu Hafs al-Hashimi al-Qurashi',
    designations: ['US FTO', 'UN Listed', 'EU Listed'],
    notableAttacks: ['Mosul seizure (2014)', 'Paris attacks (2015)', 'Brussels bombings (2016)'],
    recentEvents: 34,
  },
  {
    id: 'ag-houthis', name: 'Houthis (Ansar Allah)', aliases: ['Ansar Allah', 'Ansarullah'],
    type: 'state_proxy', ideology: 'Zaydi Shia revivalism, anti-Western',
    status: 'Active — controlling NW Yemen', foundedYear: 2004,
    regions: ['Middle East', 'Red Sea'], countries: ['Yemen'],
    estimatedStrength: '100,000-150,000', leadership: 'Abdul-Malik al-Houthi',
    stateSponsors: ['Iran'], designations: ['US FTO', 'US SDGT'],
    notableAttacks: ['Red Sea shipping attacks (2023-2024)', 'Aramco drone strikes (2019)'],
    recentEvents: 89,
  },
  {
    id: 'ag-wagner', name: 'Wagner Group / Africa Corps', aliases: ['PMC Wagner', 'Africa Corps'],
    type: 'militia', ideology: 'Russian state proxy, mercenary operations',
    status: 'Active — rebranded as Africa Corps', foundedYear: 2014,
    regions: ['Eastern Europe', 'Africa', 'Middle East'], countries: ['Ukraine', 'Syria', 'Mali', 'Libya', 'CAR'],
    estimatedStrength: '20,000-40,000', leadership: 'Russian MoD (post-Prigozhin)',
    stateSponsors: ['Russia'], designations: ['US Sanctioned'],
    notableAttacks: ['Bakhmut offensive (2023)', 'Moura massacre (2022)'],
    recentEvents: 56,
  },
];
