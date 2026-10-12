import { describe, it, expect } from 'vitest';
import { clusterPlaces } from './mapCluster';

const p = (id, lat, lng) => ({ id, lat, lng });

describe('clusterPlaces', () => {
  it('merges close places when zoomed out and splits them when zoomed in', () => {
    const places = [p(1, 32.08, 34.78), p(2, 32.0802, 34.7802), p(3, 31.25, 34.79)];
    expect(clusterPlaces(places, 8)).toHaveLength(2);
    expect(clusterPlaces(places, 8).find((c) => c.items.length === 2)).toBeTruthy();
    expect(clusterPlaces(places, 18)).toHaveLength(3);
  });

  it('puts the cluster at the centre of its places', () => {
    const [c] = clusterPlaces([p(1, 32, 34), p(2, 32.002, 34.002)], 5);
    expect(c.lat).toBeCloseTo(32.001, 5);
    expect(c.lng).toBeCloseTo(34.001, 5);
  });

  it('skips places without coordinates', () => {
    expect(clusterPlaces([p(1, null, 34), p(2, 'x', 'y'), p(3, 32, 34)], 10)).toHaveLength(1);
  });
});
