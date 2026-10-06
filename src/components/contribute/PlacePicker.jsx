import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function PlacePicker({ value, onChange, className }) {
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    let cancelled = false;
    base44.entities.Place
      .filter({ status: "approved" }, { sort: "name", limit: 300 })
      .then((page) => {
        if (!cancelled) setPlaces(page.items || []);
      })
      .catch(() => {
        if (!cancelled) setPlaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-11 w-full rounded-2xl border border-input bg-card px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10",
        className
      )}
    >
      <option value="">בחרו מקום…</option>
      {places.map((place) => (
        <option key={place.id} value={place.id}>
          {place.name}
          {place.city ? ` · ${place.city}` : ""}
        </option>
      ))}
    </select>
  );
}