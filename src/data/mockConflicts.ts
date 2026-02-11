import type { Conflict } from '../types';

export const mockConflicts: Conflict[] = [
  { id: 'c1', name: 'Russia-Ukraine War', severity: 'critical', lat: 48.37, lng: 35.18, region: 'E. Europe', casualties: '500K+', displaced: '8.2M', trend: 'escalating', since: 'Feb 2022' },
  { id: 'c2', name: 'Israel-Palestine', severity: 'critical', lat: 31.35, lng: 34.31, region: 'Middle East', casualties: '45K+', displaced: '2.3M', trend: 'escalating', since: 'Oct 2023' },
  { id: 'c3', name: 'Sudan Civil War', severity: 'critical', lat: 15.5, lng: 32.56, region: 'E. Africa', casualties: '150K+', displaced: '10.7M', trend: 'escalating', since: 'Apr 2023' },
  { id: 'c4', name: 'Myanmar Civil War', severity: 'high', lat: 19.76, lng: 96.07, region: 'SE Asia', casualties: '50K+', displaced: '2.6M', trend: 'escalating', since: 'Feb 2021' },
  { id: 'c5', name: 'DRC Eastern Congo', severity: 'high', lat: -1.68, lng: 29.22, region: 'Central Africa', casualties: '120K+', displaced: '6.9M', trend: 'escalating', since: '2004' },
  { id: 'c6', name: 'Yemen (Houthi)', severity: 'high', lat: 15.55, lng: 48.52, region: 'Middle East', casualties: '377K+', displaced: '4.5M', trend: 'stable', since: '2014' },
  { id: 'c7', name: 'Iran Nuclear Program', severity: 'high', lat: 35.69, lng: 51.39, region: 'Middle East', casualties: '-', displaced: '-', trend: 'escalating', since: '2006' },
  { id: 'c8', name: 'Sahel Insurgency', severity: 'high', lat: 14.72, lng: -1.52, region: 'W. Africa', casualties: '40K+', displaced: '3.2M', trend: 'stable', since: '2012' },
  { id: 'c9', name: 'Somalia Al-Shabaab', severity: 'high', lat: 2.05, lng: 45.32, region: 'E. Africa', casualties: '20K+', displaced: '3.8M', trend: 'stable', since: '2006' },
  { id: 'c10', name: 'Syria Post-Assad', severity: 'high', lat: 35.24, lng: 38.97, region: 'Middle East', casualties: '500K+', displaced: '6.7M', trend: 'stable', since: '2011' },
  { id: 'c11', name: 'Taiwan Strait Tensions', severity: 'medium', lat: 23.7, lng: 120.96, region: 'E. Asia', casualties: '-', displaced: '-', trend: 'escalating', since: '2022' },
  { id: 'c12', name: 'Haiti Gang Crisis', severity: 'medium', lat: 18.97, lng: -72.28, region: 'Caribbean', casualties: '8K+', displaced: '700K', trend: 'escalating', since: '2021' },
  { id: 'c13', name: 'N. Korea Nuclear', severity: 'medium', lat: 39.03, lng: 125.75, region: 'E. Asia', casualties: '-', displaced: '-', trend: 'stable', since: '2006' },
  { id: 'c14', name: 'Pakistan TTP', severity: 'medium', lat: 30.37, lng: 69.34, region: 'S. Asia', casualties: '12K+', displaced: '1.2M', trend: 'stable', since: '2007' },
  { id: 'c15', name: 'Mexico Cartels', severity: 'medium', lat: 23.63, lng: -102.55, region: 'N. America', casualties: '30K+/yr', displaced: '380K', trend: 'stable', since: '2006' },
  { id: 'c16', name: 'Colombia ELN', severity: 'low', lat: 4.71, lng: -74.07, region: 'S. America', casualties: '2K+', displaced: '120K', trend: 'stable', since: '2017' },
  { id: 'c17', name: 'South China Sea', severity: 'low', lat: 12, lng: 114, region: 'SE Asia', casualties: '-', displaced: '-', trend: 'escalating', since: '2012' },
  { id: 'c18', name: 'Libya Political', severity: 'low', lat: 32.9, lng: 13.18, region: 'N. Africa', casualties: '5K+', displaced: '280K', trend: 'stable', since: '2014' },
  { id: 'c19', name: 'Lebanon-Hezbollah', severity: 'high', lat: 33.8, lng: 35.5, region: 'Middle East', casualties: '4K+', displaced: '1.2M', trend: 'stable', since: '2023' },
];
