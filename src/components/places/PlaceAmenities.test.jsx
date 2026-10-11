import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PlaceAmenities from './PlaceAmenities';

describe('PlaceAmenities', () => {
  it('renders nothing when no amenity is known', () => {
    expect(renderToStaticMarkup(<PlaceAmenities place={{ amenities: [] }} />)).toBe('');
    expect(renderToStaticMarkup(<PlaceAmenities place={{}} compact />)).toBe('');
  });

  it('shows only the amenities the place has, with a title in the full view', () => {
    const html = renderToStaticMarkup(<PlaceAmenities place={{ amenities: ['wheelchair', 'parking'] }} />);
    expect(html).toContain('מאפייני המקום');
    expect(html).toContain('נגיש לנכים');
    expect(html).toContain('חניה מסודרת');
    expect(html).not.toContain('נגיש לרכב');
  });

  it('has a compact row without the title for cards', () => {
    const html = renderToStaticMarkup(<PlaceAmenities place={{ amenities: ['car_access'] }} compact />);
    expect(html).toContain('נגיש לרכב');
    expect(html).not.toContain('מאפייני המקום');
  });
});
