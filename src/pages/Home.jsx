import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import PlaceCard from '@/components/PlaceCard';
import { haversineKm } from '@/lib/geo';
import useUserLocation from '@/hooks/useUserLocation';

const CATEGORIES = [
  { id: 'all', label: 'הכל', emoji: '🌍' },
  { id: 'nature', label: 'טבע', emoji: '🏞️' },
  { id: 'culture', label: 'תרבות', emoji: '🎭' },
  { id: 'food', label: 'אוכל', emoji: '🍽️' },
  { id: 'shopping', label: 'קניות', emoji: '🛍️' },
  { id: 'entertainment', label: 'בילוי', emoji: '🎪' },
];

const API_BASE = 'http://localhost:3001/api';

export default function Home() {
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
    <div className="min-h-screen bg-slate-50 pb-20">
      {error && (
        <div className="sticky top-0 bg-red-50 text-red-700 p-4 text-center z-40">
          {error}
        </div>
      )}

      {/* Header with Location Button */}
      <div className="sticky top-0 bg-white shadow-sm z-30 pt-4 pb-3">
        <div className="px-4 max-w-6xl mx-auto">
          {/* Logo */}
          <h1 className="text-right font-bold text-xl mb-4 text-green-600">מה יש פה?</h1>

          {/* Location Button */}
          <button
            onClick={() => setLocationPickerOpen(true)}
            className="w-full flex items-center justify-between gap-3 p-3 bg-green-50 border-2 border-green-200 rounded-2xl hover:bg-green-100 transition-colors"
          >
            <div className="text-right flex-1">
              <p className="text-xs text-gray-600">המיקום שלך</p>
              <p className="font-semibold text-green-700">
                {userLocation ? (
                  `${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)}`
                ) : (
                  'לא נבחר מיקום'
                )}
              </p>
              {maxDistance && (
                <p className="text-xs text-green-600 mt-1">מרחק: עד {maxDistance} ק״מ</p>
              )}
            </div>
            <div className="p-3 bg-white rounded-full">
              <MapPin size={20} className="text-green-600" />
            </div>
          </button>

          {/* Search Bar */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש מקום..."
                className="flex-1 outline-none text-right bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-[140px] bg-white border-b border-gray-200 z-20 overflow-x-auto">
        <div className="px-4 max-w-6xl mx-auto py-2 flex gap-2 justify-end">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="px-4 max-w-6xl mx-auto py-4 flex gap-2 justify-end">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="distance">מרחק</option>
          <option value="rating">דירוג</option>
          <option value="name">שם</option>
        </select>
        <span className="text-sm text-gray-600 self-center">
          {filteredPlaces.length} מקומות
        </span>
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
                  onClick={() => {
                    // TODO: Navigate to place details modal
                  }}
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
    </div>
  );
}
