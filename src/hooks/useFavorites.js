import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * Keeps a place_id -> favorite record id map for the signed-in user so the
 * heart toggle and the bottom-nav badge stay in sync.
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
    base44.entities.Favorite
      .filter({ created_by_id: user.id }, { limit: 500 })
      .then((page) => {
        if (cancelled) return;
        const map = {};
        (page.items || []).forEach((favorite) => {
          map[favorite.place_id] = favorite.id;
        });
        setFavorites(map);
      })
      .catch(() => {
        if (!cancelled) setFavorites({});
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const isFavorite = (placeId) => Boolean(favorites[placeId]);

  const toggle = async (placeId) => {
    if (!isAuthenticated) return false;
    const existing = favorites[placeId];
    if (existing) {
      await base44.entities.Favorite.delete(existing);
      setFavorites((prev) => {
        const next = { ...prev };
        delete next[placeId];
        return next;
      });
    } else {
      const created = await base44.entities.Favorite.create({ place_id: placeId });
      setFavorites((prev) => ({ ...prev, [placeId]: created.id }));
    }
    return true;
  };

  return { favorites, isFavorite, toggle };
}
