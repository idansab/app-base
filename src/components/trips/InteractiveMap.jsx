import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, ExternalLink } from 'lucide-react';

export default function InteractiveMap({ places = [], onPlaceClick }) {
  const [selectedPlace, setSelectedPlace] = useState(null);

  if (!places || places.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">אין מקומות להצגה</p>
      </div>
    );
  }

  // Calculate bounding box
  const lats = places.map(p => p.lat);
  const lngs = places.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return (
    <div className="space-y-6">
      {/* Map Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative h-96 bg-blue-50 rounded-3xl overflow-hidden border-4 border-blue-200"
      >
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
        <div className="absolute inset-0">
          {places.map((place, i) => {
            // Rough calculation of position on map (not perfect but works for demo)
            const x = ((place.lng - minLng) / (maxLng - minLng)) * 100;
            const y = ((maxLat - place.lat) / (maxLat - minLat)) * 100;

            return (
              <motion.button
                key={place.id}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.2 }}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={() => setSelectedPlace(place)}
                className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg hover:bg-green-700 transition-colors"
              >
                {i + 1}
              </motion.button>
            );
          })}
        </div>

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-md overflow-hidden">
          <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors">+</button>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors">−</button>
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
        <h3 className="text-xl font-bold text-right mb-4">עצירות במסלול</h3>

        {places.map((place, i) => (
          <motion.div
            key={place.id}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedPlace(place)}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all text-right ${
              selectedPlace?.id === place.id
                ? 'bg-green-50 border-green-600'
                : 'bg-white border-gray-200 hover:border-green-600'
            }`}
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{place.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{place.short_description || place.address}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
                <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                  {i + 1}
                </div>
              </div>
            </div>

            {/* Details */}
            {selectedPlace?.id === place.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-gray-200 space-y-2"
              >
                {place.opening_hours && (
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">שעות:</span> {place.opening_hours}
                  </p>
                )}
                {place.phone && (
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">טלפון:</span>{' '}
                    <a href={`tel:${place.phone}`} className="text-green-600 hover:underline">
                      {place.phone}
                    </a>
                  </p>
                )}
                {place.rating && (
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">דירוג:</span> ⭐ {place.rating.toFixed(1)}
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
