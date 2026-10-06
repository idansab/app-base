import React, { useState } from 'react';
import { Heart, MapPin, Star } from 'lucide-react';
import { formatDistance } from '@/lib/geo';

export default function PlaceCard({
  place,
  distance,
  isFavorite,
  onFavoriteToggle,
  onClick,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col"
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

        {/* Category Tag */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
          {place.category === 'nature' && '🏞️ טבע'}
          {place.category === 'culture' && '🎭 תרבות'}
          {place.category === 'food' && '🍽️ אוכל'}
          {place.category === 'shopping' && '🛍️ קניות'}
          {place.category === 'sports' && '⚽ ספורט'}
          {place.category === 'entertainment' && '🎪 בילוי'}
          {!['nature', 'culture', 'food', 'shopping', 'sports', 'entertainment'].includes(place.category) && place.category}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
          className="absolute bottom-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
        >
          <Heart
            size={20}
            className={isFavorite ? 'fill-red-600 text-red-600' : 'text-gray-600'}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-right mb-1 line-clamp-2">{place.name}</h3>
        <p className="text-sm text-gray-600 text-right mb-3 line-clamp-2">
          {place.short_description || place.description}
        </p>

        {/* Rating & Distance Row */}
        <div className="flex items-center justify-between gap-2 mb-4 text-sm">
          <div className="flex items-center gap-1">
            {place.rating && (
              <>
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{place.rating.toFixed(1)}</span>
              </>
            )}
          </div>
          {distance != null && (
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <MapPin size={16} />
              {formatDistance(distance)}
            </div>
          )}
        </div>

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-end">
            {place.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
