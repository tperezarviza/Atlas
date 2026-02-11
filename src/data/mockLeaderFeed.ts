import type { FeedItem } from '../types';

export const mockLeaderFeed: FeedItem[] = [
  {
    id: 'f1', flag: '🇺🇸', handle: '@realDonaldTrump', role: 'President of the United States',
    source: 'Truth Social', time: '3m', category: 'trump',
    text: 'Record Stock Market, and National Security, driven by our Great **TARIFFS**. I am predicting 100,000 on the DOW by the end of my Term. REMEMBER, TRUMP WAS RIGHT ABOUT EVERYTHING!',
    engagement: '♥ 89.2K · 🔄 23.1K · 💬 12.4K', tags: ['Economy', 'Markets', 'Tariffs'],
  },
  {
    id: 'f2', flag: '🇺🇸', handle: '@elonmusk', role: 'DOGE — Dept. of Government Efficiency',
    source: 'X', time: '12m', category: 'musk',
    text: 'DOGE has now saved $172B in taxpayer money. We are 43% ahead of schedule. The waste in government is even worse than we expected.',
    engagement: '♥ 245K · 🔄 67.3K', tags: ['DOGE', 'Government'],
  },
  {
    id: 'f3', flag: '🇮🇱', handle: '@netanyahu', role: 'Prime Minister of Israel',
    source: 'X', time: '28m', category: 'leader',
    text: 'Israel will continue to act with full force against all threats on every front. We will not rest until all hostages are home and our enemies are defeated.',
    engagement: '♥ 34.1K · 🔄 8.7K', tags: ['Israel', 'Security'],
  },
  {
    id: 'f4', flag: '🇺🇸', handle: 'Pentagon Press', role: 'Department of Defense',
    source: 'DoD RSS', time: '45m', category: 'military',
    text: 'CENTCOM confirms precision strikes on Houthi missile storage facilities in Yemen. Operations conducted in coordination with allied forces to protect freedom of navigation in the Red Sea.',
    engagement: '', tags: ['Military', 'Yemen', 'CENTCOM'],
  },
  {
    id: 'f5', flag: '🇺🇦', handle: '@ZelenskyyUa', role: 'President of Ukraine',
    source: 'X', time: '1h', category: 'leader',
    text: 'Another night of Russian terror. Kharkiv hit by 14 missiles. We need more air defense systems — not tomorrow, now. Every day of delay costs lives.',
    engagement: '♥ 56.3K · 🔄 18.9K', tags: ['Ukraine', 'Defense'],
  },
  {
    id: 'f6', flag: '🇺🇸', handle: '@marcorubio', role: 'Secretary of State',
    source: 'X', time: '1.5h', category: 'leader',
    text: 'Met with NATO allies in Brussels today. Made clear: America expects fair burden-sharing. Our allies must invest in their own defense. The era of free-riding is over.',
    engagement: '♥ 12.8K · 🔄 3.1K', tags: ['NATO', 'Diplomacy'],
  },
  {
    id: 'f7', flag: '🇺🇸', handle: '@CBP', role: 'Customs & Border Protection',
    source: 'CBP RSS', time: '2h', category: 'military',
    text: 'FY26 October data: 30,561 total encounters nationwide — lowest start to a fiscal year in CBP history. Sixth consecutive month of ZERO releases. Border security works.',
    engagement: '', tags: ['Border', 'Immigration'],
  },
  {
    id: 'f8', flag: '🇷🇺', handle: 'Kremlin Press', role: 'Office of the President',
    source: 'kremlin.ru RSS', time: '3h', category: 'leader',
    text: 'President Putin discussed the special military operation progress with Defence Minister Belousov. Emphasized the need to strengthen positions in Donetsk and maintain operational momentum.',
    engagement: '', tags: ['Russia', 'Ukraine'],
  },
  {
    id: 'f9', flag: '🇨🇳', handle: 'Xinhua News', role: 'Chinese State Media',
    source: 'xinhua.net RSS', time: '4h', category: 'leader',
    text: "PLA Eastern Theatre Command conducted routine combat readiness patrols around Taiwan. China's sovereignty and territorial integrity will be firmly safeguarded.",
    engagement: '', tags: ['China', 'Taiwan'],
  },
  {
    id: 'f10', flag: '🌐', handle: '@IABORZ', role: 'IAEA Director General',
    source: 'IAEA RSS', time: '5h', category: 'leader',
    text: "New report: Iran's enrichment levels have reached 83.7% purity at Fordow facility. This is deeply concerning. We call on all parties to engage in meaningful diplomatic dialogue.",
    engagement: '♥ 8.2K · 🔄 4.1K', tags: ['Nuclear', 'Iran', 'IAEA'],
  },
];
