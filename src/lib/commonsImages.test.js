import { describe, it, expect } from 'vitest';
import { buildCredit, commonsFilePage, licenseUrl, cleanUrl, isFreeLicense, isUnwantedAuthor, isUsefulTitle, isPhotoMime, parseCommonsRef, pickImages, stripHtml, titleMatches } from './commonsImages';

describe('parseCommonsRef', () => {
  it('parses categories and files, with underscores and URLs', () => {
    expect(parseCommonsRef('Category:Ein_Gedi')).toEqual({ type: 'category', title: 'Category:Ein Gedi' });
    expect(parseCommonsRef('File:Masada.jpg')).toEqual({ type: 'file', title: 'File:Masada.jpg' });
    expect(parseCommonsRef('https://commons.wikimedia.org/wiki/File:Masada_view.jpg')).toEqual({ type: 'file', title: 'File:Masada view.jpg' });
  });

  it('ignores anything else', () => {
    expect(parseCommonsRef('https://example.com/photo.jpg')).toBeNull();
    expect(parseCommonsRef('')).toBeNull();
    expect(parseCommonsRef(null)).toBeNull();
    expect(parseCommonsRef('Masada')).toBeNull();
  });
});

describe('isFreeLicense', () => {
  it('accepts CC0, public domain, CC BY and CC BY-SA', () => {
    for (const l of ['CC0', 'Public domain', 'PD-old-100', 'CC BY 4.0', 'CC BY-SA 3.0', 'CC BY-SA 2.5 Generic', 'CC-BY-SA-4.0']) {
      expect(isFreeLicense(l)).toBe(true);
    }
  });

  it('rejects NonCommercial, NoDerivatives, fair use and unknown licenses', () => {
    for (const l of ['CC BY-NC 4.0', 'CC BY-ND 2.0', 'CC BY-NC-SA 3.0', 'Fair use', 'All rights reserved', 'GFDL', '', null, 'Copyrighted free use']) {
      expect(isFreeLicense(l)).toBe(false);
    }
  });
});

describe('stripHtml', () => {
  it('turns the Artist field into plain text', () => {
    expect(stripHtml('<a href="//commons.wikimedia.org/wiki/User:Dan">Dan &amp; Co</a>')).toBe('Dan & Co');
  });

  it('caps long text and tolerates empty input', () => {
    expect(stripHtml('x'.repeat(300))).toHaveLength(120);
    expect(stripHtml(undefined)).toBe('');
  });
});

describe('buildCredit', () => {
  const info = {
    mime: 'image/jpeg',
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:A.jpg',
    extmetadata: {
      LicenseShortName: { value: 'CC BY-SA 4.0' },
      LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
      Artist: { value: '<a href="x">Yael Cohen</a>' },
    },
  };

  it('builds the attribution for a usable photo', () => {
    expect(buildCredit(info)).toEqual({
      author: 'Yael Cohen',
      license: 'CC BY-SA 4.0',
      license_url: 'https://creativecommons.org/licenses/by-sa/4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg',
    });
  });

  it('refuses non-free licenses and non-photo files', () => {
    expect(buildCredit({ ...info, extmetadata: { ...info.extmetadata, LicenseShortName: { value: 'CC BY-NC 4.0' } } })).toBeNull();
    expect(buildCredit({ ...info, mime: 'image/svg+xml' })).toBeNull();
    expect(buildCredit(undefined)).toBeNull();
  });

  it('falls back to a generic author when none is given', () => {
    expect(buildCredit({ ...info, extmetadata: { LicenseShortName: { value: 'CC0' } } }).author).toBe('Wikimedia Commons');
  });
});

describe('isPhotoMime', () => {
  it('accepts web photo formats only', () => {
    expect(isPhotoMime('image/jpeg')).toBe(true);
    expect(isPhotoMime('image/png')).toBe(true);
    expect(isPhotoMime('image/svg+xml')).toBe(false);
    expect(isPhotoMime('application/pdf')).toBe(false);
  });
});

describe('titleMatches', () => {
  it('matches a Hebrew name inside a Hebrew file title', () => {
    expect(titleMatches('File:עין גדי 2019.jpg', ['עין גדי'])).toBe(true);
  });

  it('matches a distinctive English word', () => {
    expect(titleMatches('File:Ein Gedi waterfall.jpg', ['עין גדי', 'Ein Gedi'])).toBe(true);
    expect(titleMatches('File:Masada cable car.jpg', ['Masada'])).toBe(true);
  });

  it('does not match a nearby but different subject', () => {
    expect(titleMatches('File:Tel Aviv beach sunset.jpg', ['עין גדי', 'Ein Gedi'])).toBe(false);
    expect(titleMatches('File:IMG_1234.jpg', ['מצפה רמון'])).toBe(false);
  });

  it('does not match on short words', () => {
    expect(titleMatches('File:The road to Eilat.jpg', ['Ein Tal'])).toBe(false);
  });
});

