import { describe, it, expect } from 'vitest';
import { placeholderFor, placeholderKind, placeholderSrc } from './placeholders';

describe('placeholderKind', () => {
  it('picks the kind from the label or name', () => {
    expect(placeholderKind({ name: 'עין גדי', category: 'nature' })).toBe('spring');
    expect(placeholderKind({ name: 'Sleek', tags: ['בר'], category: 'nightlife' })).toBe('bar');
    expect(placeholderKind({ name: 'פאב הדובים', category: 'nightlife' })).toBe('bar');
    expect(placeholderKind({ name: 'קפה גרג', category: 'food' })).toBe('cafe');
    expect(placeholderKind({ name: 'סביח פרישמן', tags: ['עגלת אוכל'], category: 'food' })).toBe('cart');
    expect(placeholderKind({ name: 'מצפה נמרוד', category: 'nature' })).toBe('viewpoint');
    expect(placeholderKind({ name: 'חוף אביב', category: 'nature' })).toBe('beach');
    expect(placeholderKind({ name: 'שוק הכרמל', category: 'shopping' })).toBe('market');
    expect(placeholderKind({ name: 'מוזיאון הטבע', category: 'culture' })).toBe('museum');
  });

  it('falls back to the category, also for legacy category names', () => {
    expect(placeholderKind({ name: 'x', category: 'food' })).toBe('cart');
    expect(placeholderKind({ name: 'x', category: 'view' })).toBe('nature');
    expect(placeholderKind({ name: 'x', category: 'culture' })).toBe('heritage');
    expect(placeholderKind({})).toBe('nature');
  });
});

describe('placeholderFor', () => {
  it('only gives a picture to places without photos', () => {
    expect(placeholderFor({ name: 'עין גדי', images: [] })).toBe('/placeholders/spring.jpg');
    expect(placeholderFor({ name: 'עין גדי', images: ['https://x/a.jpg'] })).toBeNull();
    expect(placeholderFor({ name: 'עין גדי', image_url: 'https://x/a.jpg' })).toBeNull();
  });
  it('never points outside the known set', () => {
    expect(placeholderSrc('../../etc')).toBe('/placeholders/nature.jpg');
  });
});
