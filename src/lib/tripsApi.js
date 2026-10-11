import { supabase } from '@/api/base44Client';
import { parseOrder } from '@/lib/tripUtils';

// All reads of OTHER people's trips go through the community_* / saved_trips functions in migration 026:
// they never return the owner's user_id. Your own trips are read from the table.

const withOrder = (row) => ({ ...row, places_order: parseOrder(row.places_order) });

/** A Hebrew message for a failed trips call. */
export function tripErrorMessage(error, fallback = 'משהו השתבש. נסה שוב בעוד רגע.') {
  if (error?.hint === 'too_many_requests' || /rate limit/i.test(error?.message || '')) {
    return 'עשית הרבה פעולות היום. אפשר לנסות שוב מחר.';
  }
  return fallback;
}

export async function loadMyTrips(userId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(withOrder);
}

export async function loadCommunityTrips(limit = 50) {
  const { data, error } = await supabase.rpc('community_trips', { p_limit: limit });
  if (error) throw error;
  return (data || []).map(withOrder);
}

export async function loadSavedTrips() {
  const { data, error } = await supabase.rpc('saved_trips');
  if (error) throw error;
  return (data || []).map(withOrder);
}

/**
 * One trip by id: one of your own (read from the table), or a published trip (anyone, through the function).
 * Returns null when it is not there. `owned` tells the page whether to offer editing.
 */
export async function loadTripById(id, userId) {
  if (userId) {
    const { data: own, error: ownError } = await supabase.from('trips').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
    if (ownError) throw ownError;
    if (own) return { ...withOrder(own), owned: true };
  }
  const { data, error } = await supabase.rpc('community_trip', { p_id: id });
  if (error) throw error;
  return data && data.length > 0 ? { ...withOrder(data[0]), is_public: true, owned: false } : null;
}

export async function createTrip(userId, { title, description, order, hours, isPublic, authorName }) {
  const { data, error } = await supabase
    .from('trips')
    .insert([
      {
        user_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        places_order: JSON.stringify(order),
        duration_hours: hours,
        is_public: Boolean(isPublic),
        author_name: isPublic ? authorName?.trim() || null : null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return withOrder(data);
}

export async function updateTrip(id, { title, description, order, hours, isPublic, authorName }) {
  const { data, error } = await supabase
    .from('trips')
    .update({
      title: title.trim(),
      description: description?.trim() || null,
      places_order: JSON.stringify(order),
      duration_hours: hours,
      is_public: Boolean(isPublic),
      author_name: isPublic ? authorName?.trim() || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return withOrder(data);
}

export async function setTripPublished(id, isPublic, authorName) {
  const { data, error } = await supabase
    .from('trips')
    .update({ is_public: isPublic, author_name: isPublic ? authorName?.trim() || null : null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return withOrder(data);
}

export async function deleteTrip(id) {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}

export async function saveTripBookmark(userId, tripId) {
  const { error } = await supabase.from('trip_saves').insert([{ user_id: userId, trip_id: tripId }]);
  if (error && error.code !== '23505') throw error; // already saved
}

export async function removeTripBookmark(userId, tripId) {
  const { error } = await supabase.from('trip_saves').delete().eq('user_id', userId).eq('trip_id', tripId);
  if (error) throw error;
}

/** "Save and update": your own private copy of a trip, ready to edit. */
export async function duplicateTrip(userId, trip) {
  return createTrip(userId, {
    title: trip.title,
    description: trip.description,
    order: trip.places_order,
    hours: trip.duration_hours,
    isPublic: false,
  });
}

/** Reports go to the same admin inbox as other feedback. */
export async function reportTrip(tripId, reason) {
  const { error } = await supabase.rpc('submit_feedback', {
    p_message: `דיווח על מסלול: ${reason}`.slice(0, 2000),
    p_kind: 'bug',
    p_contact: null,
    p_page: `/trips/${tripId}`,
  });
  if (error) throw error;
}
