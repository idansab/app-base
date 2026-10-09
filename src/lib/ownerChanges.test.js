import { describe, it, expect } from 'vitest';
import { buildOwnerChanges, changedGroups, describeGroup, fieldsOfGroups, OWNER_GROUPS } from './ownerChanges';
import { placeToForm } from '@/components/admin/places/placeUtils';

const IMG = 'https://x.supabase.co/storage/v1/object/public/place-images/places/a.jpg';
const place = {
  id: '1',
  name: 'קפה',
  category: 'food',
  city: 'עפולה',
  address: 'רחוב 1',
  lat: 32.6,
  lng: 35.3,
  status: 'approved',
  description: 'תיאור',
  short_description: 'קצר',
  phone: '04-1',
  price_level: 'moderate',
  rating: 4.5,
  tags: ['קפה'],
  images: [IMG],
  opening_hours: "א'-ה' 07:00-22:00",
  opening_schedule: {
    type: 'weekly',
    days: { 0: [['07:00', '22:00']], 1: [['07:00', '22:00']], 2: [['07:00', '22:00']], 3: [['07:00', '22:00']], 4: [['07:00', '22:00']], 5: [], 6: [] },
  },
  kosher: null,
};

const editForm = (patch) => ({ ...placeToForm(place), ...patch });

describe('buildOwnerChanges', () => {
  it('reports nothing when the form equals the place', () => {
    const { changes, errors } = buildOwnerChanges(place, placeToForm(place));
    expect(changes).toEqual({});
    expect(errors).toEqual({});
  });

  it('returns only the fields that changed', () => {
    const { changes } = buildOwnerChanges(place, editForm({ phone: '04-999', description: 'חדש' }));
    expect(changes).toEqual({ phone: '04-999', description: 'חדש' });
  });

  it('treats surrounding whitespace as no change', () => {
    expect(buildOwnerChanges(place, editForm({ description: '  תיאור  ' })).changes).toEqual({});
  });

  it('sends the schedule together with its text', () => {
    const week = JSON.parse(JSON.stringify(place.opening_schedule));
    week.days[5] = [['08:00', '14:00']];
    const { changes } = buildOwnerChanges(place, editForm({ schedule: week }));
    expect(Object.keys(changes).sort()).toEqual(['opening_hours', 'opening_schedule']);
    expect(changes.opening_hours).toBe("א'-ה' 07:00-22:00, ו' 08:00-14:00");
  });

  it('sends kosher and its note as one unit', () => {
    const { changes } = buildOwnerChanges(place, editForm({ kosher: 'kosher', kosher_note: 'רבנות' }));
    expect(changes).toEqual({ kosher: 'kosher', kosher_note: 'רבנות' });
  });

  it('detects image additions, removals and reordering', () => {
    const second = IMG.replace('a.jpg', 'b.jpg');
    expect(buildOwnerChanges(place, editForm({ images: [IMG, second] })).changes.images).toEqual([IMG, second]);
    expect(buildOwnerChanges(place, editForm({ images: [] })).changes.images).toEqual([]);
    const two = { ...place, images: [IMG, second] };
    expect(buildOwnerChanges(two, { ...placeToForm(two), images: [second, IMG] }).changes.images).toEqual([second, IMG]);
  });

  it('never includes identity fields, even if the form was tampered with', () => {
    const { changes } = buildOwnerChanges(place, editForm({ name: 'אחר', address: 'אחרת', lat: '1', category: 'beach' }));
    expect(changes).toEqual({});
  });

  it('surfaces validation errors instead of sending bad data', () => {
    const bad = { type: 'weekly', days: { 0: [['9am', '5pm']] } };
    const { changes, errors } = buildOwnerChanges(place, editForm({ schedule: bad }));
    expect(changes).toEqual({});
    expect(errors.schedule).toBeTruthy();
  });
});

describe('groups', () => {
  it('lists the changed groups in display order', () => {
    const groups = changedGroups({ phone: 'x', opening_schedule: null, opening_hours: null, description: 'd' });
    expect(groups.map((g) => g.key)).toEqual(['description', 'phone', 'hours']);
  });

  it('expands groups to column names', () => {
    expect(fieldsOfGroups(['hours', 'kosher'])).toEqual(['opening_schedule', 'opening_hours', 'kosher', 'kosher_note']);
    expect(fieldsOfGroups([])).toEqual([]);
  });

  it('every group maps to fields the database accepts', () => {
    const allowed = ['short_description', 'description', 'phone', 'opening_hours', 'opening_schedule', 'images', 'kosher', 'kosher_note', 'price_level', 'tags'];
    expect(OWNER_GROUPS.flatMap((g) => g.fields).sort()).toEqual([...allowed].sort());
  });
});

describe('describeGroup', () => {
  const g = (key) => OWNER_GROUPS.find((x) => x.key === key);

  it('describes hours, kosher, price, tags and images', () => {
    expect(describeGroup(g('hours'), place)).toBe("א'-ה' 07:00-22:00");
    expect(describeGroup(g('hours'), { opening_schedule: null, opening_hours: 'ימים משתנים' })).toBe('ימים משתנים');
    expect(describeGroup(g('kosher'), { kosher: 'kosher', kosher_note: 'רבנות' })).toBe('כשר · רבנות');
    expect(describeGroup(g('kosher'), { kosher: null })).toBe('לא ידוע');
    expect(describeGroup(g('price_level'), place)).toBe('בינוני');
    expect(describeGroup(g('tags'), place)).toBe('קפה');
    expect(describeGroup(g('images'), place)).toBe('1 תמונות');
    expect(describeGroup(g('phone'), { phone: null })).toBe('—');
  });
});
