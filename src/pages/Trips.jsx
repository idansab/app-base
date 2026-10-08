import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import PlaceCard from '@/components/PlaceCard';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Sample trip routes
const SAMPLE_TRIPS = [
  {
    id: 1,
    title: 'סיור בעמקי השרון',
    description: 'סיור קצר בטבע עם קפה וקצת טריק',
    duration: '4 שעות',
    places: [1, 2, 3],
  },
  {
    id: 2,
    title: 'יום שלם בנגב',
    description: 'חוויה שלמה בדרום ארץ',
    duration: '8 שעות',
    places: [4, 5, 6],
  },
];

export default function Trips() {
  const [trips, setTrips] = useState(SAMPLE_TRIPS);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        setLoading(true);
        const { data: allPlaces, error: placesError } = await supabase
          .from('places')
          .select('*')
          .eq('status', 'approved');
        if (placesError) throw placesError;
        setPlaces(allPlaces || []);

        // Load favorites
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: favData } = await supabase
            .from('favorites')
            .select('place_id')
            .eq('user_id', user.id);
          setFavorites((favData || []).map(f => f.place_id));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadPlaces();
  }, []);

  const handleFavoriteToggle = async (placeId) => {
    const isFavorited = favorites.includes(placeId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', placeId);
        if (error) throw error;
        setFavorites(prev => prev.filter(id => id !== placeId));
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: user.id, place_id: placeId }]);
        if (error) throw error;
        setFavorites(prev => [...prev, placeId]);
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  };

  const getTripPlaces = () => {
    if (!selectedTrip) return [];
    return places.filter(p => selectedTrip.places.includes(p.id));
  };

  const tripPlaces = getTripPlaces();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-24">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-700">טוען מסלולים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-20 py-4">
        <div className="px-4 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-right text-green-600">מסלולים</h1>
        </div>
      </div>

      {/* Trips List */}
      <div className="px-4 max-w-6xl mx-auto py-6">
        {trips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">אין עדיין מסלולים</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 mb-8">
            {trips.map(trip => (
              <button
                key={trip.id}
                onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
                className={`text-right p-4 rounded-2xl border-2 transition-all ${
                  selectedTrip?.id === trip.id
                    ? 'bg-green-50 border-green-600'
                    : 'bg-white border-gray-200 hover:border-green-600'
                }`}
              >
                <h3 className="font-bold text-lg mb-1">{trip.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{trip.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {trip.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {trip.places.length} מקומות
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Trip Details */}
        {selectedTrip && (
          <div className="mt-8">
            {/* Simple SVG Map */}
            {tripPlaces.length > 0 && (
              <div className="mb-8 bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="font-bold text-lg mb-4 text-right">מפה אינטראקטיבית</h3>
                <svg
                  viewBox="0 0 400 300"
                  className="w-full h-auto bg-slate-50 rounded-xl border border-gray-200"
                  style={{ direction: 'ltr' }}
                >
                  {/* Draw connecting line */}
                  {tripPlaces.length > 1 && (
                    <polyline
                      points={tripPlaces
                        .map((_, i) => {
                          const x = 50 + (i * 350) / (tripPlaces.length - 1);
                          const y = 150;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                      stroke="#16a34a"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Draw stop numbers */}
                  {tripPlaces.map((place, i) => {
                    const x = 50 + (i * 350) / (Math.max(tripPlaces.length - 1, 1));
                    const y = 150;
                    return (
                      <g key={place.id}>
                        <circle cx={x} cy={y} r="25" fill="#16a34a" />
                        <text
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dy="0.3em"
                          className="text-white font-bold text-lg"
                          fill="white"
                        >
                          {i + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Places in Trip */}
            <div>
              <h3 className="font-bold text-lg mb-4 text-right">מקומות במסלול</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tripPlaces.map((place, index) => (
                  <div key={place.id} className="relative">
                    <div className="absolute top-3 right-3 bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                      {index + 1}
                    </div>
                    <PlaceCard
                      place={place}
                      distance={null}
                      isFavorite={favorites.includes(place.id)}
                      onFavoriteToggle={() => handleFavoriteToggle(place.id)}
                      onClick={() => {
                        // TODO: Open place details
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Custom Trip */}
        <div className="mt-12 p-6 bg-white rounded-2xl border-2 border-green-200 text-right">
          <h3 className="font-bold text-lg mb-2">צור מסלול משלך</h3>
          <p className="text-sm text-gray-600 mb-4">בחר מקומות מהמועדפים שלך ויצור מסלול ייחודי</p>
          <button className="px-6 py-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors font-medium text-sm">
            צור מסלול חדש
          </button>
        </div>
      </div>
    </div>
  );
}
