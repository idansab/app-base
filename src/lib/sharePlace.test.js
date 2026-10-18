import { describe, it, expect, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/trackPlace', () => ({ trackPlaceEvent: vi.fn() }));

import { placeShareText, placeShareUrl, sharePlaceLink } from './sharePlace';

const place = { id: 'abc-123', name: 'קפה נוף הגליל', city: 'עפולה' };
const location = { origin: 'https://mayeshpo.top' };

describe('placeShareUrl', () => {
  it('points at the place page', () => {
    expect(placeShareUrl(location.origin, 'abc-123')).toBe('https://mayeshpo.top/place/abc-123');
  });
  it('encodes odd ids', () => {
    expect(placeShareUrl('https://x.y', 'a b/c')).toBe('https://x.y/place/a%20b%2Fc');
  });
});

describe('placeShareText', () => {
  it('names the place and city', () => {
    expect(placeShareText(place)).toBe('קפה נוף הגליל · עפולה — מצאתי ב"מה יש פה"');
  });
});

describe('sharePlaceLink', () => {
  it('uses the native share sheet with the link', async () => {
    const share = vi.fn().mockResolvedValue();
    const result = await sharePlaceLink(place, { location, navigator: { share } });
    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://mayeshpo.top/place/abc-123' }));
  });
  it('treats a dismissed share sheet as cancelled, not as an error', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    expect(await sharePlaceLink(place, { location, navigator: { share } })).toBe('cancelled');
  });
  it('copies the link when there is no share sheet (desktop)', async () => {
    const writeText = vi.fn().mockResolvedValue();
    const result = await sharePlaceLink(place, { location, navigator: { clipboard: { writeText } } });
    expect(result).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://mayeshpo.top/place/abc-123');
  });
  it('copies the link when sharing fails for another reason', async () => {
    const share = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    const writeText = vi.fn().mockResolvedValue();
    expect(await sharePlaceLink(place, { location, navigator: { share, clipboard: { writeText } } })).toBe('copied');
  });
  it('reports failure when nothing works', async () => {
    expect(await sharePlaceLink(place, { location, navigator: {} })).toBe('failed');
  });
});
