import React from 'react';
import { motion } from 'motion/react';
import { Clock, MapPin } from 'lucide-react';

export default function TripsGrid({ trips = [], onTripClick }) {
  if (trips.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">אין עדיין מסלולים</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {trips.map((trip, i) => (
        <motion.div
          key={trip.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: i * 0.1 }}
          onClick={() => onTripClick?.(trip)}
          className="group relative h-64 rounded-3xl overflow-hidden cursor-pointer"
        >
          {/* Image */}
          <img
            src={trip.image || 'https://picsum.photos/seed/trip-default/600/400'}
            alt={trip.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Content Overlay */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 + 0.1 }}
            className="absolute inset-0 p-6 flex flex-col justify-end text-white text-right"
          >
            <h3 className="text-2xl font-bold mb-3">{trip.title}</h3>

            {/* Meta Info */}
            <div className="flex gap-4 justify-end">
              <div className="flex items-center gap-1">
                <span className="text-sm">{trip.duration || '4 שעות'}</span>
                <Clock size={16} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm">{trip.places?.length || 0} מקומות</span>
                <MapPin size={16} />
              </div>
            </div>

            {/* Description */}
            {trip.description && (
              <p className="text-sm opacity-90 mt-3 line-clamp-2">{trip.description}</p>
            )}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
