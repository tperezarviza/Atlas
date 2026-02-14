import { cache } from '../cache.js';
import type { Vessel } from '../types.js';

export function getVessels(): Vessel[] {
  return cache.get<Vessel[]>('vessels') ?? [];
}
