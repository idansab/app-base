import React from "react";
import { Heart, Navigation, Star } from "lucide-react";
import { Image } from "@/components/ui/image";
import { placeholderFor } from "@/lib/placeholders";
import { getPlaceImages } from "@/lib/placeImages";
import { getCategory } from "@/lib/categories";
import { formatDistance, haversineKm } from "@/lib/geo";
import { PRICE_SYMBOLS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export default function PlaceCard({
  place,
  distanceKm,
  userLoc,
  isFavorite,
  onToggleFavorite,
  onOpen,
}) {
  const category = getCategory(place.category);
  const CategoryIcon = category.icon;
  const rawDistance =
    distanceKm ??
    (userLoc && typeof place.lat === "number" && typeof place.lng === "number"
      ? haversineKm(userLoc.lat, userLoc.lng, place.lat, place.lng)
      : null);
  const distance = formatDistance(rawDistance);

  return (
    <article
      onClick={() => onOpen?.(place)}
      className="group cursor-pointer overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={place.image_url || placeholderFor(place)}
          alt={place.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
        />
        {!getPlaceImages(place).length && (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            להמחשה בלבד
          </span>
        )}
        <span
          className={cn(
            "absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur",
            category.tone
          )}
        >
          <CategoryIcon className="h-3.5 w-3.5" />
          {category.label}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.(place);
          }}
          aria-label={isFavorite ? "הסרה מהמועדפים" : "הוספה למועדפים"}
          className={cn(
            "absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition active:scale-95",
            isFavorite
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-white/70 bg-white/85 text-slate-500 hover:text-rose-500"
          )}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>
        {distance ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <Navigation className="h-3.5 w-3.5" />
            {distance} מכאן
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="font-heading text-base font-semibold leading-tight text-foreground">
          {place.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {place.short_description || place.description || "מקום ששווה גיחה קצרה."}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-muted-foreground">
          {place.rating ? (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Star className="h-3.5 w-3.5 fill-current" />
              {Number(place.rating).toFixed(1)}
            </span>
          ) : null}
          {place.price_level ? <span>{PRICE_SYMBOLS[place.price_level]}</span> : null}
          {place.city ? <span className="truncate">{place.city}</span> : null}
        </div>
      </div>
    </article>
  );
}