// What a "Discover" video must look like. Shown to business owners and enforced before upload.
// The 40MB / 60s limits are mirrored by the bucket (028_discover_videos.sql).

export const VIDEO_SPEC = {
  ratio: '9:16',
  width: 1080,
  height: 1920,
  minSeconds: 5,
  idealSeconds: '15–30',
  maxSeconds: 60,
  maxBytes: 40 * 1024 * 1024,
  maxTitle: 60,
  minTitle: 3,
  maxDescription: 140,
};

export const VIDEO_EXT = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

const PORTRAIT_RATIO = 9 / 16;

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/** Hebrew error message or null. */
export function validateVideoFile(file) {
  if (!file) return 'לא נבחר קובץ';
  if (!VIDEO_EXT[file.type]) return 'אפשר להעלות MP4, WEBM או MOV בלבד (מומלץ MP4)';
  if (file.size > VIDEO_SPEC.maxBytes) {
    return `הסרטון כבד מדי (${formatBytes(file.size)}). המקסימום ${formatBytes(VIDEO_SPEC.maxBytes)}. אפשר לכווץ בשמירה ברזולוציית 1080p`;
  }
  return null;
}

/**
 * Checks what the browser read from the file. `error` blocks the upload,
 * `warnings` are shown but allowed.
 */
export function checkVideoMeta({ duration, width, height }) {
  if (!Number.isFinite(duration) || !width || !height) {
    return { error: 'לא הצלחנו לקרוא את הסרטון. נסה לייצא אותו שוב כ-MP4 (H.264)', warnings: [] };
  }
  if (duration < VIDEO_SPEC.minSeconds) {
    return { error: `הסרטון קצר מדי (${duration.toFixed(1)} שניות). המינימום ${VIDEO_SPEC.minSeconds} שניות`, warnings: [] };
  }
  if (duration > VIDEO_SPEC.maxSeconds) {
    return { error: `הסרטון ארוך מדי (${Math.round(duration)} שניות). המקסימום ${VIDEO_SPEC.maxSeconds} שניות`, warnings: [] };
  }
  if (height <= width) {
    return { error: 'הסרטון חייב להיות מצולם לאורך (אנכי, 9:16). סרטון לרוחב ייחתך ולא ייראה טוב', warnings: [] };
  }
  const warnings = [];
  if (Math.abs(width / height - PORTRAIT_RATIO) > 0.06) {
    warnings.push('היחס אינו בדיוק 9:16, יופיעו פסים שחורים בצדדים');
  }
  if (width < 720) warnings.push('הרזולוציה נמוכה. מומלץ 1080×1920');
  if (duration > 30) warnings.push('סרטונים של 15–30 שניות נצפים עד הסוף יותר');
  return { error: null, warnings };
}

/** Returns a { title, description } error map (empty when valid). */
export function validateVideoText({ title, description }) {
  const errors = {};
  const t = (title || '').trim();
  if (t.length < VIDEO_SPEC.minTitle) errors.title = `כותרת קצרה מדי (לפחות ${VIDEO_SPEC.minTitle} תווים)`;
  else if (t.length > VIDEO_SPEC.maxTitle) errors.title = `כותרת ארוכה מדי (עד ${VIDEO_SPEC.maxTitle} תווים)`;
  if ((description || '').trim().length > VIDEO_SPEC.maxDescription) {
    errors.description = `התיאור ארוך מדי (עד ${VIDEO_SPEC.maxDescription} תווים)`;
  }
  return errors;
}
