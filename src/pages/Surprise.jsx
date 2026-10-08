import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, RefreshCw, Heart, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haversineKm, formatDistance } from '@/lib/geo';
import useUserLocation from '@/hooks/useUserLocation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Surprise() {
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const { location: autoLocation } = useUserLocation({ auto: true });

  useEffect(() => {
    if (autoLocation && !userLocation) {
      setUserLocation(autoLocation);
    }
  }, [autoLocation]);

  useEffect(() => {
    loadSurprise();
  }, [userLocation]);

  const loadSurprise = async () => {
    try {
      setLoading(true);
      const { data: places, error } = await supabase
        .from('places')
        .select('*')
        .eq('status', 'approved');
      if (error) throw error;

      if (!places || places.length === 0) {
        setPlace(null);
        return;
      }

      // Random place
      const randomPlace = places[Math.floor(Math.random() * places.length)];
      setPlace(randomPlace);

      // Calculate distance
      if (userLocation) {
        const dist = haversineKm(userLocation.lat, userLocation.lng, randomPlace.lat, randomPlace.lng);
        setDistance(dist);
      }

      // Check if favorite
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: favData } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', user.id);
        setIsFavorite((favData || []).some(f => f.place_id === randomPlace.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!place) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', place.id);
        if (error) throw error;
        setIsFavorite(false);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: user.id, place_id: place.id }]);
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place_id: place.id }),
        });
        setIsFavorite(true);
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-24">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-700">מחפש הפתעה...</p>
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-24">
        <div className="text-center">
          <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">אין מקומות</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-20 py-4">
        <div className="px-4 max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-right font-bold text-2xl text-green-600 flex items-center gap-2">
            <Sparkles size={28} />
            הפתעה!
          </h1>
        </div>
      </div>

      {/* Place Card - Large */}
      <div className="px-4 max-w-6xl mx-auto py-6">
        <AnimatePresence mode="wait">
          {place && (
            <motion.div
              key={place.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="bg-white rounded-3xl overflow-hidden shadow-md"
            >
          {/* Image */}
          <div className="relative h-80 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
            {place.image_url && (
              <img
                src={place.image_url}
                alt={place.name}
                className="w-full h-full object-cover"
                onError={(e) => (e.target.style.display = 'none')}
              />
            )}

            {/* Favorite Button */}
            <button
              onClick={handleFavoriteToggle}
              className="absolute top-6 right-6 p-3 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-lg"
            >
              <Heart
                size={28}
                className={isFavorite ? 'fill-red-600 text-red-600' : 'text-gray-600'}
              />
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            <h1 className="text-4xl font-bold text-right mb-4">{place.name}</h1>

            <p className="text-lg text-gray-600 text-right mb-6 leading-relaxed">
              {place.description || place.short_description}
            </p>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8 text-right">
              {place.rating && (
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-sm text-gray-600 mb-1">דירוג</p>
                  <p className="text-2xl font-bold text-yellow-500">⭐ {place.rating.toFixed(1)}</p>
                </div>
              )}

              {distance != null && (
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-sm text-gray-600 mb-1">מרחק</p>
                  <p className="text-2xl font-bold text-green-600">{formatDistance(distance)}</p>
                </div>
              )}

              {place.opening_hours && (
                <div className="bg-slate-50 p-4 rounded-2xl col-span-2">
                  <p className="text-sm text-gray-600 mb-1">שעות פתיחה</p>
                  <p className="font-semibold">{place.opening_hours}</p>
                </div>
              )}

              {place.phone && (
                <div className="bg-slate-50 p-4 rounded-2xl col-span-2">
                  <p className="text-sm text-gray-600 mb-1">טלפון</p>
                  <a href={`tel:${place.phone}`} className="font-semibold text-green-600 hover:underline">
                    {place.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end flex-wrap">
              <button
                onClick={loadSurprise}
                className="px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <RefreshCw size={20} />
                הפתעה אחרת
              </button>

              {place.lat && place.lng && (
                <a
                  href={`https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-slate-100 text-gray-700 rounded-2xl hover:bg-slate-200 transition-colors font-medium flex items-center gap-2"
                >
                  <MapPin size={20} />
                  ניווט ב־Waze
                </a>
              )}
            </div>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
