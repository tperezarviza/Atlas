import type { SanctionsResponse } from '../types.js';

export const mockSanctions: SanctionsResponse = {
  totalEntries: 12847,
  byProgram: {
    SDGT: 3241, IRAN: 1856, RUSSIA: 1523, SYRIA: 987, DPRK: 654,
    CUBA: 412, VENEZUELA: 389, CHINA: 287, BELARUS: 198, UKRAINE: 176, YEMEN: 143,
  },
  byCountry: {
    Iran: 1856, Russia: 1523, Syria: 987, 'North Korea': 654, Cuba: 412,
    Venezuela: 389, China: 287, Belarus: 198, Yemen: 143, Myanmar: 121,
  },
  recentEntries: [
    { id: 'sdn-1', name: 'IRANIAN SHIPPING LINES', type: 'Entity', programs: ['IRAN', 'SDGT'], country: 'Iran', remarks: 'Front company for IRGC-QF logistics', dateAdded: '2025-01-15' },
    { id: 'sdn-2', name: 'ROSTEC STATE CORPORATION', type: 'Entity', programs: ['RUSSIA', 'UKRAINE-EO13661'], country: 'Russia', remarks: 'Russian defense conglomerate', dateAdded: '2025-01-10' },
    { id: 'sdn-3', name: 'KIM JONG UN REGIME ENTITIES', type: 'Entity', programs: ['DPRK'], country: 'North Korea', remarks: 'WMD proliferation network', dateAdded: '2024-12-20' },
    { id: 'sdn-4', name: 'PETROLEOS DE VENEZUELA SA', type: 'Entity', programs: ['VENEZUELA'], country: 'Venezuela', remarks: 'State oil company — sectoral sanctions', dateAdded: '2024-12-05' },
    { id: 'sdn-5', name: 'SYRIAN SCIENTIFIC STUDIES RESEARCH CENTER', type: 'Entity', programs: ['SYRIA'], country: 'Syria', remarks: 'Chemical weapons program', dateAdded: '2024-11-18' },
  ],
  lastUpdated: new Date().toISOString(),
};
