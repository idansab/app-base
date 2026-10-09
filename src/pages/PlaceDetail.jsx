import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Star, Heart, Navigation, Share2, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { haversineKm, formatDistance } from '@/lib/geo';
import useUserLocation from '@/hooks/useUserLocation';
import { supabase } from '@/api/base44Client';

const SkeletonLine = ({ width = 'w-full', height = 'h-3' }) => (
  <motion.div
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    className={`bg-slate-200 rounded-lg ${width} ${height}`}
  />
);

const DirectionalButton = ({ children, ...props }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.button
      {...props}
      onMouseMove={handleMouseMove}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98, y: -1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className={`relative overflow-hidden rounded-2xl font-medium transition-all ${props.className}`}
    >
      {/* Directional fill on hover */}
      <motion.div
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        whileHover={{ clipPath: 'inset(0 0 0 0)' }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-gradient-to-l from-green-700/20 pointer-events-none"
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

const BreathingPulse = ({ children, delay = 0 }) => (
  <motion.div
    animate={{ scale: [1, 1.05, 1] }}
    transition={{
      duration: 2.5,
      repeat: Infinity,
      delay,
      ease: 'easeInOut',
    }}
  >
    {children}
  </motion.div>
);

const SpotlightBorder = ({ children }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  return (
    <motion.div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
      className="relative"
    >
      {/* Animated spotlight border */}
      <motion.div
        animate={{
          background: `radial-gradient(600px at ${mousePos.x}px ${mousePos.y}px, rgba(22, 163, 74, 0.2), transparent 80%)`,
        }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
      />
      {children}
    </motion.div>
  );
};

export default function PlaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { location: userLocation } = useUserLocation({ auto: true });

  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tips, setTips] = useState([]);
  const [newTipText, setNewTipText] = useState('');
  const [submittingTip, setSubmittingTip] = useState(false);
  const [tipNotice, setTipNotice] = useState('');

  useEffect(() => {
    const loadPlace = async () => {
      try {
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setPlace(data);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: favData } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', user.id);
          setIsFavorite((favData || []).some(f => f.place_id === data.id));
        }
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadPlace();
  }, [id]);

  const handleFavoriteToggle = async () => {
    if (!place) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', place.id);
        if (error) throw error;
        setIsFavorite(false);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: user.id, place_id: place.id }]);
        if (error) throw error;
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
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('tips')
        .insert([{
          place_id: place.id,
          content: newTipText.trim(),
          created_by_id: user?.id
        }])
        .select();
      if (error) throw error;
      if (data) {
        // New tips are moderated: not shown publicly until an admin approves them
        setNewTipText('');
        setTipNotice('הטיפ נשלח ויופיע באתר לאחר אישור מנהל. תודה!');
      }
    } catch (e) {
      console.error(e);
      setTipNotice('לא הצלחנו לשלוח את הטיפ. ודא שאתה מחובר ונסה שוב.');
    } finally {
      setSubmittingTip(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={40} className="text-green-600" />
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !place) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <AlertCircle size={56} className="mx-auto text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">משהו השתבש</h1>
          <p className="text-gray-600 mb-6">לא הצלחנו לטעון את הפרטים. בואו נחזור.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors"
          >
            חזור
          </button>
        </motion.div>
      </div>
    );
  }

  const distance = userLocation
    ? haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng)
    : null;

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* ASYMMETRIC HERO SECTION */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative min-h-[100dvh] md:min-h-96 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden"
      >
        {/* Background Image */}
        {place.image_url && (
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6 }}
            src={place.image_url}
            alt={place.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Mobile: Full overlay, Desktop: Asymmetric split */}
        <div className="absolute inset-0 md:bg-gradient-to-r md:from-white/95 md:via-white/50 md:to-transparent" />

        {/* Close Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 right-6 p-2 bg-white/90 rounded-full hover:bg-white transition-colors z-20"
        >
          <X size={24} />
        </button>

        {/* Content: Split asymmetric layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute inset-0 flex flex-col justify-end md:justify-center p-6 md:p-12 md:pr-[60%] text-white md:text-gray-900"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tighter leading-tight">
            {place.name}
          </h1>

          {/* Meta info */}
          <div className="flex items-center gap-6 justify-start md:justify-start mb-6">
            {place.rating && (
              <BreathingPulse>
                <div className="flex items-center gap-2">
                  <Star size={24} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-semibold">{place.rating.toFixed(1)}</span>
                </div>
              </BreathingPulse>
            )}

            {distance != null && (
              <div className="flex items-center gap-2 text-lg">
                <MapPin size={20} />
                {formatDistance(distance)}
              </div>
            )}
          </div>

          {/* Short description */}
          {place.short_description && (
            <p className="text-base md:text-lg max-w-[40ch] leading-relaxed opacity-90">
              {place.short_description}
            </p>
          )}
        </motion.div>
      </motion.div>

      {/* CONTENT SECTION */}
      <div className="px-4 md:px-8 py-12 max-w-6xl mx-auto">
        {/* Quick Stats with Breathing Pulse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          {place.opening_hours && (
            <BreathingPulse delay={0}>
              <div className="p-6 bg-white rounded-3xl border border-slate-200/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] text-right">
                <p className="text-xs font-medium text-gray-600 mb-2 tracking-tight">שעות פתיחה</p>
                <p className="text-xl font-bold text-gray-900">{place.opening_hours}</p>
              </div>
            </BreathingPulse>
          )}

          {place.phone && (
            <BreathingPulse delay={0.2}>
              <a
                href={`tel:${place.phone}`}
                className="p-6 bg-white rounded-3xl border border-green-200 shadow-[0_20px_40px_-15px_rgba(22,163,74,0.08)] text-right hover:shadow-[0_20px_40px_-15px_rgba(22,163,74,0.15)] transition-shadow"
              >
                <p className="text-xs font-medium text-gray-600 mb-2 tracking-tight">טלפון</p>
                <p className="text-xl font-bold text-green-600">{place.phone}</p>
              </a>
            </BreathingPulse>
          )}
        </motion.div>

        {/* Navigation & Actions - Directional buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          {place.lat && place.lng && (
            <DirectionalButton
              as="a"
              href={`https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-green-600 text-white flex items-center justify-center gap-2"
            >
              <Navigation size={20} />
              ניווט ב-Waze
            </DirectionalButton>
          )}

          <DirectionalButton
            onClick={handleFavoriteToggle}
            className={`p-4 flex items-center justify-center gap-2 ${
              isFavorite
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
            }`}
          >
            <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
            {isFavorite ? 'שמור' : 'שמור'}
          </DirectionalButton>

          <DirectionalButton
            onClick={() => navigator.share?.({ title: place.name, text: place.description })}
            className="p-4 bg-slate-100 text-gray-700 flex items-center justify-center gap-2"
          >
            <Share2 size={20} />
            שתף
          </DirectionalButton>
        </motion.div>

        {/* Description with better spacing */}
        {place.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mb-16 p-8 bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-slate-200/50 text-right"
          >
            <p className="text-lg text-gray-700 leading-relaxed max-w-[65ch]">{place.description}</p>
          </motion.div>
        )}

        {/* Community Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="border-t border-slate-200 pt-12"
        >
          <h2 className="text-4xl font-bold text-right mb-2 tracking-tighter">טיפים מהקהילה</h2>
          <p className="text-gray-600 text-right mb-8 max-w-[65ch]">שתפו ניסיונות וטיפים עם הקהילה</p>

          {/* Add Tip Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 p-8 bg-gradient-to-br from-green-50 to-white rounded-3xl border-2 border-green-200 text-right"
          >
            <label className="block text-sm font-semibold text-gray-700 mb-3">כתוב טיפ</label>
            <textarea
              value={newTipText}
              onChange={(e) => setNewTipText(e.target.value)}
              placeholder="שתף משהו שידוע לך על המקום..."
              className="w-full p-4 border border-green-300 rounded-2xl text-right resize-none focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent mb-4 bg-white"
              rows={4}
              maxLength={2000}
            />
            {tipNotice && (
              <p role="status" className="text-sm text-green-700 mb-4">{tipNotice}</p>
            )}
            <DirectionalButton
              onClick={handleAddTip}
              disabled={submittingTip || !newTipText.trim()}
              className="w-full p-4 bg-green-600 text-white disabled:opacity-50"
            >
              {submittingTip ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  שולח...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={18} />
                  שיתף טיפ
                </span>
              )}
            </DirectionalButton>
          </motion.div>

          {/* Tips List with Spotlight */}
          <AnimatePresence>
            {tips.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {tips.map((tip, i) => (
                  <SpotlightBorder key={tip.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 bg-white rounded-2xl border border-slate-200/50 text-right hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-shadow"
                    >
                      <p className="text-base text-gray-700 mb-3 leading-relaxed">{tip.content}</p>
                      <p className="text-xs font-medium text-gray-500">עכשיו</p>
                    </motion.div>
                  </SpotlightBorder>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-200/50"
              >
                <Sparkles size={40} className="mx-auto text-gray-300 mb-4" />
                <p className="text-lg text-gray-600 font-medium mb-2">עדיין אין טיפים</p>
                <p className="text-gray-500">היה הראשון לשתף משהו עם הקהילה!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
