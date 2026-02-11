import type { HostilityPair } from '../types';

export const mockHostility: HostilityPair[] = [
  {
    id: 'hp-us-cn', countryA: 'United States', codeA: 'US', countryB: 'China', codeB: 'CN',
    avgTone: -4.2, articleCount: 1856, trend: 'high',
    topHeadlines: ['US expands semiconductor export controls on China', 'PLA conducts Taiwan Strait exercises'],
  },
  {
    id: 'hp-us-ru', countryA: 'United States', codeA: 'US', countryB: 'Russia', codeB: 'RU',
    avgTone: -6.1, articleCount: 2340, trend: 'critical',
    topHeadlines: ['Russia threatens nuclear response to NATO expansion', 'US sanctions target Russian energy sector'],
  },
  {
    id: 'hp-il-ir', countryA: 'Israel', codeA: 'IL', countryB: 'Iran', codeB: 'IR',
    avgTone: -7.3, articleCount: 1245, trend: 'critical',
    topHeadlines: ['Israel strikes Iranian targets in Syria', 'Iran vows retaliation'],
  },
  {
    id: 'hp-ru-ua', countryA: 'Russia', codeA: 'RU', countryB: 'Ukraine', codeB: 'UA',
    avgTone: -8.1, articleCount: 4521, trend: 'critical',
    topHeadlines: ['Russian offensive in Donetsk intensifies', 'Ukraine launches deep strikes with Western missiles'],
  },
];
