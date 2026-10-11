import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TripBuilder from './TripBuilder';
import StopPicker from './StopPicker';

const places = [
  { id: 'a', name: 'קפה הים', city: 'תל אביב', category: 'food', lat: 32.08, lng: 34.77, tags: [] },
  { id: 'b', name: 'גן הבהאים', city: 'חיפה', category: 'nature', lat: 32.81, lng: 34.99, tags: [] },
  { id: 'c', name: 'שונית אילת', city: 'אילת', category: 'nature', lat: 29.55, lng: 34.95, tags: [] },
];
const base = {
  userId: 'u1',
  places,
  favoriteIds: new Set(['c']),
  userLocation: null,
  onRequestLocation: async () => null,
  onSaved: () => {},
  onCancel: () => {},
};

describe('TripBuilder', () => {
  it('starts a new trip without needing any favorites', () => {
    const html = renderToStaticMarkup(<TripBuilder {...base} favoriteIds={new Set()} />);
    expect(html).toContain('מסלול חדש');
    expect(html).toContain('עוד אין תחנות');
    expect(html).toContain('קרובים');
    expect(html).toContain('חיפוש');
    expect(html).toContain('המועדפים שלי');
  });

  it('offers to share with the community, private by default', () => {
    const html = renderToStaticMarkup(<TripBuilder {...base} />);
    expect(html).toContain('שתף את המסלול עם הקהילה');
    expect(html).toContain('בלי שיתוף, המסלול נשאר פרטי');
  });

  it('opens an existing trip for editing with its stops in order', () => {
    const trip = { id: 't1', title: 'סיבוב בצפון', description: '', places_order: ['b', 'a'], is_public: true, author_name: 'דנה' };
    const html = renderToStaticMarkup(<TripBuilder {...base} initialTrip={trip} />);
    expect(html).toContain('עריכת מסלול');
    expect(html).toContain('סיבוב בצפון');
    expect(html.indexOf('גן הבהאים')).toBeLessThan(html.indexOf('קפה הים'));
    expect(html).toContain('שמור שינויים');
    expect(html).toContain('דנה');
  });
});

describe('StopPicker', () => {
  it('asks for the location while the trip is empty and there is no position', () => {
    const html = renderToStaticMarkup(
      <StopPicker places={places} favoriteIds={new Set()} selectedIds={[]} userLocation={null} onRequestLocation={async () => null} onAdd={() => {}} full={false} />
    );
    expect(html).toContain('השתמש במיקום שלי');
  });

  it('lists the places nearest the user, nearest first', () => {
    const html = renderToStaticMarkup(
      <StopPicker places={places} favoriteIds={new Set()} selectedIds={[]} userLocation={{ lat: 32.0, lng: 34.8 }} onRequestLocation={async () => null} onAdd={() => {}} full={false} />
    );
    expect(html).toContain('קרוב אליך');
    expect(html.indexOf('קפה הים')).toBeLessThan(html.indexOf('גן הבהאים'));
    expect(html.indexOf('גן הבהאים')).toBeLessThan(html.indexOf('שונית אילת'));
  });

  it('shows what is near the last stop once the trip has one', () => {
    const html = renderToStaticMarkup(
      <StopPicker places={places} favoriteIds={new Set()} selectedIds={['b']} userLocation={null} onRequestLocation={async () => null} onAdd={() => {}} full={false} />
    );
    expect(html).toContain('קרוב ל');
    expect(html).toContain('גן הבהאים');
    expect(html).not.toContain('הוסף את גן הבהאים למסלול');
    expect(html).toContain('הוסף את קפה הים למסלול');
  });
});
