import React, { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistance } from '@/lib/geo';

const CATEGORY_MAP = {
  'coffee_food': 'עגלות קפה ואוכל',
  'trips': 'טיולים',
  'food': 'אוכל ושתייה',
  'nature': 'טבע וטיולים',
  'nightlife': 'חיי לילה',
  'shopping': 'קניות ושווקים',
  'culture': 'תרבות',
};

export default function PlaceCard({
  place,
  distance,
  isFavorite,
  onFavoriteToggle,
  onClick,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const categoryLabel = CATEGORY_MAP[place.category] || place.category;

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col"
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
        {!imageFailed && place.image_url && (
          <img
            src={place.image_url}
            alt={place.name}
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover"
          />
        )}

        {/* Favorite Button - Top Left */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
          className="absolute top-3 right-3 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-sm"
        >
          <Heart
            size={20}
            className={isFavorite ? 'fill-red-600 text-red-600' : 'text-gray-600'}
          />
        </button>

        {/* Category Tag - Top Right */}
        <div className="absolute top-3 left-3 bg-sand px-3 py-1 rounded-full text-xs font-medium text-text-primary">
          {categoryLabel}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-right mb-2">{place.name}</h3>

        {/* Rating & Distance Row */}
        <div className="flex items-center justify-between gap-2 mb-3 text-sm">
          {place.rating && (
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-700">{place.rating.toFixed(1)}</span>
              <Star size={16} className="fill-amber-400 text-amber-400" />
            </div>
          )}
          {distance != null && (
            <div className="text-xs bg-slate-100 text-gray-600 px-2 py-1 rounded-full font-medium">
              {formatDistance(distance)}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600 text-right mb-auto line-clamp-2">
          {place.short_description || place.description}
        </p>
      </div>
    </motion.div>
  );
}
