import type { Vessel } from '../types.js';

export const mockVessels: Vessel[] = [
  { id: 'v1', name: 'FRONT ALTA', mmsi: '256789000', type: 'tanker', flag: 'NO', lat: 26.56, lng: 56.25, heading: 315, speed_knots: 12.5, destination: 'Fujairah', near_chokepoint: 'Strait of Hormuz' },
  { id: 'v2', name: 'COSCO SHANGHAI', mmsi: '413456789', type: 'container', flag: 'CN', lat: 26.42, lng: 56.48, heading: 135, speed_knots: 14.2, destination: 'Jebel Ali', near_chokepoint: 'Strait of Hormuz' },
  { id: 'v3', name: 'USS ABRAHAM LINCOLN', mmsi: '369970001', type: 'military', flag: 'US', lat: 26.65, lng: 56.10, heading: 270, speed_knots: 18.0, near_chokepoint: 'Strait of Hormuz' },
  { id: 'v4', name: 'EVER GIVEN', mmsi: '353136000', type: 'container', flag: 'PA', lat: 30.45, lng: 32.35, heading: 350, speed_knots: 8.5, destination: 'Rotterdam', near_chokepoint: 'Suez Canal' },
  { id: 'v5', name: 'MINERVA HELEN', mmsi: '241234000', type: 'tanker', flag: 'GR', lat: 30.20, lng: 32.34, heading: 170, speed_knots: 9.0, destination: 'Mumbai', near_chokepoint: 'Suez Canal' },
  { id: 'v6', name: 'ATLANTIC CARGO', mmsi: '219876000', type: 'cargo', flag: 'DK', lat: 30.60, lng: 32.33, heading: 355, speed_knots: 7.5, near_chokepoint: 'Suez Canal' },
  { id: 'v7', name: 'NISSOS SCHINOUSSA', mmsi: '241567000', type: 'tanker', flag: 'GR', lat: 12.58, lng: 43.32, heading: 340, speed_knots: 11.0, near_chokepoint: 'Bab el-Mandeb' },
  { id: 'v8', name: 'MARSHAL SHAPOSHNIKOV', mmsi: '273456000', type: 'military', flag: 'RU', lat: 12.72, lng: 43.18, heading: 180, speed_knots: 15.0, near_chokepoint: 'Bab el-Mandeb' },
  { id: 'v9', name: 'PACIFIC VOYAGER', mmsi: '538123000', type: 'tanker', flag: 'MH', lat: 1.25, lng: 103.85, heading: 45, speed_knots: 10.5, destination: 'Singapore', near_chokepoint: 'Strait of Malacca' },
  { id: 'v10', name: 'YANGZE HARMONY', mmsi: '413789000', type: 'container', flag: 'CN', lat: 1.30, lng: 103.70, heading: 225, speed_knots: 13.8, near_chokepoint: 'Strait of Malacca' },
  { id: 'v11', name: 'MAERSK EDINBURGH', mmsi: '219345000', type: 'container', flag: 'DK', lat: 1.10, lng: 104.00, heading: 60, speed_knots: 16.0, near_chokepoint: 'Strait of Malacca' },
  { id: 'v12', name: 'NORDIC LUNA', mmsi: '311234000', type: 'cargo', flag: 'BS', lat: 9.00, lng: -79.55, heading: 315, speed_knots: 6.0, near_chokepoint: 'Panama Canal' },
  { id: 'v13', name: 'EAGLE FORD', mmsi: '367890000', type: 'tanker', flag: 'US', lat: 9.10, lng: -79.60, heading: 135, speed_knots: 5.5, near_chokepoint: 'Panama Canal' },
  { id: 'v14', name: 'YASA GOLDEN', mmsi: '271001000', type: 'cargo', flag: 'TR', lat: 41.10, lng: 29.05, heading: 25, speed_knots: 8.0, near_chokepoint: 'Turkish Straits' },
  { id: 'v15', name: 'SCF BALTICA', mmsi: '273890000', type: 'tanker', flag: 'RU', lat: 41.00, lng: 29.00, heading: 200, speed_knots: 9.5, near_chokepoint: 'Turkish Straits' },
  { id: 'v16', name: 'SHANDONG (CV-17)', mmsi: '412000016', type: 'military', flag: 'CN', lat: 16.50, lng: 112.00, heading: 90, speed_knots: 20.0, near_chokepoint: 'South China Sea' },
  { id: 'v17', name: 'GLOBAL SPIRIT', mmsi: '538456000', type: 'tanker', flag: 'MH', lat: 15.80, lng: 113.20, heading: 45, speed_knots: 11.0, near_chokepoint: 'South China Sea' },
  { id: 'v18', name: 'CAPE TOWN EXPRESS', mmsi: '218567000', type: 'container', flag: 'DE', lat: -34.35, lng: 18.50, heading: 90, speed_knots: 14.0, near_chokepoint: 'Cape of Good Hope' },
  { id: 'v19', name: 'SEVEROMORSK', mmsi: '273999000', type: 'military', flag: 'RU', lat: 63.50, lng: -12.00, heading: 225, speed_knots: 16.0, near_chokepoint: 'GIUK Gap' },
  { id: 'v20', name: 'NORDIC BULKER', mmsi: '257123000', type: 'cargo', flag: 'NO', lat: 62.80, lng: -10.50, heading: 180, speed_knots: 12.0, near_chokepoint: 'GIUK Gap' },
];
