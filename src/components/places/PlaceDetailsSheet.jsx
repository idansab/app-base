import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Phone, Clock, Star, Heart, Share2, Navigation } from 'lucide-react';
import { haversineKm, formatDistance } from '@/lib/geo';
import ImageCarousel from '@/components/ImageCarousel';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function PlaceDetailsSheet({ isOpen, onClose, place, userLocation, isFavorite, onFavoriteToggle }) {
  const [tips, setTips] = useState([]);
  const [newTipText, setNewTipText] = useState('');
  const [submittingTip, setSubmittingTip] = useState(false);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const distance = userLocation && place
    ? haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng)
    : null;

  const handleAddTip = async () => {
    if (!newTipText.trim() || !place) return;
    setSubmittingTip(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('tips')
        .insert([{
          place_id: place.id,
          content: newTipText,
          created_by_id: user?.id
        }])
        .select();
      if (error) throw error;
      if (data) {
        setTips([...tips, data[0]]);
        setNewTipText('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingTip(false);
    }
  };

  if (!isOpen || !place) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Glassmorphic Modal */}
      <motion.div
        className="fixed top-1/2 left-1/2 z-50 max-w-2xl w-[calc(100%-32px)] max-h-[85vh] overflow-y-auto bg-white/90 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ x: '-50%', y: '-50%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <h2 className="font-bold text-lg text-right flex-1">{place.name}</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Hero Image Carousel */}
          {place.image_url && (
            <ImageCarousel
              images={Array.isArray(place.image_url) ? place.image_url : [place.image_url]}
              title={place.name}
            />
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            {place.rating && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-2xl text-right"
              >
                <p className="text-xs text-gray-600 mb-1">דירוג</p>
                <p className="text-2xl font-bold text-yellow-600">⭐ {place.rating.toFixed(1)}</p>
              </motion.div>
            )}

            {distance != null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl text-right"
              >
                <p className="text-xs text-gray-600 mb-1">מרחק</p>
                <p className="text-2xl font-bold text-green-600">{formatDistance(distance)}</p>
              </motion.div>
            )}
          </div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {place.opening_hours && (
              <div className="flex items-start gap-3 text-right">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{place.opening_hours}</p>
                  <p className="text-xs text-gray-600">שעות פתיחה</p>
                </div>
                <Clock size={20} className="text-green-600 flex-shrink-0" />
              </div>
            )}

            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="flex items-start gap-3 text-right hover:bg-gray-50 p-3 rounded-lg transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-green-600 hover:underline">{place.phone}</p>
                  <p className="text-xs text-gray-600">טלפון</p>
                </div>
                <Phone size={20} className="text-green-600 flex-shrink-0" />
              </a>
            )}

            {place.address && (
              <div className="flex items-start gap-3 text-right">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{place.address}</p>
                  <p className="text-xs text-gray-600">כתובת</p>
                </div>
                <MapPin size={20} className="text-green-600 flex-shrink-0" />
              </div>
            )}
          </motion.div>

          {/* Description */}
          {place.description && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="p-4 bg-slate-50 rounded-2xl text-right"
            >
              <p className="text-sm leading-relaxed text-gray-700">{place.description}</p>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3"
          >
            <button
              onClick={onFavoriteToggle}
              className={`flex-1 p-3 rounded-2xl font-medium transition-all ${
                isFavorite
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
              }`}
            >
              <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
            </button>

            {place.lat && place.lng && (
              <a
                href={`https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 p-3 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Navigation size={18} />
                ניווט
              </a>
            )}

            <button
              onClick={() => navigator.share?.({ title: place.name, text: place.description })}
              className="flex-1 p-3 bg-slate-100 text-gray-700 rounded-2xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
            </button>
          </motion.div>

          {/* Community Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="border-t border-gray-200 pt-6"
          >
            <h3 className="font-bold text-lg text-right mb-4">טיפים מהקהילה</h3>

            {/* Add Tip Form */}
            <div className="mb-6 p-4 bg-green-50 rounded-2xl">
              <textarea
                value={newTipText}
                onChange={(e) => setNewTipText(e.target.value)}
                placeholder="שתף טיפ עם הקהילה..."
                className="w-full p-3 border border-green-200 rounded-lg text-right resize-none focus:outline-none focus:ring-2 focus:ring-green-600 mb-3"
                rows={3}
              />
              <button
                onClick={handleAddTip}
                disabled={submittingTip || !newTipText.trim()}
                className="w-full p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
              >
                {submittingTip ? 'שולח...' : 'שיתף טיפ'}
              </button>
            </div>

            {/* Tips List */}
            {tips.length > 0 ? (
              <div className="space-y-3">
                {tips.map((tip) => (
                  <motion.div
                    key={tip.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-50 rounded-lg border-r-4 border-green-600 text-right"
                  >
                    <p className="text-sm text-gray-700">{tip.content}</p>
                    <p className="text-xs text-gray-500 mt-2">עכשיו</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 text-sm py-4">עדיין אין טיפים. הוסף אחד!</p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
