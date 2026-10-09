import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ExternalLink } from 'lucide-react';

const BreathingPulse = ({ children, delay = 0 }) => (
  <motion.div
    animate={{ scale: [1, 1.15, 1] }}
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

const RippleButton = ({ children, onClick, ...props }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = { id: Date.now(), x, y };

    setRipples([...ripples, ripple]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== ripple.id)), 600);

    onClick?.();
  };

  return (
    <button onClick={handleClick} {...props} className={`relative overflow-hidden ${props.className}`}>
      {children}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute w-2 h-2 bg-green-400 rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
};

export default function InteractiveMap({ places = [], onPlaceClick, isLoading = false }) {
  const [selectedPlace, setSelectedPlace] = useState(null);

  if (!places || places.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 bg-gradient-to-b from-blue-50 to-white rounded-3xl border border-blue-200"
      >
        <MapPin size={48} className="mx-auto text-blue-300 mb-4" />
        <p className="text-xl font-medium text-gray-600 mb-2">אין מקומות להצגה</p>
        <p className="text-gray-500">הוסף מקומות כדי לראות אותם במפה</p>
      </motion.div>
    );
  }

  // Calculate bounding box
  const lats = places.map(p => p.lat);
  const lngs = places.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return (
    <div className="space-y-6">
      {/* Map Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative min-h-96 bg-blue-50 rounded-3xl overflow-hidden border-4 border-blue-200 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
      >
        {/* Loading Skeleton */}
        {isLoading && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-blue-100 via-blue-50 to-blue-100 z-20"
          />
        )}

        {/* Map Embed */}
        <iframe
          title="Trip Map"
          width="100%"
          height="100%"
          frameBorder="0"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${minLng - 0.01},${minLat - 0.01},${maxLng + 0.01},${maxLat + 0.01}&layer=mapnik`}
          className="w-full h-full"
        />

        {/* Stop Markers Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {places.map((place, i) => {
            const x = ((place.lng - minLng) / (maxLng - minLng)) * 100;
            const y = ((maxLat - place.lat) / (maxLat - minLat)) * 100;

            return (
              <BreathingPulse key={place.id} delay={i * 0.15}>
                <motion.button
                  className="absolute w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg hover:bg-green-700 transition-colors pointer-events-auto cursor-pointer"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedPlace(place)}
                >
                  {i + 1}
                </motion.button>
              </BreathingPulse>
            );
          })}
        </div>
      </motion.div>

      {/* Places List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="text-right">
          <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tighter">עצירות במסלול</h3>
          <p className="text-sm text-gray-600">לחץ על עצירה כדי לראות פרטים נוספים</p>
        </div>

        {places.map((place, i) => (
          <motion.div
            key={place.id}
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            onClick={() => setSelectedPlace(place)}
            className={`relative rounded-2xl border-2 cursor-pointer transition-all text-right overflow-hidden ${
              selectedPlace?.id === place.id
                ? 'bg-green-50 border-green-600'
                : 'bg-white border-slate-200 hover:border-green-600'
            }`}
          >
            {/* Background fill animation on hover */}
            {selectedPlace?.id !== place.id && (
              <motion.div
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                whileHover={{ clipPath: 'inset(0 0 0 0)' }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-gradient-to-l from-green-100/50 pointer-events-none"
              />
            )}

            <div className="relative p-4">
              <div className="flex items-start gap-3 justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-lg">{place.name}</h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {place.short_description || place.address}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <RippleButton
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                  >
                    <a
                      href={`https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={18} />
                    </a>
                  </RippleButton>

                  <motion.div
                    animate={{
                      scale: selectedPlace?.id === place.id ? 1 : 1,
                    }}
                    className="w-11 h-11 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm"
                  >
                    {i + 1}
                  </motion.div>
                </div>
              </div>

              {/* Expandable Details */}
              <AnimatePresence>
                {selectedPlace?.id === place.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 100,
                      damping: 20,
                    }}
                    className="mt-4 pt-4 border-t border-slate-200 space-y-3"
                  >
                    {place.opening_hours && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 }}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600">שעות פעילות</span>
                        <span className="font-semibold text-gray-900">{place.opening_hours}</span>
                      </motion.div>
                    )}

                    {place.phone && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600">טלפון</span>
                        <a
                          href={`tel:${place.phone}`}
                          className="font-semibold text-green-600 hover:underline"
                        >
                          {place.phone}
                        </a>
                      </motion.div>
                    )}

                    {place.rating && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600">דירוג</span>
                        <span className="font-semibold text-gray-900">
                          ⭐ {place.rating.toFixed(1)}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
