import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import LocationPicker from '@/components/LocationPicker';
import PlaceCard from '@/components/PlaceCard';
import PlaceDetailsSheet from '@/components/places/PlaceDetailsSheet';
import { haversineKm } from '@/lib/geo';
import useUserLocation from '@/hooks/useUserLocation';
import { useAuth } from '@/lib/AuthContext';

const CATEGORIES = [
  { id: 'all', label: 'הכל', emoji: '🌍' },
  { id: 'food', label: 'עגלות קפה ואוכל', emoji: '☕' },
  { id: 'nature', label: 'טבע וטיולים', emoji: '🏞️' },
  { id: 'nightlife', label: 'חיי לילה', emoji: '🌙' },
  { id: 'shopping', label: 'קניות ושווקים', emoji: '🛍️' },
  { id: 'culture', label: 'תרבות', emoji: '🎨' },
];

const API_BASE = 'http://localhost:3001/api';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [places, setPlaces] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [maxDistance, setMaxDistance] = useState(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('distance');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const { location: autoLocation } = useUserLocation({ auto: true });

  // Load places on mount
  useEffect(() => {
    const loadPlaces = async () => {
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
        setError('שגיאה בטעינת המקומות');
      } finally {
        setLoading(false);
      }
    };

    loadPlaces();
  }, []);

  // Set user location if available
  useEffect(() => {
    if (autoLocation && !userLocation) {
      setUserLocation(autoLocation);
    }
  }, [autoLocation]);

  // Toggle favorite
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

  // Filter and sort places
  const filteredPlaces = places
    .filter(place => {
      if (selectedCategory !== 'all' && place.category !== selectedCategory) return false;
      if (searchQuery && !place.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (userLocation && maxDistance != null) {
        const distance = haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng);
        if (distance > maxDistance) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'distance' && userLocation) {
        const distA = haversineKm(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = haversineKm(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      }
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return a.name.localeCompare(b.name, 'he');
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-700">טוען מקומות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {error && (
        <div className="sticky top-16 bg-red-50 text-red-700 p-4 text-center z-40 flex items-center justify-between px-4">
          <button onClick={() => setError(null)} className="p-1">
            <X size={18} />
          </button>
          {error}
          <div className="w-6" />
        </div>
      )}

      {/* Search Bar */}
      <div className="px-4 max-w-6xl mx-auto py-3">
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפשו מקום לטייל"
              className="flex-1 outline-none text-right bg-transparent text-sm"
            />
          </div>
          <button
            onClick={() => setLocationPickerOpen(true)}
            className="p-3 bg-primary text-white rounded-full hover:bg-primary transition-all hover:scale-105 duration-300 flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg"
            title="בחר מיקום ומרחק"
          >
            <MapPin size={20} />
          </button>
        </div>
      </div>

      {/* Category Tabs - Horizontal Scroll */}
      <div className="bg-white border-b border-gray-100 z-20 overflow-x-auto">
        <div className="px-4 max-w-6xl mx-auto py-3 flex gap-2 justify-start">
          {CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all border backdrop-blur-sm ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-md border-primary/30'
                  : 'bg-sand/60 text-text-primary border-sand/40 hover:bg-sand/80 hover:border-sand/60 hover:shadow-sm'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              {cat.emoji} {cat.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="px-4 max-w-6xl mx-auto py-4 flex gap-2 items-center justify-end">
        <span className="text-sm font-medium text-gray-600">
          נמצאו {filteredPlaces.length} מקומות
        </span>

        <div className="flex gap-1">
          <button
            onClick={() => setSortBy('distance')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              sortBy === 'distance'
                ? 'bg-primary text-white'
                : 'bg-sand text-text-primary hover:bg-primary-light'
            }`}
          >
            קרובים
          </button>
          <button
            onClick={() => setSortBy('rating')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              sortBy === 'rating'
                ? 'bg-primary text-white'
                : 'bg-sand text-text-primary hover:bg-primary-light'
            }`}
          >
            דירוג
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              sortBy === 'name'
                ? 'bg-primary text-white'
                : 'bg-sand text-text-primary hover:bg-primary-light'
            }`}
          >
            שם
          </button>
        </div>
      </div>

      {/* Places Grid */}
      <div className="px-4 max-w-6xl mx-auto pb-8">
        {filteredPlaces.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">לא נמצאו מקומות בקטגוריה זו</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors"
            >
              חזור לכל המקומות
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlaces.map(place => {
              const distance = userLocation
                ? haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng)
                : null;
              return (
                <PlaceCard
                  key={place.id}
                  place={place}
                  distance={distance}
                  isFavorite={favorites.includes(place.id)}
                  onFavoriteToggle={() => handleFavoriteToggle(place.id)}
                  onClick={() => setSelectedPlace(place)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onLocationChange={(loc, dist) => {
          setUserLocation(loc);
          setMaxDistance(dist);
        }}
        currentLocation={userLocation}
        currentDistance={maxDistance}
      />

      {/* Place Details Sheet */}
      <PlaceDetailsSheet
        isOpen={!!selectedPlace}
        onClose={() => setSelectedPlace(null)}
        place={selectedPlace}
        userLocation={userLocation}
        isFavorite={selectedPlace ? favorites.includes(selectedPlace.id) : false}
        onFavoriteToggle={() => {
          if (selectedPlace) handleFavoriteToggle(selectedPlace.id);
        }}
      />
    </div>
  );
}
