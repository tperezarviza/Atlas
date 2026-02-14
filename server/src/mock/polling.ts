import type { PollingData } from '../types.js';

export const mockPolling: PollingData = {
  presidential_approval: {
    rcp_average: { approve: 47.3, disapprove: 49.8, spread: -2.5 },
    recent_polls: [
      { pollster: 'Rasmussen Reports', date: '2/5 - 2/9', approve: 51, disapprove: 48 },
      { pollster: 'Morning Consult', date: '2/3 - 2/9', approve: 46, disapprove: 51 },
      { pollster: 'Reuters/Ipsos', date: '2/3 - 2/7', approve: 44, disapprove: 53 },
      { pollster: 'Quinnipiac', date: '2/1 - 2/5', approve: 45, disapprove: 52 },
      { pollster: 'Fox News', date: '1/31 - 2/3', approve: 49, disapprove: 49 },
      { pollster: 'Emerson College', date: '1/30 - 2/1', approve: 50, disapprove: 47 },
      { pollster: 'Gallup', date: '1/28 - 2/3', approve: 47, disapprove: 50 },
      { pollster: 'YouGov/Economist', date: '1/27 - 1/30', approve: 45, disapprove: 51 },
    ],
    trend: 'stable',
  },
  generic_ballot: {
    rcp_average: { republican: 47.1, democrat: 46.2, spread: 0.9 },
  },
  direction: {
    right_direction: 38.5,
    wrong_track: 54.2,
  },
};
