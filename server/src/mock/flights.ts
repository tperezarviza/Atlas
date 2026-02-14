import type { MilitaryFlight } from '../types.js';

export const mockFlights: MilitaryFlight[] = [
  { icao24: 'ae1234', callsign: 'FORTE12', origin_country: 'United States', aircraft_type: 'RQ-4 Global Hawk', category: 'surveillance', lat: 46.2, lng: 36.8, altitude_m: 16764, velocity_ms: 170, heading: 90, on_ground: false, last_seen: Date.now() / 1000, region: 'black_sea' },
  { icao24: 'ae5678', callsign: 'HOMER31', origin_country: 'United States', aircraft_type: 'P-8A Poseidon', category: 'surveillance', lat: 44.5, lng: 33.2, altitude_m: 8230, velocity_ms: 210, heading: 135, on_ground: false, last_seen: Date.now() / 1000, region: 'black_sea' },
  { icao24: 'ae9abc', callsign: 'RCH891', origin_country: 'United States', aircraft_type: 'C-17 Globemaster', category: 'transport', lat: 50.1, lng: 24.5, altitude_m: 10668, velocity_ms: 230, heading: 270, on_ground: false, last_seen: Date.now() / 1000, region: 'europe_ukraine' },
  { icao24: 'ae2def', callsign: 'LAGR22', origin_country: 'United States', aircraft_type: 'KC-135 Stratotanker', category: 'tanker', lat: 55.3, lng: 20.1, altitude_m: 9144, velocity_ms: 200, heading: 45, on_ground: false, last_seen: Date.now() / 1000, region: 'baltic_sea' },
  { icao24: '43c012', callsign: 'RRR7102', origin_country: 'United Kingdom', aircraft_type: 'RC-135W Rivet Joint', category: 'surveillance', lat: 53.8, lng: 22.5, altitude_m: 9449, velocity_ms: 195, heading: 80, on_ground: false, last_seen: Date.now() / 1000, region: 'baltic_sea' },
  { icao24: 'ae3456', callsign: 'JAKE11', origin_country: 'United States', aircraft_type: 'RC-135V', category: 'surveillance', lat: 35.5, lng: 52.1, altitude_m: 10058, velocity_ms: 190, heading: 180, on_ground: false, last_seen: Date.now() / 1000, region: 'middle_east' },
  { icao24: 'ae7890', callsign: 'REACH432', origin_country: 'United States', aircraft_type: 'C-5M Galaxy', category: 'transport', lat: 36.8, lng: 127.8, altitude_m: 11278, velocity_ms: 240, heading: 315, on_ground: false, last_seen: Date.now() / 1000, region: 'korean_peninsula' },
  { icao24: 'ae4567', callsign: 'NAVY5EP', origin_country: 'United States', aircraft_type: 'P-8A Poseidon', category: 'surveillance', lat: 24.2, lng: 120.5, altitude_m: 7620, velocity_ms: 205, heading: 225, on_ground: false, last_seen: Date.now() / 1000, region: 'taiwan_strait' },
];
