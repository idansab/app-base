import React, { useEffect, useState } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import useUserLocation from '@/hooks/useUserLocation';
import { geocodeAddress, formatDistance } from '@/lib/geo';

export default function LocationPicker({ isOpen, onClose, onLocationChange, currentLocation, currentDistance }) {
  const { location, status, request } = useUserLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [distance, setDistance] = useState(currentDistance || 20);
  const [selectedLocation, setSelectedLocation] = useState(currentLocation || null);
  const [isLoadingGeocode, setIsLoadingGeocode] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showUnlimited, setShowUnlimited] = useState(currentDistance === null);

  useEffect(() => {
    if (location) setSelectedLocation(location);
  }, [location]);

  const handleUseCurrentLocation = async () => {
    const coords = await request();
    if (coords) {
      setSelectedLocation(coords);
      setSearchQuery('');
      setSearchError('');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('הזן כתובת או עיר');
      return;
    }
    setIsLoadingGeocode(true);
    setSearchError('');
    try {
      const result = await geocodeAddress(searchQuery);
      if (result) {
        setSelectedLocation({ lat: result.lat, lng: result.lng });
        setSearchQuery('');
      } else {
        setSearchError('כתובת לא נמצאה');
      }
    } catch (e) {
      setSearchError('שגיאה בחיפוש הכתובת');
    } finally {
      setIsLoadingGeocode(false);
    }
  };

  const handleApply = () => {
    if (!selectedLocation) return;
    onLocationChange(selectedLocation, showUnlimited ? null : distance);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full bg-white rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl"
        initial={{ y: 400, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 400, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-right flex-1">בחר מיקום ומרחק</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        {/* Current Location Button */}
        <button
          onClick={handleUseCurrentLocation}
          disabled={status === 'locating'}
          className="w-full mb-6 p-4 border-2 border-green-600 text-green-600 rounded-2xl font-medium hover:bg-green-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">או חפש כתובת/עיר</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="כגון: תל אביב, הרצל 10, באר שבע"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <button
              onClick={handleSearch}
              disabled={isLoadingGeocode}
              className="px-6 py-3 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {isLoadingGeocode ? <Loader2 size={18} className="animate-spin" /> : 'חפש'}
            </button>
          </div>
          {searchError && <p className="text-red-600 text-sm mt-2">{searchError}</p>}
        </div>

        {/* Selected Location */}
        {selectedLocation && (
          <div className="mb-6 p-4 bg-green-50 rounded-2xl text-right">
            <p className="text-sm font-medium text-green-900">
              ✓ מיקום נבחר: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </p>
          </div>
        )}

        {/* Distance Slider */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">מרחק חיפוש</span>
            {!showUnlimited && <span className="text-xl font-bold text-green-600">{distance} ק״מ</span>}
          </div>

          {!showUnlimited && (
            <input
              type="range"
              min="1"
              max="100"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
            />
          )}

          {/* Unlimited Toggle */}
          <button
            onClick={() => setShowUnlimited(!showUnlimited)}
            className={`w-full mt-4 p-3 rounded-2xl font-medium transition-colors ${
              showUnlimited
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
            }`}
          >
            {showUnlimited ? '✓ ללא הגבלת מרחק' : 'ללא הגבלת מרחק'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedLocation}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            החל
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
