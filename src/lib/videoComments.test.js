import { describe, it, expect } from 'vitest';
import { COMMENT_MAX, OWNER_LABEL, commentAuthor, commentCount, timeAgo, validateCommentBody } from './videoComments';

describe('validateCommentBody', () => {
  it('rejects empty and too long comments', () => {
    expect(validateCommentBody('')).toBeTruthy();
    expect(validateCommentBody('   ')).toBeTruthy();
    expect(validateCommentBody('א'.repeat(COMMENT_MAX + 1))).toContain(String(COMMENT_MAX));
  });
  it('accepts a normal comment, ignoring surrounding spaces', () => {
    expect(validateCommentBody('  איזה מקום יפה  ')).toBeNull();
    expect(validateCommentBody('א'.repeat(COMMENT_MAX))).toBeNull();
  });
});

describe('commentAuthor', () => {
  it('shows the business-owner tag for the owner, whatever the stored name', () => {
    expect(commentAuthor({ is_owner: true, author_name: 'dana' })).toBe(OWNER_LABEL);
  });
  it('shows the display name for everyone else', () => {
    expect(commentAuthor({ is_owner: false, author_name: 'דנה מהגליל' })).toBe('דנה מהגליל');
    expect(commentAuthor({ is_owner: false, author_name: '' })).toBe('משתמש');
  });
});

describe('commentCount', () => {
  it('reads the embedded count and defaults to 0', () => {
    expect(commentCount({ discover_video_comments: [{ count: 4 }] })).toBe(4);
    expect(commentCount({})).toBe(0);
    expect(commentCount(null)).toBe(0);
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-16T12:00:00Z');
  it('formats recent times in Hebrew', () => {
    expect(timeAgo('2026-10-16T11:59:40Z', now)).toBe('עכשיו');
    expect(timeAgo('2026-10-16T11:55:00Z', now)).toBe('לפני 5 דק׳');
    expect(timeAgo('2026-10-16T09:00:00Z', now)).toBe('לפני 3 שע׳');
    expect(timeAgo('2026-10-15T10:00:00Z', now)).toBe('אתמול');
    expect(timeAgo('2026-10-13T12:00:00Z', now)).toBe('לפני 3 ימים');
  });
  it('falls back to a date after a week', () => {
    expect(timeAgo('2026-10-01T12:00:00Z', now)).toMatch(/\d/);
  });
});
