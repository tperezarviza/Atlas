import Supercluster from 'supercluster';
import { useMemo, useRef } from 'react';
import type { NewsPoint } from '../types';

export interface ClusterItem {
  id: number | string;
  lat: number;
  lng: number;
  count: number;
  isCluster: boolean;
  worstTone: number;
  point?: NewsPoint;
  expansionZoom?: number;
}

export type MapBounds = [number, number, number, number]; // [west, south, east, north]

export function useCluster(
  points: NewsPoint[],
  bounds: MapBounds | null,
  zoom: number,
): ClusterItem[] {
  const indexRef = useRef<Supercluster | null>(null);

  return useMemo(() => {
    if (!points.length || !bounds) return [];

    const index = new Supercluster({
      radius: 60,
      maxZoom: 14,
      minPoints: 3,
      map: (props) => ({
        worstTone: (props as any).tone ?? 0,
        count: 1,
      }),
      reduce: (accumulated, props) => {
        (accumulated as any).worstTone = Math.min(
          (accumulated as any).worstTone,
          (props as any).worstTone,
        );
        (accumulated as any).count += (props as any).count;
      },
    });

    const features = points.map((p, i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] as [number, number] },
      properties: { ...p, _index: i },
    }));

    index.load(features as any);
    indexRef.current = index;

    const raw = index.getClusters(bounds, Math.floor(zoom));

    return raw.map((f): ClusterItem => {
      const props = f.properties as any;
      const [lng, lat] = f.geometry.coordinates;
      const isCluster = props.cluster === true;

      return {
        id: isCluster ? props.cluster_id : `pt-${props._index}`,
        lat,
        lng,
        count: isCluster ? props.point_count : 1,
        isCluster,
        worstTone: props.worstTone ?? props.tone ?? 0,
        point: isCluster ? undefined : points[props._index],
        expansionZoom: isCluster
          ? index.getClusterExpansionZoom(props.cluster_id)
          : undefined,
      };
    });
  }, [points, bounds, zoom]);
}
