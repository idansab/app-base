import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { countUnseen, getSeenAt, hasApprovedClaim } from '@/lib/ownerOverview';

/**
 * The signed-in user's businesses: ownership claims joined with the place, plus their update
 * requests. RLS guarantees every row belongs to the user.
 */
export default function useOwnerOverview() {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState({ loading: true, items: [], requests: [] });

  const load = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setState({ loading: false, items: [], requests: [] });
      return;
    }
    try {
      const { data: claims, error } = await supabase
        .from('place_owners')
        .select('id, place_id, status, relation, review_note, reviewed_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const placeIds = [...new Set((claims || []).map((c) => c.place_id))];
      let places = [];
      let requests = [];
      if (placeIds.length > 0) {
        const [placesRes, requestsRes] = await Promise.all([
          supabase.from('places').select('*').in('id', placeIds),
          supabase
            .from('place_update_requests')
            .select('id, place_id, status, review_note, reviewed_at, created_at, applied_fields')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);
        places = placesRes.data || [];
        requests = requestsRes.data || [];
      }
      const byId = new Map(places.map((p) => [p.id, p]));
      setState({
        loading: false,
        items: (claims || []).map((c) => ({ ...c, place: byId.get(c.place_id) || null })),
        requests,
      });
    } catch (e) {
      console.error('Failed to load owner overview:', e);
      setState({ loading: false, items: [], requests: [] });
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    reload: load,
    hasApproved: hasApprovedClaim(state.items),
    unseen: countUnseen(state.items, state.requests, getSeenAt()),
  };
}
