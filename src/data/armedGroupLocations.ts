/** Armed group ID -> [lat, lng] operational center coordinates */
export const armedGroupLocations: Record<string, [number, number]> = {
  'hezbollah':       [33.87, 35.51],   // Southern Beirut, Lebanon
  'hamas':           [31.52, 34.46],   // Gaza City
  'houthis':         [15.37, 44.19],   // Sana'a, Yemen
  'wagner':          [11.59, 43.15],   // CAR / Mali operations
  'isis-core':       [35.47, 43.16],   // Iraq/Syria border
  'al-shabaab':      [2.05, 45.32],    // Mogadishu area, Somalia
  'boko-haram':      [11.85, 13.16],   // NE Nigeria (Maiduguri)
  'taliban':         [34.53, 69.17],   // Kabul, Afghanistan
  'pmu':             [33.31, 44.37],   // Baghdad, Iraq (PMF/PMU)
  'pkk':             [37.00, 43.00],   // Qandil Mountains, Iraq/Turkey
  'eln':             [7.13, -73.13],   // NE Colombia
  'cjng':            [20.68, -103.35], // Jalisco, Mexico
  'sinaloa':         [24.81, -107.39], // Sinaloa, Mexico
  'rsf':             [15.63, 32.53],   // Khartoum area, Sudan
  'lna':             [32.90, 13.18],   // Eastern Libya (Benghazi)
};
