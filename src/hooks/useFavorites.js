import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * Keeps a place_id -> favorite record id map for the signed-in user so the
 * heart toggle and the bottom-nav badge stay in sync. RLS limits every query
 * to the caller's own rows.
 */
export default function useFavorites() {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState({});

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id) {
      setFavorites({});
      return () => {
        cancelled = true;
      };
    }
    supabase
      .from("favorites")
      .select("id, place_id")
      .eq("user_id", user.id)
      .limit(500)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setFavorites({});
          return;
        }
        const map = {};
        (data || []).forEach((favorite) => {
          map[favorite.place_id] = favorite.id;
        });
        setFavorites(map);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const isFavorite = (placeId) => Boolean(favorites[placeId]);

  const toggle = useCallback(
    async (placeId) => {
      if (!isAuthenticated || !user?.id) return false;
      const existing = favorites[placeId];
      if (existing) {
        const { error } = await supabase.from("favorites").delete().eq("id", existing);
        if (error) throw error;
        setFavorites((prev) => {
          const next = { ...prev };
          delete next[placeId];
          return next;
        });
      } else {
        const { data, error } = await supabase
          .from("favorites")
          .insert([{ place_id: placeId, user_id: user.id }])
          .select("id")
          .single();
        if (error) throw error;
        setFavorites((prev) => ({ ...prev, [placeId]: data.id }));
      }
      return true;
    },
    [favorites, isAuthenticated, user?.id]
  );

  return { favorites, isFavorite, toggle };
}
