import React, { useState } from "react";
import { Crosshair, Loader2, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geocodeAddress } from "@/lib/geo";

export default function LocationPickerSheet({
  open,
  onOpenChange,
  onUseCurrent,
  onPickCity,
  locating,
  hasOrigin,
  radiusKm,
  onChangeRadius,
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const search = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    const coords = await geocodeAddress(`${query.trim()}, ישראל`);
    setSearching(false);
    if (!coords) {
      setError("לא מצאנו את המקום. נסו שם עיר או כתובת מלאה בארץ.");
      return;
    }
    const label = (coords.label || query.trim()).split(",")[0].trim();
    onPickCity({ lat: coords.lat, lng: coords.lng, label });
    setQuery("");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="no-scrollbar mx-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border-border p-5"
      >
        <SheetTitle className="font-heading text-xl font-bold">מהיכן לחפש?</SheetTitle>
        <SheetDescription className="mt-1 text-sm text-muted-foreground">
          בחרו את המיקום הנוכחי שלכם, או הקלידו עיר או כתובת בכל הארץ.
        </SheetDescription>

        <Button
          onClick={onUseCurrent}
          disabled={locating}
          className="mt-5 h-12 w-full rounded-2xl text-sm font-semibold"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
          המיקום הנוכחי שלי
        </Button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-semibold text-muted-foreground">או</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={search} className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="למשל: באר שבע, או הרצל 10 תל אביב"
            className="h-12 rounded-2xl"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={searching || !query.trim()}
            className="h-12 w-full rounded-2xl text-sm font-semibold"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            איתור המיקום
          </Button>
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
        </form>

        {hasOrigin ? (
          <div className="mt-5 space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">מד מרחק</span>
              <span className="text-xs font-bold text-primary">
                {radiusKm ? `עד ${radiusKm} ק״מ` : "ללא הגבלת מרחק"}
              </span>
            </div>
            {radiusKm ? (
              <Slider
                value={[radiusKm]}
                min={1}
                max={100}
                step={1}
                onValueChange={([next]) => onChangeRadius(next)}
              />
            ) : null}
            <button
              type="button"
              onClick={() => onChangeRadius(radiusKm ? null : 50)}
              className="text-[11px] font-semibold text-primary underline"
            >
              {radiusKm ? "הצגת מקומות בכל הארץ" : "הגבלת טווח המרחק"}
            </button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}