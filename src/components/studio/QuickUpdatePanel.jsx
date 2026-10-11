import React, { useState } from "react";
import { Check, Loader2, MapPin, Pencil, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import PlaceForm from "@/components/places/PlaceForm";
import EmptyState from "@/components/common/EmptyState";
import { base44 } from "@/api/base44Client";
import { getCategory } from "@/lib/categories";

export default function PendingPlaces({ places, loading, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const approve = async (place) => {
    setBusyId(place.id);
    await base44.entities.Place.update(place.id, { status: "approved" });
    setBusyId(null);
    onChanged?.();
  };

  const remove = async (place) => {
    setBusyId(place.id);
    await base44.entities.Place.delete(place.id);
    setBusyId(null);
    onChanged?.();
  };

  const saveEdits = async (payload) => {
    await base44.entities.Place.update(editing.id, payload);
    setEditing(null);
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        טוען מקומות ממתינים…
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="אין מקומות שממתינים לאישור"
        description="כשמשתמשים ימליצו על מקומות חדשים, הם יופיעו כאן."
      />
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {places.map((place) => {
          const category = getCategory(place.category);
          const Icon = category.icon;
          const hasCoords = typeof place.lat === "number" && typeof place.lng === "number";
          return (
            <li key={place.id} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-heading text-base font-semibold text-foreground">{place.name}</h3>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {category.label}
                    {place.city ? ` · ${place.city}` : ""}
                  </p>
                  {place.address ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">{place.address}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  ממתין
                </span>
              </div>

              {place.short_description ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {place.short_description}
                </p>
              ) : null}

              {!hasCoords ? (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  חסרות קואורדינטות — כדאי להשלים כתובת ולערוך.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => approve(place)}
                  disabled={busyId === place.id}
                  className="h-9 rounded-xl"
                >
                  <Check className="h-4 w-4" />
                  אישור
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(place)}
                  disabled={busyId === place.id}
                  className="h-9 rounded-xl"
                >
                  <Pencil className="h-4 w-4" />
                  עריכה
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => remove(place)}
                  disabled={busyId === place.id}
                  className="h-9 rounded-xl text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  מחיקה
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!editing} onOpenChange={(open) => (open ? null : setEditing(null))}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl p-5"
        >
          <SheetTitle className="font-heading text-xl font-bold">עריכת מקום</SheetTitle>
          <SheetDescription className="mt-1 text-sm text-muted-foreground">
            תקנו פרטים, השלימו מידע חסר ושמרו.
          </SheetDescription>
          <div className="mt-5">
            {editing ? (
              <PlaceForm
                initialValues={editing}
                onSubmit={saveEdits}
                submitLabel="שמירת השינויים"
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}