import React, { useState, useEffect } from 'react';
import { Loader2, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import PlaceCard from '@/components/PlaceCard';
import { haversineKm } from '@/lib/geo';
import useUserLocation from '@/hooks/useUserLocation';

const API_BASE = 'http://localhost:3001/api';

export default function Favorites() {
  const [places, setPlaces] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const { location: autoLocation } = useUserLocation({ auto: true });

  useEffect(() => {
    if (autoLocation && !userLocation) {
      setUserLocation(autoLocation);
    }
  }, [autoLocation]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/places?status=approved`);
        if (!res.ok) throw new Error('Failed to load places');
        const data = await res.json();
        setPlaces(data.data || []);

        // Load favorites
        const favRes = await fetch(`${API_BASE}/favorites`);
        if (favRes.ok) {
          const favData = await favRes.json();
          setFavorites(favData.map(f => f.place_id));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleFavoriteToggle = async (placeId) => {
    const isFavorited = favorites.includes(placeId);
    try {
      if (isFavorited) {
        await fetch(`${API_BASE}/favorites/${placeId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
        setFavorites(prev => prev.filter(id => id !== placeId));
      } else {
        await fetch(`${API_BASE}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place_id: placeId }),
        });
        setFavorites(prev => [...prev, placeId]);
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  };

  const favoritePlaces = places.filter(p => favorites.includes(p.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-24">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-700">טוען מועדפים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-20 py-4">
        <div className="px-4 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-right text-green-600 flex items-center gap-2 justify-end">
            <span>{favoritePlaces.length}</span>
            <Heart size={28} className="fill-red-600 text-red-600" />
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-6xl mx-auto py-6">
        {favoritePlaces.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <Heart size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">אין עדיין מועדפים</h2>
            <p className="text-gray-600 mb-6">בחר מקומות חביבים עליך וחזור לכאן כדי לשמור אותם</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors font-medium"
            >
              חפש מקומות
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoritePlaces.map(place => {
              const distance = userLocation
                ? haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng)
                : null;
              return (
                <PlaceCard
                  key={place.id}
                  place={place}
                  distance={distance}
                  isFavorite={true}
                  onFavoriteToggle={() => handleFavoriteToggle(place.id)}
                  onClick={() => {
                    // TODO: Navigate to place details modal
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
