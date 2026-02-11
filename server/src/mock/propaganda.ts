import type { PropagandaEntry } from '../types.js';

export const mockPropaganda: PropagandaEntry[] = [
  {
    id: 'prop-ru', country: 'Russia', countryCode: 'RU', outlet: 'RT / TASS / Sputnik',
    domain: 'rt.com', narratives: ['NATO aggression narrative', 'Western decline', 'Multipolar world order', 'Ukraine as failed state'],
    sampleHeadlines: ['NATO provocation forces Russian defensive measures', 'Western sanctions backfire on European economies', 'Multipolar world order emerging as US hegemony fades'],
    toneAvg: -3.8, articleCount: 245, analysisDate: new Date().toISOString(),
  },
  {
    id: 'prop-cn', country: 'China', countryCode: 'CN', outlet: 'Xinhua / Global Times / CGTN',
    domain: 'globaltimes.cn', narratives: ['Taiwan reunification inevitable', 'US interference in Asia-Pacific', 'Chinese economic resilience', 'BRI success stories'],
    sampleHeadlines: ['US arms sales to Taiwan destabilize region', 'Chinese economy shows resilience amid Western pressure', 'Belt and Road Initiative transforms developing nations'],
    toneAvg: -2.9, articleCount: 189, analysisDate: new Date().toISOString(),
  },
  {
    id: 'prop-ir', country: 'Iran', countryCode: 'IR', outlet: 'PressTV / IRNA / Tasnim',
    domain: 'presstv.ir', narratives: ['Resistance axis victory', 'Zionist regime collapse', 'Islamic awakening', 'Sanctions failure'],
    sampleHeadlines: ['Resistance forces deal blow to Zionist regime', 'Islamic Republic achieves nuclear energy milestone', 'US sanctions fail to break Iranian resolve'],
    toneAvg: -5.1, articleCount: 132, analysisDate: new Date().toISOString(),
  },
  {
    id: 'prop-tr', country: 'Turkey', countryCode: 'TR', outlet: 'Daily Sabah / Anadolu Agency',
    domain: 'dailysabah.com', narratives: ['Neo-Ottoman regional leadership', 'Kurdish terrorism threat', 'Independent foreign policy'],
    sampleHeadlines: ['Turkey leads regional peace efforts', 'PKK terror threat requires decisive action', 'Ankara charts independent course in multipolar world'],
    toneAvg: -1.8, articleCount: 98, analysisDate: new Date().toISOString(),
  },
];
