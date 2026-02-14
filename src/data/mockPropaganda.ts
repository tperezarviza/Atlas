import type { PropagandaEntry } from '../types';

export const mockPropaganda: PropagandaEntry[] = [
  {
    id: 'prop-ru', country: 'Russia', countryCode: 'RU', outlet: 'RT / TASS / Sputnik',
    domain: 'rt.com', narratives: ['NATO aggression narrative', 'Western decline', 'Multipolar world order'],
    sampleHeadlines: ['NATO provocation forces Russian defensive measures', 'Western sanctions backfire on European economies'],
    toneAvg: -3.8, articleCount: 245, analysisDate: new Date().toISOString(),
  },
  {
    id: 'prop-cn', country: 'China', countryCode: 'CN', outlet: 'Xinhua / Global Times / CGTN',
    domain: 'globaltimes.cn', narratives: ['Taiwan reunification inevitable', 'US interference in Asia-Pacific', 'Chinese economic resilience'],
    sampleHeadlines: ['US arms sales to Taiwan destabilize region', 'Chinese economy shows resilience amid Western pressure'],
    toneAvg: -2.9, articleCount: 189, analysisDate: new Date().toISOString(),
  },
  {
    id: 'prop-ir', country: 'Iran', countryCode: 'IR', outlet: 'PressTV / IRNA / Tasnim',
    domain: 'presstv.ir', narratives: ['Resistance axis victory', 'Zionist regime collapse', 'Islamic awakening'],
    sampleHeadlines: ['Resistance forces deal blow to Zionist regime', 'US sanctions fail to break Iranian resolve'],
    toneAvg: -5.1, articleCount: 132, analysisDate: new Date().toISOString(),
  },
];
