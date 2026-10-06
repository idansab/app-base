import React, { useEffect, useState } from "react";
import { Heart, MapPin, Navigation, Star } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Image } from "@/components/ui/image";
import PlaceCard from "./PlaceCard";
import CommunityPanel from "@/components/community/CommunityPanel";
import { useAuth } from "@/lib/AuthContext";
import { getCategory } from "@/lib/categories";
import { formatDistance, googleMapsUrl, haversineKm, wazeUrl } from "@/lib/geo";
import { DIFFICULTY_LABELS, PRICE_LABELS } from "@/lib/labels";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-none">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-end text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function NavAction({ href, children, variant = "primary" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition active:scale-[0.98]",
        variant === "primary"
          ? "bg-primary text-primary-foreground shadow-sm"
          : "border border-border bg-card text-foreground hover:border-primary/40"
      )}
    >
      {children}
    </a>
  );
}

export default function PlaceDetailsSheet({
  place,
  open,
  onOpenChange,
  isFavorite,
  onToggleFavorite,
  userLoc,
}) {
  const { isAuthenticated } = useAuth();
  const [nearby, setNearby] = useState([]);

  useEffect(() => {
    if (!open || !place || typeof place.lat !== "number" || typeof place.lng !== "number") {
      setNearby([]);
      return undefined;
    }
    let cancelled = false;
    const latDelta = 3 / 111;
    const lngDelta = 3 / (111 * Math.cos((place.lat * Math.PI) / 180) || 1);
    base44.entities.Place
      .filter(
        {
          status: "approved",
          lat: { $gte: place.lat - latDelta, $lte: place.lat + latDelta },
          lng: { $gte: place.lng - lngDelta, $lte: place.lng + lngDelta },
        },
        { limit: 30 }
      )
      .then((page) => {
        if (cancelled) return;
        const list = (page.items || [])
          .filter((item) => item.id !== place.id && typeof item.lat === "number")
          .map((item) => ({ ...item, distance: haversineKm(place.lat, place.lng, item.lat, item.lng) }))
          .filter((item) => item.distance <= 3)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 4);
        setNearby(list);
      })
      .catch(() => {
        if (!cancelled) setNearby([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, place?.id]);

  if (!place) return null;

  const category = getCategory(place.category);
  const CategoryIcon = category.icon;
  const hasCoords = typeof place.lat === "number" && typeof place.lng === "number";
  const distance =
    userLoc && hasCoords ? haversineKm(userLoc.lat, userLoc.lng, place.lat, place.lng) : null;
  const tags = Array.isArray(place.tags) ? place.tags.filter(Boolean) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="no-scrollbar mx-auto max-h-[92vh] w-full max-w-3xl overflow-x-hidden overflow-y-auto rounded-t-[2rem] border-border p-0 shadow-xl"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <Image src={place.image_url} alt={place.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <button
            type="button"
            onClick={() => onToggleFavorite?.(place)}
            aria-label={isFavorite ? "הסרה מהמועדפים" : "הוספה למועדפים"}
            className={cn(
              "absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition active:scale-95",
              isFavorite
                ? "border-rose-200 bg-rose-50 text-rose-600"
                : "border-white/60 bg-white/85 text-slate-600"
            )}
          >
            <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
              <CategoryIcon className="h-3.5 w-3.5" />
              {category.label}
            </span>
            <SheetTitle className="mt-2 font-heading text-2xl font-bold text-white">
              {place.name}
            </SheetTitle>
            <SheetDescription className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium text-white/85">
              {place.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {place.city}
                </span>
              ) : null}
              {place.rating ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {Number(place.rating).toFixed(1)}
                </span>
              ) : null}
              {distance ? <span>{formatDistance(distance)} מכאן</span> : null}
            </SheetDescription>
          </div>
        </div>

        {hasCoords ? (
          <div className="flex gap-2 px-5 pt-5">
            <NavAction href={wazeUrl(place.lat, place.lng)}>
              <Navigation className="h-4 w-4" />
              ניווט ב-Waze
            </NavAction>
            <NavAction href={googleMapsUrl(place.lat, place.lng)} variant="outline">
              Google Maps
            </NavAction>
          </div>
        ) : null}

        <div className="px-5 py-4">
          <InfoRow label="שעות פתיחה" value={place.opening_hours} />
          <InfoRow label="טלפון" value={place.phone} />
          <InfoRow label="רמת מחיר" value={PRICE_LABELS[place.price_level]} />
          <InfoRow label="נגישות" value={place.accessibility} />
          <InfoRow label="רמת קושי" value={DIFFICULTY_LABELS[place.difficulty_level]} />
          <InfoRow label="אורך מסלול" value={place.trail_length ? `${place.trail_length} ק״מ` : null} />
          <InfoRow label="עונה מומלצת" value={place.seasonality} />
          <InfoRow label="כתובת" value={place.address} />
        </div>

        {place.description ? (
          <div className="px-5 pb-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{place.description}</p>
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <CommunityPanel place={place} isAuthenticated={isAuthenticated} />

        {nearby.length > 0 ? (
          <section className="border-t border-border/70 px-5 py-5">
            <h3 className="font-heading text-base font-semibold text-foreground">
              מקומות נוספים בסביבה
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {nearby.map((item) => (
                <PlaceCard
                  key={item.id}
                  place={item}
                  distanceKm={item.distance}
                  isFavorite={false}
                  onToggleFavorite={() => {}}
                  onOpen={() => {}}
                />
              ))}
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}