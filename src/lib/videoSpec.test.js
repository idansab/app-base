import { describe, it, expect } from 'vitest';
import { VIDEO_SPEC, checkVideoMeta, formatBytes, validateVideoFile, validateVideoText } from './videoSpec';

describe('validateVideoFile', () => {
  it('accepts a normal mp4', () => {
    expect(validateVideoFile({ type: 'video/mp4', size: 10 * 1024 * 1024 })).toBeNull();
  });
  it('rejects other types', () => {
    expect(validateVideoFile({ type: 'video/x-msvideo', size: 1000 })).toMatch(/MP4/);
  });
  it('rejects files over the limit', () => {
    expect(validateVideoFile({ type: 'video/mp4', size: VIDEO_SPEC.maxBytes + 1 })).toMatch(/כבד מדי/);
  });
  it('rejects a missing file', () => {
    expect(validateVideoFile(null)).toBeTruthy();
  });
});

describe('checkVideoMeta', () => {
  it('passes a 1080x1920 20s video with no warnings', () => {
    expect(checkVideoMeta({ duration: 20, width: 1080, height: 1920 })).toEqual({ error: null, warnings: [] });
  });
  it('blocks videos that are too short or too long', () => {
    expect(checkVideoMeta({ duration: 2, width: 1080, height: 1920 }).error).toMatch(/קצר/);
    expect(checkVideoMeta({ duration: 90, width: 1080, height: 1920 }).error).toMatch(/ארוך/);
  });
  it('blocks landscape and square videos', () => {
    expect(checkVideoMeta({ duration: 20, width: 1920, height: 1080 }).error).toMatch(/לאורך/);
    expect(checkVideoMeta({ duration: 20, width: 1080, height: 1080 }).error).toMatch(/לאורך/);
  });
  it('warns on odd ratio, low resolution and long videos', () => {
    const { error, warnings } = checkVideoMeta({ duration: 45, width: 600, height: 900 });
    expect(error).toBeNull();
    expect(warnings).toHaveLength(3);
  });
  it('fails when metadata could not be read', () => {
    expect(checkVideoMeta({ duration: NaN, width: 0, height: 0 }).error).toBeTruthy();
  });
});

describe('validateVideoText', () => {
  it('requires a title of 3-60 chars', () => {
    expect(validateVideoText({ title: 'ab' }).title).toBeTruthy();
    expect(validateVideoText({ title: 'x'.repeat(61) }).title).toBeTruthy();
    expect(validateVideoText({ title: 'קפה טוב' })).toEqual({});
  });
  it('caps the description', () => {
    expect(validateVideoText({ title: 'קפה טוב', description: 'x'.repeat(141) }).description).toBeTruthy();
  });
});

describe('formatBytes', () => {
  it('formats MB and KB', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0MB');
    expect(formatBytes(2048)).toBe('2KB');
  });
});
