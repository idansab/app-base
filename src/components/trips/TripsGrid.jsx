import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, MapPin } from 'lucide-react';

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
      {/* Animated spotlight glow */}
      <motion.div
        animate={{
          background: `radial-gradient(600px at ${mousePos.x}px ${mousePos.y}px, rgba(22, 163, 74, 0.15), transparent 80%)`,
        }}
        className="absolute inset-0 rounded-3xl pointer-events-none z-10"
      />
      {children}
    </motion.div>
  );
};

export default function TripsGrid({ trips = [], onTripClick }) {
  if (!trips || trips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 bg-gradient-to-b from-background to-background rounded-3xl border border-border"
      >
        <MapPin size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-xl font-medium text-muted-foreground mb-2">אין עדיין מסלולים</p>
        <p className="text-muted-foreground">בואו נתחיל עם טיול ראשון!</p>
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      {/* ASYMMETRIC GRID (DESKTOP) + SINGLE COLUMN (MOBILE) */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.2fr] gap-6">
        {trips.map((trip, i) => (
          <SpotlightBorder key={trip.id}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.6,
                delay: i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ y: -8 }}
              onClick={() => onTripClick?.(trip)}
              className="group relative h-64 md:h-80 rounded-3xl overflow-hidden cursor-pointer bg-card border border-border/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)] transition-shadow"
            >
              {/* Image Container */}
              <div className="relative w-full h-full overflow-hidden">
                <motion.img
                  src={trip.image || 'https://picsum.photos/seed/trip-default/600/400'}
                  alt={trip.title}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.4 }}
                />

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Content Overlay */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.12 + 0.15,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute inset-0 p-6 flex flex-col justify-end text-white text-right"
                >
                  {/* Title */}
                  <h3 className="text-3xl md:text-4xl font-bold mb-4 tracking-tighter leading-tight">
                    {trip.title}
                  </h3>

                  {/* Meta Info Row */}
                  <div className="flex gap-6 justify-end mb-4">
                    {trip.duration && (
                      <motion.div
                        className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/30"
                        whileHover={{ scale: 1.05 }}
                      >
                        <Clock size={16} />
                        <span className="text-sm font-medium">{trip.duration}</span>
                      </motion.div>
                    )}

                    {trip.places?.length && (
                      <motion.div
                        className="flex items-center gap-2 bg-green-500/30 px-4 py-2 rounded-full backdrop-blur-sm border border-green-400/50"
                        whileHover={{ scale: 1.05 }}
                      >
                        <MapPin size={16} />
                        <span className="text-sm font-medium">{trip.places.length} מקומות</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Description */}
                  {trip.description && (
                    <p className="text-sm opacity-90 line-clamp-2 leading-relaxed">
                      {trip.description}
                    </p>
                  )}
                </motion.div>

                {/* Hover Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="absolute top-4 right-4 px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium"
                >
                  צפה בטיול
                </motion.div>
              </div>
            </motion.div>
          </SpotlightBorder>
        ))}
      </div>
    </div>
  );
}
