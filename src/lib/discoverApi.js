import { supabase } from '@/api/base44Client';
import { DISCOVER_VIDEOS } from '@/lib/discoverVideos';
import { VIDEO_EXT, checkVideoMeta, validateVideoFile, validateVideoText } from '@/lib/videoSpec';
import { isDisplayNameRequired } from '@/lib/displayName';

const BUCKET = 'discover-videos';
const COLUMNS = 'id, place_id, owner_id, title, description, video_url, poster_url, storage_path, poster_path, duration_seconds, status, review_note, sort_order, created_at, places(id, name)';

// The feed also shows the place's details and the number of comments.
const FEED_COLUMNS = 'id, place_id, owner_id, title, description, video_url, poster_url, sort_order, created_at, places(id, name, city, short_description, lat, lng, tags)';
const COMMENT_COLUMNS = 'id, video_id, user_id, body, author_name, is_owner, created_at';

/** Feed order: admin order first, then newest. */
export const byFeedOrder = (a, b) => a.sort_order - b.sort_order || new Date(b.created_at) - new Date(a.created_at);

/** Approved videos for the public feed. Falls back to the built-in list if the table is not reachable. */
export async function loadFeed() {
  const approved = (columns) => supabase.from('discover_videos').select(columns).eq('status', 'approved');
  let { data, error } = await approved(`${FEED_COLUMNS}, discover_video_comments(count)`);
  // the comments table may not exist yet in this environment: load the feed without counts
  if (error) ({ data, error } = await approved(FEED_COLUMNS));
  if (error) return DISCOVER_VIDEOS.map((v) => ({ id: v.id, title: v.title, description: v.description, video_url: v.src, poster_url: v.poster }));
  return [...data].sort(byFeedOrder);
}

/** Comments of one video, oldest first. */
export async function loadComments(videoId) {
  const { data, error } = await supabase
    .from('discover_video_comments')
    .select(COMMENT_COLUMNS)
    .eq('video_id', videoId)
    .order('created_at');
  if (error) throw new Error('לא הצלחנו לטעון את התגובות');
  return data || [];
}

/** Adds a comment as the signed-in user and returns the saved row (with the name the server chose). */
export async function addComment(videoId, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('צריך להתחבר כדי להגיב');
  const { data, error } = await supabase
    .from('discover_video_comments')
    .insert({ video_id: videoId, user_id: uid, body: body.trim() })
    .select(COMMENT_COLUMNS)
    .single();
  if (error) {
    if (isDisplayNameRequired(error)) throw Object.assign(new Error('צריך לבחור שם לפני שמגיבים'), { code: 'display_name_required' });
    const limited = error.hint === 'too_many_requests' || /rate limit/i.test(error.message || '');
    throw new Error(limited ? 'יותר מדי תגובות בזמן קצר. נסו שוב בעוד כמה דקות' : 'שליחת התגובה נכשלה');
  }
  return data;
}

export async function deleteComment(commentId) {
  const { error } = await supabase.from('discover_video_comments').delete().eq('id', commentId);
  if (error) throw new Error('מחיקת התגובה נכשלה');
}

/** Everything (admin) or the caller's own videos (RLS decides). */
export async function loadAll() {
  const { data, error } = await supabase.from('discover_videos').select(COLUMNS).order('sort_order').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Removes the storage files of a video (no-op for built-in ones), then the row. */
export async function deleteVideo(video) {
  const { error } = await supabase.from('discover_videos').delete().eq('id', video.id);
  if (error) throw error;
  const paths = [video.storage_path, video.poster_path].filter(Boolean);
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths); // best effort: the row is already gone
}

/** Reads duration / size from the file and grabs a poster frame (JPEG blob). */
export function inspectVideo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    const done = (result) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const fail = () => done({ meta: { duration: NaN, width: 0, height: 0 }, poster: null });
    video.onerror = fail;
    video.onloadedmetadata = () => {
      const meta = { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
      video.onseeked = () => {
        try {
          const scale = Math.min(1, 540 / meta.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(meta.width * scale);
          canvas.height = Math.round(meta.height * scale);
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => done({ meta, poster: blob }), 'image/jpeg', 0.8);
        } catch {
          done({ meta, poster: null });
        }
      };
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    };
    video.src = url;
  });
}

/** Full owner flow: validate, upload video + poster, create a pending row. Throws a Hebrew message on failure. */
export async function submitOwnerVideo({ file, placeId, title, description, inspected }) {
  const fileProblem = validateVideoFile(file);
  if (fileProblem) throw new Error(fileProblem);
  const metaCheck = checkVideoMeta(inspected.meta);
  if (metaCheck.error) throw new Error(metaCheck.error);
  const textErrors = validateVideoText({ title, description });
  if (Object.keys(textErrors).length > 0) throw new Error(Object.values(textErrors)[0]);

  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('צריך להתחבר כדי להעלות סרטון');

  const base = `owners/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const videoPath = `${base}.${VIDEO_EXT[file.type]}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(videoPath, file, { contentType: file.type });
  if (upErr) throw new Error('ההעלאה נכשלה. בדוק את החיבור ונסה שוב');

  let posterPath = null;
  if (inspected.poster) {
    posterPath = `${base}.jpg`;
    const { error: posterErr } = await supabase.storage.from(BUCKET).upload(posterPath, inspected.poster, { contentType: 'image/jpeg' });
    if (posterErr) posterPath = null; // the video still works without a poster
  }

  const publicUrl = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from('discover_videos').insert({
    place_id: placeId,
    owner_id: uid,
    title: title.trim(),
    description: description.trim() || null,
    video_url: publicUrl(videoPath),
    poster_url: posterPath ? publicUrl(posterPath) : null,
    storage_path: videoPath,
    poster_path: posterPath,
    duration_seconds: Math.round(inspected.meta.duration * 10) / 10,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([videoPath, posterPath].filter(Boolean));
    throw new Error(error.message?.includes('too many') ? 'לעסק כבר יש 3 סרטונים. מחק אחד כדי להעלות חדש' : 'שמירת הסרטון נכשלה');
  }
}
