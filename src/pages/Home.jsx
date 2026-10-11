import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import LocationPicker from '@/components/LocationPicker';
import PlaceCard from '@/components/PlaceCard';
import VirtualPlaceGrid from '@/components/places/VirtualPlaceGrid';
import PlaceDetailsSheet from '@/components/places/PlaceDetailsSheet';
import { haversineKm } from '@/lib/geo';
import { isOpenNow } from '@/lib/openingHours';
import useUserLocation from '@/hooks/useUserLocation';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/base44Client';
import { normalizeCategory } from '@/lib/categories';

const CATEGORIES = [
  { id: 'all', label: 'הכל', emoji: '🌍' },
  { id: 'food', label: 'עגלות קפה ואוכל', emoji: '☕' },
  { id: 'nature', label: 'טבע וטיולים', emoji: '🏞️' },
  { id: 'nightlife', label: 'חיי לילה', emoji: '🌙' },
  { id: 'shopping', label: 'קניות ושווקים', emoji: '🛍️' },
  { id: 'culture', label: 'תרבות', emoji: '🎨' },
  { id: 'attractions', label: 'אטרקציות', emoji: '🎢' },
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
  const [openNowOnly, setOpenNowOnly] = useState(searchParams.get('open') === '1');
  const [kosherOnly, setKosherOnly] = useState(searchParams.get('kosher') === '1');
  // "Now" is re-read every minute so open/closed badges and the filter never go stale
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const { location: autoLocation } = useUserLocation({ auto: true });

  // Load places on mount
  useEffect(() => {
    const loadPlaces = async () => {
      try {
        setLoading(true);
        // The API caps one response at 1000 rows: page through until everything is loaded
        const PAGE = 1000;
        const all = [];
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase
            .from('places')
            .select('*')
            .eq('status', 'approved')
            .order('id')
            .range(from, from + PAGE - 1);
          if (error) throw error;
          all.push(...(data || []));
          if (!data || data.length < PAGE) break;
        }
        setPlaces(all);

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

  // Set user location and default distance if available
  useEffect(() => {
    if (autoLocation && !userLocation) {
      setUserLocation(autoLocation);
      // Set default 50km distance on first location detection
      if (!maxDistance) {
        setMaxDistance(50);
      }
    }
  }, [autoLocation, userLocation, maxDistance]);

  // Sync state with URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (maxDistance) params.set('distance', maxDistance.toString());
    if (sortBy !== 'distance') params.set('sort', sortBy);
    if (openNowOnly) params.set('open', '1');
    if (kosherOnly) params.set('kosher', '1');

    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, maxDistance, sortBy, openNowOnly, kosherOnly, setSearchParams]);

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
  const baseFiltered = places
    .filter(place => {
      if (selectedCategory !== 'all' && normalizeCategory(place.category) !== selectedCategory) return false;
      if (searchQuery && !place.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (userLocation && maxDistance != null) {
        const distance = haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng);
        if (distance > maxDistance) return false;
      }
      return true;
    });

  // counts for the quick-filter chips reflect the other active filters
  const openCount = baseFiltered.filter(p => isOpenNow(p, now) === true).length;
  const kosherCount = baseFiltered.filter(p => p.kosher === 'kosher').length;
  const unknownHoursCount = baseFiltered.filter(p => isOpenNow(p, now) === null).length;

  const filteredPlaces = baseFiltered
    .filter(p => !openNowOnly || isOpenNow(p, now) === true)
    .filter(p => !kosherOnly || p.kosher === 'kosher')
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
        <div className="sticky top-16 bg-red-50 text-red-700 p-4 text-center z-40 flex items-center justify-between px-4 dark:bg-red-950/40 dark:text-red-300">
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

      {/* Quick filters */}
      <div className="px-4 max-w-6xl mx-auto pt-1 flex flex-wrap gap-2 items-center" role="group" aria-label="סינון מהיר">
        {[
          { key: 'open', label: 'פתוח עכשיו', active: openNowOnly, toggle: () => setOpenNowOnly(v => !v), count: openCount },
          { key: 'kosher', label: 'כשר', active: kosherOnly, toggle: () => setKosherOnly(v => !v), count: kosherCount },
        ]
          // a filter that can only ever return nothing is just noise
          .filter(chip => chip.key !== 'kosher' || chip.active || places.some(p => p.kosher === 'kosher'))
          .map(chip => (
          <button
            key={chip.key}
            onClick={chip.toggle}
            aria-pressed={chip.active}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              chip.active
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-card text-foreground border-border hover:bg-secondary'
            }`}
          >
            {chip.label} <span className="tabular-nums opacity-70">({chip.count})</span>
          </button>
        ))}
        {openNowOnly && unknownHoursCount > 0 && (
          <span className="text-xs text-muted-foreground">
            לא כולל {unknownHoursCount} מקומות ללא שעות פתיחה מוגדרות
          </span>
        )}
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
            <p className="text-muted-foreground mb-4">לא נמצאו מקומות שמתאימים לסינון</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setOpenNowOnly(false);
                setKosherOnly(false);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors"
            >
              חזור לכל המקומות
            </button>
          </div>
        ) : (
          <VirtualPlaceGrid
            items={filteredPlaces}
            getKey={(place) => place.id}
            renderItem={(place) => {
              const distance = userLocation
                ? haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng)
                : null;
              return (
                <PlaceCard
                  place={place}
                  distance={distance}
                  isFavorite={favorites.includes(place.id)}
                  onFavoriteToggle={() => handleFavoriteToggle(place.id)}
                  onClick={() => setSelectedPlace(place)}
                />
              );
            }}
          />
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
