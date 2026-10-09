import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import LocationPicker from '@/components/LocationPicker';
import PlaceCard from '@/components/PlaceCard';
import PlaceDetailsSheet from '@/components/places/PlaceDetailsSheet';
import { haversineKm } from '@/lib/geo';
import useUserLocation from '@/hooks/useUserLocation';
import { useAuth } from '@/lib/AuthContext';
import { base44, supabase } from '@/api/base44Client';

const CATEGORIES = [
  { id: 'all', label: 'הכל', emoji: '🌍' },
  { id: 'food', label: 'עגלות קפה ואוכל', emoji: '☕' },
  { id: 'nature', label: 'טבע וטיולים', emoji: '🏞️' },
  { id: 'nightlife', label: 'חיי לילה', emoji: '🌙' },
  { id: 'shopping', label: 'קניות ושווקים', emoji: '🛍️' },
  { id: 'culture', label: 'תרבות', emoji: '🎨' },
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [places, setPlaces] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [userLocation, setUserLocation] = useState(null);
  const [maxDistance, setMaxDistance] = useState(searchParams.get('distance') ? parseInt(searchParams.get('distance')) : null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'distance');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const { location: autoLocation } = useUserLocation({ auto: true });

  // Load places on mount
  useEffect(() => {
    const loadPlaces = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .eq('status', 'approved');
        if (error) throw error;
        setPlaces(data || []);

        // Load favorites
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: favData, error: favError } = await supabase
            .from('favorites')
            .select('place_id')
            .eq('user_id', user.id);
          if (!favError && favData) {
            setFavorites(favData.map(f => f.place_id));
          }
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

  // Sync state with URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (maxDistance) params.set('distance', maxDistance.toString());
    if (sortBy !== 'distance') params.set('sort', sortBy);

    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, maxDistance, sortBy, setSearchParams]);

  // Keyboard navigation for categories
  useEffect(() => {
    const handleKeyDown = (e) => {
      const currentIndex = CATEGORIES.findIndex(c => c.id === selectedCategory);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % CATEGORIES.length;
        setSelectedCategory(CATEGORIES[nextIndex].id);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + CATEGORIES.length) % CATEGORIES.length;
        setSelectedCategory(CATEGORIES[prevIndex].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCategory]);

  // Toggle favorite
  const handleFavoriteToggle = async (placeId) => {
    const isFavorited = favorites.includes(placeId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('יש להתחבר כדי לשמור מועדפים');
        return;
      }
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', placeId);
        if (error) throw error;
        setFavorites(prev => prev.filter(id => id !== placeId));
        console.log('✅ הסרת מהמועדפים');
      } else {
        // Check if already exists to avoid 409 conflict
        const { data: existing } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('place_id', placeId)
          .single();

        if (existing) {
          // Already favorited, just update state
          setFavorites(prev => [...new Set([...prev, placeId])]);
          console.log('✅ כבר במועדפים');
          return;
        }

        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: user.id, place_id: placeId }]);

        // Handle 409 conflict gracefully
        if (error && error.code !== '409') {
          throw error;
        }

        setFavorites(prev => [...new Set([...prev, placeId])]);
        console.log('✅ נוסף למועדפים');
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
      setError('שגיאה בשמירת המועדף');
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-foreground">טוען מקומות...</p>
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

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-b from-green-50 dark:from-slate-900 to-background py-12 md:py-16"
      >
        <div className="px-4 max-w-6xl mx-auto text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            מה יש פה?
          </h1>
          <p className="text-lg text-muted-foreground">
            גלה מקומות באזור — עם טיפים מהקהילה
          </p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 max-w-6xl mx-auto -mt-8 relative z-10"
      >
        <div className="flex gap-3 items-center">
          <div className="flex-1 flex items-center gap-3 px-6 py-4 bg-card border border-border rounded-3xl shadow-lg hover:shadow-xl transition-shadow focus-within:ring-0 focus-within:border-border">
            <Search size={20} className="text-primary flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="מה בא לך לעשות?"
              className="home-search-input flex-1 outline-none focus:outline-none focus-visible:ring-0 text-right bg-transparent text-foreground placeholder:text-muted-foreground font-medium"
            />
          </div>
          <button
            onClick={() => setLocationPickerOpen(true)}
            className="p-4 bg-card text-primary border border-border rounded-3xl hover:bg-secondary transition-all hover:scale-110 duration-300 flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg"
            aria-label="בחר מיקום ומרחק"
            title="בחר מיקום ומרחק"
          >
            <MapPin size={24} />
          </button>
        </div>
      </motion.div>

      {/* Category Tabs - Horizontal Scroll */}
      <div className="z-20 overflow-x-auto">
        <div className="px-4 max-w-6xl mx-auto py-3 flex gap-2 justify-start">
          {CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() => setSelectedCategory(cat.id)}
              aria-current={selectedCategory === cat.id ? 'page' : undefined}
              aria-label={`${cat.label} - ${cat.emoji}`}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all border-2 backdrop-blur-2xl ring-1 ring-white/40 ${
                selectedCategory === cat.id
                  ? 'bg-primary/85 text-white shadow-lg border-white/70 backdrop-blur-2xl ring-white/60'
                  : 'bg-white/12 text-foreground border-white/60 hover:bg-white/20 hover:border-white/80 hover:shadow-lg hover:ring-white/60'
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
        <span className="text-sm font-medium text-muted-foreground">
          נמצאו {filteredPlaces.length} מקומות
        </span>

        <div className="flex gap-1">
          <button
            onClick={() => setSortBy('distance')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              sortBy === 'distance'
                ? 'bg-primary text-white'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            קרובים
          </button>
          <button
            onClick={() => setSortBy('rating')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              sortBy === 'rating'
                ? 'bg-primary text-white'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            דירוג
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              sortBy === 'name'
                ? 'bg-primary text-white'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
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
            <p className="text-muted-foreground mb-4">לא נמצאו מקומות בקטגוריה זו</p>
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
