import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import FilterSheet from './FilterSheet';

const filters = [
  { key: 'open', group: 'זמינות', label: 'פתוח עכשיו', active: false, toggle: () => {}, count: 20 },
  { key: 'wheelchair', group: 'נגישות וחניה', label: 'נגיש לנכים', active: true, toggle: () => {}, count: 11 },
];

describe('FilterSheet', () => {
  const html = renderToStaticMarkup(<FilterSheet filters={filters} resultCount={11} onClear={() => {}} onClose={() => {}} />);

  it('groups the options and shows a count next to each', () => {
    expect(html).toContain('זמינות');
    expect(html).toContain('נגישות וחניה');
    expect(html).toContain('פתוח עכשיו');
    expect(html).toContain('נגיש לנכים');
  });

  it('marks the active switch for assistive technology', () => {
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
  });

  it('shows the live result count on the main button', () => {
    expect(html).toContain('הצג 11 מקומות');
  });
});
