// Comments on "Discover" videos. The author's name and owner flag are set by the database
// (see supabase/migrations/030_discover_video_comments.sql); the client only displays them.

export const COMMENT_MAX = 300;
export const OWNER_LABEL = 'בעל העסק';

/** Returns a Hebrew error for an invalid comment, or null when it can be sent. */
export function validateCommentBody(body) {
  const text = (body || '').trim();
  if (!text) return 'כתבו משהו לפני השליחה';
  if (text.length > COMMENT_MAX) return `עד ${COMMENT_MAX} תווים`;
  return null;
}

/** The name shown above a comment. */
export const commentAuthor = (comment) => (comment.is_owner ? OWNER_LABEL : comment.author_name || 'משתמש');

/** Comment count from a feed row (embedded `discover_video_comments(count)`), 0 when missing. */
export const commentCount = (video) => video?.discover_video_comments?.[0]?.count ?? 0;

/** "עכשיו", "לפני 5 דק׳", "לפני 3 שע׳", "לפני 2 ימים", or a date for anything older than a week. */
export function timeAgo(date, now = new Date()) {
  const minutes = Math.floor((now - new Date(date)) / 60000);
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'אתמול';
  if (days < 7) return `לפני ${days} ימים`;
  return new Date(date).toLocaleDateString('he-IL');
}
