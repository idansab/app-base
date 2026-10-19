import { describe, it, expect } from 'vitest';
import { ABOUT_SUMMARY, ABOUT_SOURCES, CONTACT_EMAIL, SITE_ORIGIN, siteJsonLd } from './siteAbout';

describe('siteJsonLd', () => {
  const ld = JSON.parse(siteJsonLd());
  const org = ld['@graph'].find((n) => n['@type'] === 'Organization');
  const site = ld['@graph'].find((n) => n['@type'] === 'WebSite');

  it('names the organization behind the site, with a way to reach it', () => {
    expect(org.email).toBe(CONTACT_EMAIL);
    expect(org.url).toBe(`${SITE_ORIGIN}/`);
    expect(org.description).toBe(ABOUT_SUMMARY);
  });

  it('links the website to its publisher', () => {
    expect(site.publisher['@id']).toBe(org['@id']);
  });

  it('is safe to put inside a <script> tag', () => {
    expect(siteJsonLd()).not.toMatch(/<\/?script/i);
  });
});

describe('ABOUT_SOURCES', () => {
  it('every source has a title and an explanation', () => {
    expect(ABOUT_SOURCES.length).toBeGreaterThan(0);
    for (const s of ABOUT_SOURCES) {
      expect(s.title.length).toBeGreaterThan(1);
      expect(s.text.length).toBeGreaterThan(20);
    }
  });
});
