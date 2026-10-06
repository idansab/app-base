import React from "react";
import { ChevronDown, Loader2, MapPin } from "lucide-react";

/**
 * Compact location selector that sits at the top of the feed. Tapping it opens
 * the window where the origin and the distance gauge are chosen.
 */
export default function LocationChip({ originName, radiusKm, onOpen, locating }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 active:scale-[0.99]"
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate">{originName || "בחירת מיקום"}</span>
      {originName ? (
        <span className="shrink-0 font-medium text-muted-foreground">
          {radiusKm ? `· עד ${radiusKm} ק״מ` : "· כל הארץ"}
        </span>
      ) : null}
      {locating ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}