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
        className="fixed top-1/2 left-1/2 z-50 max-w-2xl w-[calc(100%-32px)] max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-2xl p-8"
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
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
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
              className="px-6 py-3 bg-primary text-white rounded-2xl font-medium hover:bg-primary transition-all hover:scale-105 hover:shadow-md disabled:opacity-50 flex-shrink-0 shadow-sm"
            >
              {isLoadingGeocode ? <Loader2 size={18} className="animate-spin" /> : 'חפש'}
            </button>
          </div>
          {searchError && <p className="text-red-600 text-sm mt-2">{searchError}</p>}
        </div>


        {/* Selected Location Display */}
        {selectedLocation && (
          <div className="mb-6 p-4 bg-blue-50 rounded-2xl text-right border border-blue-200">
            <p className="text-sm font-medium text-blue-900">
              ✓ מיקום נבחר
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
            className={`w-full mt-4 p-3 rounded-2xl font-medium transition-all ${
              showUnlimited
                ? 'bg-primary text-white hover:shadow-md'
                : 'bg-sand text-text-primary hover:bg-primary-light hover:shadow-sm'
            }`}
          >
            {showUnlimited ? '✓ ללא הגבלת מרחק' : 'ללא הגבלת מרחק'}
          </button>
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