describe('pickImages', () => {
  const make = (url, width, license = 'CC BY 4.0', mime = 'image/jpeg') => ({
    via: 'wikidata',
    info: { thumburl: url, width, mime, extmetadata: { LicenseShortName: { value: license } } },
  });

  it('keeps usable photos in order, up to the maximum', () => {
    const picked = pickImages([make('a', 1200), make('b', 1500), make('c', 900), make('d', 2000)], 3);
    expect(picked.map((p) => p.url)).toEqual(['a', 'b', 'c']);
  });

  it('skips small, non-free and duplicate images', () => {
    const picked = pickImages([make('small', 400), make('nc', 1500, 'CC BY-NC 4.0'), make('ok', 1500), make('ok', 1500)], 3);
    expect(picked.map((p) => p.url)).toEqual(['ok']);
  });

  it('returns nothing when nothing qualifies', () => {
    expect(pickImages([], 3)).toEqual([]);
  });
});

describe('isUsefulTitle', () => {
  it('rejects map screenshots, old maps and archive illustrations', () => {
    for (const t of ['File:IHM עין אלון.jpeg', 'File:Israel Hiking Map עין כנף.jpeg', 'File:Shauf 1942.jpg', 'File:Endor1890.jpg', 'File:Tantura, in 1851.png', 'File:Morgan-bible-fl-46.jpg', 'File:thumbnail.jpg', 'File:Old map of Safed.jpg']) {
      expect(isUsefulTitle(t)).toBe(false);
    }
  });

  it('rejects archive photographs and hotel photos', () => {
    expect(isUsefulTitle('File:Arab orange groves at Bir Salem LOC matpc.18637.jpg')).toBe(false);
    expect(isUsefulTitle('File:מלון חוף גיא טבריה (15824785236).jpg')).toBe(false);
    expect(isUsefulTitle('File:Hotel Eilat.jpg')).toBe(false);
  });

  it('rejects official-visit photos and unpleasant subjects', () => {
    expect(isUsefulTitle('File:Ambassador Jack Lew Visits Haifa, Israel on April 2, 2024 - 29.jpg')).toBe(false);
    expect(isUsefulTitle('File:Feces in Red Canyon.jpg')).toBe(false);
  });

  it('keeps ordinary photos, including modern dates and long photo ids', () => {
    for (const t of ['File:Ein Akov (10).jpg', 'File:PikiWiki Israel 8076 wilfried israel museum.jpg', 'File:20140801-IMG 0217.jpg', 'File:עין נטפים - השוקת.jpg', "File:Ein Yorke'am (997009157668705171).jpg", 'File:Carmel Market, 2019 (07).jpg']) {
      expect(isUsefulTitle(t)).toBe(true);
    }
  });
});

describe('cleanUrl', () => {
  it('drops tracking parameters', () => {
    expect(cleanUrl('https://upload.wikimedia.org/a/960px-X.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo')).toBe('https://upload.wikimedia.org/a/960px-X.jpg');
    expect(cleanUrl('https://x/y.jpg')).toBe('https://x/y.jpg');
  });
});

describe('pickImages with titles', () => {
  const make = (title, url) => ({ via: 'wikidata', title, info: { thumburl: url, width: 1200, mime: 'image/jpeg', extmetadata: { LicenseShortName: { value: 'CC BY 4.0' } } } });

  it('skips unwanted titles and cleans the url', () => {
    const picked = pickImages([make('File:IHM x.jpeg', 'https://u/a.jpg'), make('File:Good view.jpg', 'https://u/b.jpg?utm_source=x')], 3);
    expect(picked.map((p) => p.url)).toEqual(['https://u/b.jpg']);
  });

  it('skips urls longer than the database limit', () => {
    expect(pickImages([make('File:Good.jpg', `https://u/${'a'.repeat(520)}.jpg`)], 3)).toEqual([]);
  });
});

describe('isUnwantedAuthor', () => {
  it('rejects archives and historical illustrators', () => {
    for (const a of ['Internet Archive Book Images', 'Scan by NYPL', 'American Colony, Jerusalem', 'David Roberts', 'Matson collection', 'Library of Congress']) {
      expect(isUnwantedAuthor(a)).toBe(true);
    }
  });

  it('accepts ordinary photographers', () => {
    for (const a of ['Hanay', 'ד"ר אבישי טייכר', 'Bahnfrend', '', null]) expect(isUnwantedAuthor(a)).toBe(false);
  });

  it('is applied by pickImages', () => {
    const info = { thumburl: 'https://u/a.jpg', width: 1200, mime: 'image/jpeg', extmetadata: { LicenseShortName: { value: 'Public domain' }, Artist: { value: 'American Colony, Jerusalem' } } };
    expect(pickImages([{ via: 'x', title: 'File:Good.jpg', info }], 3)).toEqual([]);
  });
});

describe('commonsFilePage / licenseUrl', () => {
  it('derives the file page from thumb and original urls', () => {
    expect(commonsFilePage('https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Ein_Shokek.jpg/960px-Ein_Shokek.jpg')).toBe('https://commons.wikimedia.org/wiki/File:Ein_Shokek.jpg');
    expect(commonsFilePage('https://upload.wikimedia.org/wikipedia/commons/f/f9/Beine.jpg')).toBe('https://commons.wikimedia.org/wiki/File:Beine.jpg');
    expect(commonsFilePage('https://example.com/a.jpg')).toBeNull();
  });

  it('maps CC names to license pages', () => {
    expect(licenseUrl('CC BY-SA 4.0')).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(licenseUrl('CC BY 2.5')).toBe('https://creativecommons.org/licenses/by/2.5/');
    expect(licenseUrl('CC0')).toBe('https://creativecommons.org/publicdomain/zero/1.0/');
    expect(licenseUrl('Public domain')).toBeNull();
  });
});
