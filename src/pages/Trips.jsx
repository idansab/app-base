import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Loader2, Trash2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PlaceCard from '@/components/PlaceCard';
import PlaceDetailsSheet from '@/components/places/PlaceDetailsSheet';
import { supabase } from '@/api/base44Client';

export default function Trips() {
  // State for places & favorites
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);

  // State for saved trips
  const [savedTrips, setSavedTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // State for building custom trip
  const [showBuilder, setShowBuilder] = useState(false);
  const [tripTitle, setTripTitle] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [tripPlaces, setTripPlaces] = useState([]); // ordered array of place IDs
  const [savingTrip, setSavingTrip] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        // Load places
        const { data: allPlaces, error: placesError } = await supabase
          .from('places')
          .select('*')
          .eq('status', 'approved');
        if (placesError) throw placesError;
        setPlaces(allPlaces || []);

        if (user) {
          // Load favorites
          const { data: favData } = await supabase
            .from('favorites')
            .select('place_id')
            .eq('user_id', user.id);
          setFavorites((favData || []).map(f => f.place_id));

          // Load saved trips
          const { data: tripsData, error: tripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (tripsError) throw tripsError;
          setSavedTrips(tripsData || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Trip Builder Functions
  const handleAddToTrip = (placeId) => {
    if (!tripPlaces.includes(placeId)) {
      setTripPlaces([...tripPlaces, placeId]);
    }
  };

  const handleRemoveFromTrip = (placeId) => {
    setTripPlaces(tripPlaces.filter(id => id !== placeId));
  };

  const handleReorderTrip = (fromIndex, toIndex) => {
    const newTrip = [...tripPlaces];
    const [moved] = newTrip.splice(fromIndex, 1);
    newTrip.splice(toIndex, 0, moved);
    setTripPlaces(newTrip);
  };

  const handleSaveTrip = async () => {
    if (!tripTitle.trim() || tripPlaces.length === 0) return;

    setSavingTrip(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          title: tripTitle,
          description: tripDescription,
          places_order: tripPlaces,
          duration_hours: Math.ceil(tripPlaces.length * 1.5), // rough estimate
        }])
        .select();

      if (error) throw error;
      if (data) {
        setSavedTrips([data[0], ...savedTrips]);
        setTripTitle('');
        setTripDescription('');
        setTripPlaces([]);
        setShowBuilder(false);
      }
    } catch (e) {
      console.error('Error saving trip:', e);
    } finally {
      setSavingTrip(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);
      if (error) throw error;
      setSavedTrips(savedTrips.filter(t => t.id !== tripId));
      if (selectedTrip?.id === tripId) setSelectedTrip(null);
    } catch (e) {
      console.error('Error deleting trip:', e);
    }
  };

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
    return places.filter(p => selectedTrip.places_order.includes(p.id));
  };

  const tripPlacesData = getTripPlaces();

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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-20 py-4">
        <div className="px-4 max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-right text-primary">מסלולים</h1>
          <button
            onClick={() => {
              setShowBuilder(!showBuilder);
              if (showBuilder) {
                setTripTitle('');
                setTripDescription('');
                setTripPlaces([]);
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            מסלול חדש
          </button>
        </div>
      </div>

      <div className="px-4 max-w-6xl mx-auto py-6 space-y-6">
        {/* Trip Builder */}
        <AnimatePresence>
          {showBuilder && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card rounded-2xl p-6 border-2 border-primary space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-right">בנה מסלול חדש</h2>
                <button onClick={() => setShowBuilder(false)} className="p-1 hover:bg-secondary rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  placeholder="שם המסלול"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <textarea
                  value={tripDescription}
                  onChange={(e) => setTripDescription(e.target.value)}
                  placeholder="תיאור המסלול (אופציונלי)"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                />
              </div>

              {/* Places to Add */}
              <div>
                <h3 className="font-semibold text-right mb-3">בחר מקומות</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 bg-secondary rounded-lg">
                  {places.map(place => (
                    <button
                      key={place.id}
                      onClick={() => handleAddToTrip(place.id)}
                      disabled={tripPlaces.includes(place.id)}
                      className={`text-right p-2 rounded-lg text-sm transition-all ${
                        tripPlaces.includes(place.id)
                          ? 'bg-primary text-white opacity-60 cursor-not-allowed'
                          : 'bg-background text-foreground hover:bg-primary/20'
                      }`}
                    >
                      {place.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trip Preview */}
              {tripPlaces.length > 0 && (
                <div className="bg-secondary rounded-lg p-3">
                  <h4 className="font-semibold text-right mb-2">מקומות ({tripPlaces.length})</h4>
                  <div className="space-y-2">
                    {tripPlaces.map((placeId, idx) => {
                      const place = places.find(p => p.id === placeId);
                      return (
                        <div key={placeId} className="flex items-center justify-between bg-background p-2 rounded-lg text-sm">
                          <button
                            onClick={() => handleRemoveFromTrip(placeId)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                          >
                            <X size={16} />
                          </button>
                          <span className="text-right flex-1">{place?.name}</span>
                          <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">{idx + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSaveTrip}
                disabled={savingTrip || !tripTitle.trim() || tripPlaces.length === 0}
                className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {savingTrip ? 'שומר...' : 'שמור מסלול'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Trips List */}
        <div>
          <h2 className="text-xl font-bold text-right mb-4">המסלולים שלי</h2>
          {savedTrips.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border-2 border-border">
              <p className="text-muted-foreground mb-4">אין עדיין מסלולים שמורים</p>
              <p className="text-sm text-muted-foreground">בנה מסלול חדש כדי להתחיל</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedTrips.map(trip => (
                <motion.button
                  key={trip.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
                  className={`text-right p-4 rounded-2xl border-2 transition-all ${
                    selectedTrip?.id === trip.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrip(trip.id);
                      }}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="text-right flex-1">
                      <h3 className="font-bold text-lg">{trip.title}</h3>
                      {trip.description && <p className="text-sm text-muted-foreground">{trip.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {trip.duration_hours} שעות
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {trip.places_order.length} מקומות
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Trip Details */}
        {selectedTrip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Trip Route Visualization */}
            {tripPlacesData.length > 0 && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-bold text-lg mb-4 text-right">מסלול המסע</h3>
                <div className="bg-secondary rounded-xl p-4">
                  <svg
                    viewBox="0 0 400 300"
                    className="w-full h-auto"
                    style={{ direction: 'ltr' }}
                  >
                    {/* Draw connecting line */}
                    {tripPlacesData.length > 1 && (
                      <polyline
                        points={tripPlacesData
                          .map((_, i) => {
                            const x = 50 + (i * 350) / (tripPlacesData.length - 1);
                            const y = 150;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                        stroke="var(--color-primary)"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Draw stops */}
                    {tripPlacesData.map((_, i) => {
                      const x = 50 + (i * 350) / (Math.max(tripPlacesData.length - 1, 1));
                      const y = 150;
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="25" fill="var(--color-primary)" />
                          <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dy="0.3em"
                            className="text-white font-bold"
                            fill="white"
                            fontSize="16"
                          >
                            {i + 1}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}

            {/* Places in Trip with Reorder */}
            <div>
              <h3 className="font-bold text-lg mb-4 text-right">מקומות במסלול</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tripPlacesData.map((place, index) => (
                  <div key={place.id} className="relative">
                    <div className="absolute top-3 right-3 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                      {index + 1}
                    </div>
                    <PlaceCard
                      place={place}
                      distance={null}
                      isFavorite={favorites.includes(place.id)}
                      onFavoriteToggle={() => handleFavoriteToggle(place.id)}
                      onClick={() => setSelectedPlace(place)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Place Details Modal */}
      <PlaceDetailsSheet
        isOpen={!!selectedPlace}
        onClose={() => setSelectedPlace(null)}
        place={selectedPlace}
        userLocation={null}
        isFavorite={selectedPlace ? favorites.includes(selectedPlace.id) : false}
        onFavoriteToggle={() => {
          if (selectedPlace) handleFavoriteToggle(selectedPlace.id);
        }}
      />
    </div>
  );
}
