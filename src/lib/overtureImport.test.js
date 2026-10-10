import { describe, it, expect } from 'vitest';
import { spreadByCity, toPlaceRow } from './overtureImport';

const rec = (over = {}) => ({
  id: 'abc', name: 'Shoko Bar', taxonomy: 'bar', confidence: 0.8, address: 'Allenby 10', city: 'Tel Aviv',
  country: 'IL', lat: 32.06, lng: 34.77, status: 'open', ...over,
});

describe('toPlaceRow', () => {
  it('builds a pending row with source and license', () => {
    expect(toPlaceRow(rec(), 'nightlife')).toMatchObject({
      name: 'Shoko Bar', category: 'nightlife', status: 'pending', source: 'overture', source_ref: 'abc',
      address: 'Allenby 10, Tel Aviv', tags: ['בר'], short_description: 'בר · Tel Aviv',
    });
  });

  it('accepts Hebrew and English names, rejects numbers and generic names', () => {
    expect(toPlaceRow(rec({ name: 'הבר של דוד' }), 'nightlife')).not.toBeNull();
    expect(toPlaceRow(rec({ name: '12345' }), 'nightlife')).toBeNull();
    expect(toPlaceRow(rec({ name: 'בית' }), 'nightlife')).toBeNull();
  });

  it('rejects low confidence, closed, foreign, out-of-bounds and wrong-category records', () => {
    expect(toPlaceRow(rec({ confidence: 0.3 }), 'nightlife')).toBeNull();
    expect(toPlaceRow(rec({ status: 'closed' }), 'nightlife')).toBeNull();
    expect(toPlaceRow(rec({ country: 'JO' }), 'nightlife')).toBeNull();
    expect(toPlaceRow(rec({ lat: 40, lng: 10 }), 'nightlife')).toBeNull();
    expect(toPlaceRow(rec({ taxonomy: 'barber' }), 'nightlife')).toBeNull();
    expect(toPlaceRow(rec({ taxonomy: 'bar' }), 'food')).toBeNull();
    expect(toPlaceRow(rec({ name: 'מלון רות ובר היין' }), 'nightlife')).toBeNull();
    expect(toPlaceRow(rec({ name: 'x'.repeat(61) }), 'nightlife')).toBeNull();
  });
});

describe('spreadByCity', () => {
  it('caps rows per city and prefers higher confidence', () => {
    const rows = ['a', 'b', 'c'].map((n, i) => ({ name: n, city: 'Haifa', _confidence: 0.5 + i / 10 }))
      .concat([{ name: 'z', city: 'Akko', _confidence: 0.4 }]);
    const out = spreadByCity(rows, 10, 2);
    expect(out.map((r) => r.name)).toEqual(['c', 'b', 'z']);
  });

  it('stops at the requested total', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ name: `n${i}`, city: `c${i}`, _confidence: 1 }));
    expect(spreadByCity(rows, 3)).toHaveLength(3);
  });
});
