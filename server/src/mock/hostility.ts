import type { HostilityPair } from '../types.js';

export const mockHostility: HostilityPair[] = [
  {
    id: 'hp-us-cn', countryA: 'United States', codeA: 'US', countryB: 'China', codeB: 'CN',
    avgTone: -4.2, articleCount: 1856, trend: 'high',
    topHeadlines: ['US expands semiconductor export controls on China', 'PLA conducts Taiwan Strait exercises after arms sale', 'Trade war escalation: new tariffs on $200B goods'],
  },
  {
    id: 'hp-us-ru', countryA: 'United States', codeA: 'US', countryB: 'Russia', codeB: 'RU',
    avgTone: -6.1, articleCount: 2340, trend: 'critical',
    topHeadlines: ['Russia threatens nuclear response to NATO expansion', 'US sanctions target Russian energy sector', 'Spy exchange highlights frozen diplomacy'],
  },
  {
    id: 'hp-us-ir', countryA: 'United States', codeA: 'US', countryB: 'Iran', codeB: 'IR',
    avgTone: -5.8, articleCount: 987, trend: 'critical',
    topHeadlines: ['Iran enriches uranium to 60% purity', 'US deploys carrier group to Persian Gulf', 'IAEA reports non-cooperation from Tehran'],
  },
  {
    id: 'hp-il-ir', countryA: 'Israel', codeA: 'IL', countryB: 'Iran', codeB: 'IR',
    avgTone: -7.3, articleCount: 1245, trend: 'critical',
    topHeadlines: ['Israel strikes Iranian targets in Syria', 'Iran vows retaliation after scientist assassination', 'Shadow war intensifies across Middle East'],
  },
  {
    id: 'hp-ru-ua', countryA: 'Russia', codeA: 'RU', countryB: 'Ukraine', codeB: 'UA',
    avgTone: -8.1, articleCount: 4521, trend: 'critical',
    topHeadlines: ['Russian offensive in Donetsk intensifies', 'Ukraine launches deep strikes with Western missiles', 'Ceasefire negotiations stalled'],
  },
];
