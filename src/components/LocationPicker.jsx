import React, { useEffect, useState } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import useUserLocation from '@/hooks/useUserLocation';
import { geocodeAddress } from '@/lib/geo';

const ISRAELI_CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'רמת גן', 'אשדוד', 'פתח תקווה',
  'ראשון לציון', 'הרצליה', 'רמלה', 'לוד', 'אשקלון', 'עפולה', 'צפת',
  'קריאת שמונה', 'בית שאן', 'קריאת מלאכי', 'קריאת אונו', 'הוד השרון',
  'קרית ים', 'קרית מוצקין', 'בנימינה', 'יהוד', 'שהם', 'מודיעין', 'חולון',
  'ב״ש', 'בת ים', 'כפר סבא', 'נתניה', 'הרצליה', 'קיסריה', 'עכו'
];

export default function LocationPicker({ isOpen, onClose, onLocationChange, currentLocation, currentDistance }) {
  const { location, status, request } = useUserLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [distance, setDistance] = useState(currentDistance || 20);
  const [selectedLocation, setSelectedLocation] = useState(currentLocation || null);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [isCurrentLocation, setIsCurrentLocation] = useState(false);
  const [isLoadingGeocode, setIsLoadingGeocode] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (location) {
      setSelectedLocation(location);
      setIsCurrentLocation(true);
      setSelectedLocationName('המיקום הנוכחי שלי');
    }
  }, [location]);

  const handleSearchQuery = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = ISRAELI_CITIES.filter(city =>
        city.includes(query) || query.includes(city.charAt(0))
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (city) => {
    setIsLoadingGeocode(true);
    setSearchError('');
    try {
      const result = await geocodeAddress(city);
      if (result) {
        setSelectedLocation({ lat: result.lat, lng: result.lng });
        setSelectedLocationName(city);
        setIsCurrentLocation(false);
        setSearchQuery('');
        setShowSuggestions(false);
      } else {
        setSearchError('כתובת לא נמצאה');
      }
    } catch (e) {
      setSearchError('שגיאה בחיפוש הכתובת');
    } finally {
      setIsLoadingGeocode(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    const coords = await request();
    if (coords) {
      setSelectedLocation(coords);
      setIsCurrentLocation(true);
      setSelectedLocationName('המיקום הנוכחי שלי');
      setSearchQuery('');
      setSearchError('');
      setShowSuggestions(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('הזן כתובת או עיר');
      return;
    }
    await handleSelectSuggestion(searchQuery);
  };

  const handleApply = () => {
    if (!selectedLocation) return;
    onLocationChange(selectedLocation, distance);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Centered Glassmorphic Modal */}
      <motion.div
        className="fixed top-1/2 left-1/2 z-50 max-w-2xl w-[calc(100%-32px)] max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-2xl p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ x: '-50%', y: '-50%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-right flex-1">בחר מיקום ומרחק</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        {/* Current Location Button */}
        <button
          onClick={handleUseCurrentLocation}
          disabled={status === 'locating'}
          className="w-full mb-6 p-4 border-2 border-primary text-primary rounded-2xl font-medium hover:bg-primary-light transition-all hover:scale-102 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === 'locating' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              מחפש את המיקום שלך...
            </>
          ) : (
            <>
              <MapPin size={18} />
              המיקום הנוכחי שלי
            </>
          )}
        </button>

        {/* Manual Address Search */}
        <div className="mb-8 relative">
          <label className="block text-sm font-medium text-foreground mb-3">או חפש כתובת/עיר</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  handleSearchQuery(e.target.value);
                  setSearchError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => searchQuery && setShowSuggestions(true)}
                placeholder="כגון: תל אביב, עפולה, באר שבע"
                className="w-full px-4 py-3 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />

              {/* Search Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto"
                  >
                    {suggestions.map((city, idx) => (
                      <motion.button
                        key={city}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => handleSelectSuggestion(city)}
                        className="w-full px-4 py-3 text-right hover:bg-green-50 transition-colors border-b border-border last:border-b-0 text-sm text-foreground dark:hover:bg-green-950/40"
                      >
                        {city}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoadingGeocode || !searchQuery.trim()}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-medium hover:bg-primary transition-all hover:scale-105 hover:shadow-md disabled:opacity-50 flex-shrink-0 shadow-sm"
            >
              {isLoadingGeocode ? <Loader2 size={18} className="animate-spin" /> : 'חפש'}
            </button>
          </div>
          {searchError && <p className="text-red-600 text-sm mt-2">{searchError}</p>}
        </div>


        {/* Selected Location Display */}
        {selectedLocation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-blue-50 rounded-2xl text-right border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800"
          >
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              ✓ {selectedLocationName}
              {isCurrentLocation && ' (מיקום נוכחי)'}
            </p>
          </motion.div>
        )}

        {/* Distance Slider */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">מרחק חיפוש</span>
            <span className="text-xl font-bold text-green-600">{distance} ק״מ</span>
          </div>

          <input
            type="range"
            min="1"
            max="100"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-green-600"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-border text-text-primary rounded-2xl font-medium hover:bg-sand transition-all hover:scale-102"
          >
            ביטול
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedLocation}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-2xl font-medium hover:bg-primary transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 shadow-md"
          >
            החל
          </button>
        </div>
      </motion.div>
    </>
  );
}
