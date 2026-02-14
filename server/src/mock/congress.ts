import type { CongressBill, SenateNomination } from '../types.js';

export const mockCongressBills: CongressBill[] = [
  { number: 'HR 1', title: 'Laken Riley Act', sponsor: 'Rep. Collins, Mike', party: 'R', introduced_date: '2025-01-03', latest_action: 'Signed into law', latest_action_date: '2025-01-29', status: 'signed', subjects: ['immigration'], committee: 'Judiciary', relevance: 'immigration' },
  { number: 'S 5', title: 'Secure the Border Act', sponsor: 'Sen. Lankford, James', party: 'R', introduced_date: '2025-01-06', latest_action: 'Referred to Committee on Homeland Security', latest_action_date: '2025-01-10', status: 'committee', subjects: ['immigration'], committee: 'Homeland Security', relevance: 'immigration' },
  { number: 'HR 21', title: 'National Defense Authorization Act for FY2026', sponsor: 'Rep. Rogers, Mike', party: 'R', introduced_date: '2025-01-09', latest_action: 'Referred to Armed Services Committee', latest_action_date: '2025-01-15', status: 'committee', subjects: ['defense'], committee: 'Armed Services', relevance: 'defense' },
  { number: 'S 12', title: 'RESTRICT Act Reauthorization', sponsor: 'Sen. Warner, Mark', party: 'D', introduced_date: '2025-01-07', latest_action: 'Referred to Intelligence Committee', latest_action_date: '2025-01-12', status: 'committee', subjects: ['intelligence', 'tech'], committee: 'Intelligence', relevance: 'intelligence' },
  { number: 'HR 45', title: 'Reciprocal Trade Act', sponsor: 'Rep. Buchanan, Vern', party: 'R', introduced_date: '2025-01-15', latest_action: 'Passed House', latest_action_date: '2025-02-10', status: 'passed_house', subjects: ['trade'], committee: 'Ways and Means', relevance: 'trade' },
  { number: 'S 30', title: 'Taiwan Defense Enhancement Act', sponsor: 'Sen. Cotton, Tom', party: 'R', introduced_date: '2025-01-20', latest_action: 'Referred to Foreign Relations Committee', latest_action_date: '2025-01-22', status: 'committee', subjects: ['defense', 'foreign_affairs'], committee: 'Foreign Relations', relevance: 'foreign_affairs' },
];

export const mockCongressNominations: SenateNomination[] = [
  { name: 'Pete Hegseth', position: 'Secretary of Defense', agency: 'Department of Defense', status: 'confirmed' },
  { name: 'Marco Rubio', position: 'Secretary of State', agency: 'Department of State', status: 'confirmed' },
  { name: 'Tulsi Gabbard', position: 'Director of National Intelligence', agency: 'ODNI', status: 'confirmed' },
  { name: 'Kash Patel', position: 'Director of the FBI', agency: 'Federal Bureau of Investigation', status: 'confirmed' },
  { name: 'Robert F. Kennedy Jr.', position: 'Secretary of Health and Human Services', agency: 'HHS', status: 'confirmed' },
  { name: 'John Ratcliffe', position: 'Director of the CIA', agency: 'Central Intelligence Agency', status: 'confirmed' },
];
