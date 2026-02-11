import type { NewsWireItem } from '../types';

export const mockNewsWire: NewsWireItem[] = [
  { id: 'nw1', bullet: 'critical', source: 'Reuters', time: '3m', headline: 'Russia launches massive missile barrage on Kharkiv — at least 12 killed, residential area hit', tone: -9.1 },
  { id: 'nw2', bullet: 'critical', source: 'UN News', time: '8m', headline: "RSF advances on El-Fasher: UN warns of 'potential genocide' in Darfur", tone: -8.5 },
  { id: 'nw3', bullet: 'critical', source: 'Kyiv Independent', time: '14m', headline: 'Ukraine claims destruction of Russian ammo depot in Belgorod using ATACMS', tone: -7.2 },
  { id: 'nw4', bullet: 'high', source: 'Fox News', time: '18m', headline: 'Trump signs executive order expanding tariffs on Chinese tech imports to 60%', tone: 1.5 },
  { id: 'nw5', bullet: 'high', source: 'Times of Israel', time: '22m', headline: 'IDF reports intense operations in northern Gaza as ceasefire talks stall', tone: -7.0 },
  { id: 'nw6', bullet: 'medium', source: 'AP', time: '28m', headline: 'Houthi forces claim another missile strike on commercial vessel in Red Sea', tone: -5.8 },
  { id: 'nw7', bullet: 'accent', source: 'WSJ', time: '35m', headline: 'Wall Street rallies on strong jobs data — Dow nears 45,000 milestone', tone: 2.8 },
  { id: 'nw8', bullet: 'high', source: 'BBC', time: '42m', headline: 'Myanmar junta airstrikes kill dozens in Karen State resistance stronghold', tone: -6.5 },
  { id: 'nw9', bullet: 'medium', source: 'SCMP', time: '50m', headline: "PLA conducts live-fire exercises near Taiwan's air defense identification zone", tone: -4.5 },
  { id: 'nw10', bullet: 'accent', source: 'Daily Wire', time: '1h', headline: 'DOGE identifies $23B in duplicate federal contracts for elimination', tone: 2.0 },
  { id: 'nw11', bullet: 'high', source: 'France24', time: '1.2h', headline: 'Wagner-linked Africa Corps accused of civilian massacres in Mali', tone: -6.8 },
  { id: 'nw12', bullet: 'medium', source: 'Reuters', time: '1.5h', headline: 'OPEC+ considers extending production cuts amid price volatility', tone: -2.5 },
];
