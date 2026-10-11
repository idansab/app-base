import React, { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistance } from '@/lib/geo';
import { OpenBadge, KosherBadge } from '@/components/places/PlaceBadges';
import { placeholderFor } from '@/lib/placeholders';

const CATEGORY_MAP = {
  'coffee_food': 'עגלות קפה ואוכל',
  'trips': 'טבע וטיולים',
  'cafe': 'עגלות קפה ואוכל',
  'hiking': 'טבע וטיולים',
  'view': 'טבע וטיולים',
  'beach': 'טבע וטיולים',
  'family': 'טבע וטיולים',
  'food': 'עגלות קפה ואוכל',
  'nature': 'טבע וטיולים',
  'nightlife': 'חיי לילה',
  'shopping': 'קניות ושווקים',
  'culture': 'תרבות',
  'attractions': 'אטרקציות',
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
      className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col"
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
        {!imageFailed && (place.images?.[0] || place.image_url || placeholderFor(place)) && (
          <img
            src={place.images?.[0] || place.image_url || placeholderFor(place)}
            alt={place.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover"
          />
        )}

        {!(place.images?.[0] || place.image_url) && !imageFailed && (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            להמחשה בלבד
          </span>
        )}

        {/* Favorite Button - Top Left */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
          className="absolute top-3 right-3 p-2 bg-card rounded-full hover:bg-secondary transition-colors shadow-sm"
          aria-label={isFavorite ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
          title={isFavorite ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
        >
          <Heart
            size={20}
            className={isFavorite ? 'fill-red-600 text-red-600' : 'text-gray-600'}
          />
        </button>

        {/* Status badges - bottom of the image (only when the data is known) */}
        <div className="absolute bottom-3 right-3 flex flex-wrap gap-1.5 justify-start">
          <OpenBadge place={place} />
          <KosherBadge place={place} />
        </div>

        {/* Category Tag - Top Right */}
        <div className="absolute top-3 left-3 bg-sand px-3 py-1 rounded-full text-xs font-medium text-stone-900">
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
              <span className="font-medium text-foreground">{place.rating.toFixed(1)}</span>
              <Star size={16} className="fill-amber-400 text-amber-400" />
            </div>
          )}
          {distance != null && (
            <div className="text-xs bg-secondary text-foreground px-2 py-1 rounded-full font-medium">
              {formatDistance(distance)}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-right mb-auto line-clamp-2">
          {place.short_description || place.description}
        </p>
      </div>
    </motion.div>
  );
}
