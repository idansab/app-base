import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Phone, Clock, Star, Heart, Navigation, Share2, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { haversineKm, formatDistance } from '@/lib/geo';
import useUserLocation from '@/hooks/useUserLocation';

const API_BASE = 'http://localhost:3001/api';

export default function PlaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { location: userLocation } = useUserLocation({ auto: true });

  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tips, setTips] = useState([]);
  const [newTipText, setNewTipText] = useState('');
  const [submittingTip, setSubmittingTip] = useState(false);

  useEffect(() => {
    const loadPlace = async () => {
      try {
        const res = await fetch(`${API_BASE}/places/${id}`);
        if (!res.ok) throw new Error('Failed to load place');
        const data = await res.json();
        setPlace(data);

        // Check if favorite
        const favRes = await fetch(`${API_BASE}/favorites`);
        if (favRes.ok) {
          const favData = await favRes.json();
          setIsFavorite(favData.some(f => f.place_id === data.id));
        }
      } catch (e) {
        console.error(e);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadPlace();
  }, [id, navigate]);

  const handleFavoriteToggle = async () => {
    if (!place) return;
    try {
      if (isFavorite) {
        await fetch(`${API_BASE}/favorites/${place.id}`, { method: 'DELETE' });
        setIsFavorite(false);
      } else {
        await fetch(`${API_BASE}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place_id: place.id }),
        });
        setIsFavorite(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTip = async () => {
    if (!newTipText.trim() || !place) return;
    setSubmittingTip(true);
    try {
      const res = await fetch(`${API_BASE}/tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: place.id, content: newTipText }),
      });
      if (res.ok) {
        setTips([...tips, { id: Date.now(), content: newTipText, created_at: new Date() }]);
        setNewTipText('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingTip(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-green-600" />
      </div>
    );
  }

  if (!place) return null;

  const distance = userLocation
    ? haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng)
    : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Image */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-96 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden"
      >
        {place.image_url && (
          <img
            src={place.image_url}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Close Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Place Info Overlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-0 inset-x-0 p-6 text-white text-right"
        >
          <h1 className="text-4xl font-bold mb-2">{place.name}</h1>
          <div className="flex items-center gap-4 justify-end">
            {place.rating && (
              <div className="flex items-center gap-1">
                <span className="font-semibold">{place.rating.toFixed(1)}</span>
                <Star size={20} className="fill-yellow-400 text-yellow-400" />
              </div>
            )}
            {distance != null && (
              <div className="text-sm">{formatDistance(distance)}</div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Content */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          {place.opening_hours && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 text-right">
              <p className="text-xs text-gray-600 mb-1">שעות פתיחה</p>
              <p className="font-semibold text-gray-900">{place.opening_hours}</p>
            </div>
          )}

          {place.phone && (
            <a
              href={`tel:${place.phone}`}
              className="p-4 bg-green-50 rounded-2xl border border-green-200 text-right hover:bg-green-100 transition-colors"
            >
              <p className="text-xs text-gray-600 mb-1">טלפון</p>
              <p className="font-semibold text-green-600">{place.phone}</p>
            </a>
          )}
        </motion.div>

        {/* Navigation & Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3 mb-8"
        >
          {place.lat && place.lng && (
            <a
              href={`https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 p-4 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Navigation size={20} />
              ניווט ב-Waze
            </a>
          )}

          <button
            onClick={handleFavoriteToggle}
            className={`flex-1 p-4 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2 ${
              isFavorite
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
            }`}
          >
            <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
            {isFavorite ? 'שמור' : 'שמור'}
          </button>

          <button
            onClick={() => navigator.share?.({ title: place.name, text: place.description })}
            className="flex-1 p-4 bg-slate-100 text-gray-700 rounded-2xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={20} />
          </button>
        </motion.div>

        {/* Description */}
        {place.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-8 p-6 bg-slate-50 rounded-2xl border border-gray-200 text-right"
          >
            <p className="text-gray-700 leading-relaxed">{place.description}</p>
          </motion.div>
        )}

        {/* Community Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border-t border-gray-200 pt-8"
        >
          <h2 className="text-2xl font-bold text-right mb-6">טיפים מהקהילה</h2>

          {/* Add Tip */}
          <div className="mb-8 p-6 bg-green-50 rounded-2xl border border-green-200">
            <textarea
              value={newTipText}
              onChange={(e) => setNewTipText(e.target.value)}
              placeholder="שתף טיפ עם הקהילה..."
              className="w-full p-4 border border-green-200 rounded-lg text-right resize-none focus:outline-none focus:ring-2 focus:ring-green-600 mb-4"
              rows={4}
            />
            <button
              onClick={handleAddTip}
              disabled={submittingTip || !newTipText.trim()}
              className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
            >
              {submittingTip ? 'שולח...' : 'שיתף טיפ'}
            </button>
          </div>

          {/* Tips List */}
          {tips.length > 0 ? (
            <div className="space-y-4">
              {tips.map((tip) => (
                <motion.div
                  key={tip.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-slate-50 rounded-lg border-r-4 border-green-600 text-right"
                >
                  <p className="text-gray-700 mb-2">{tip.content}</p>
                  <p className="text-xs text-gray-500">עכשיו</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">עדיין אין טיפים. הוסף אחד!</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
