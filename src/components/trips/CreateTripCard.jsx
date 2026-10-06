import React, { useEffect, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

/**
 * Shared pending-review list for community content (tips + field reports).
 */
export default function PendingCommunityList({ entityName, icon, emptyTitle, onChanged }) {
  const [items, setItems] = useState([]);
  const [placeNames, setPlaceNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    const page = await base44.entities[entityName].filter(
      { status: "pending" },
      { sort: "-created_date", limit: 100 }
    );
    const list = page.items || [];
    const ids = [...new Set(list.map((item) => item.place_id).filter(Boolean))];
    const names = {};
    if (ids.length > 0) {
      const placesPage = await base44.entities.Place.filter({ id: { $in: ids } }, { limit: 100 });
      (placesPage.items || []).forEach((place) => {
        names[place.id] = place.name;
      });
    }
    setItems(list);
    setPlaceNames(names);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [entityName]);

  const approve = async (item) => {
    setBusyId(item.id);
    await base44.entities[entityName].update(item.id, { status: "approved" });
    setBusyId(null);
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    onChanged?.();
  };

  const remove = async (item) => {
    setBusyId(item.id);
    await base44.entities[entityName].delete(item.id);
    setBusyId(null);
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        טוען תוכן ממתין…
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={icon} title={emptyTitle} description="אין כרגע תוכן שממתין לאישור." />;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-xs font-semibold text-primary">
            {placeNames[item.place_id] || "מקום לא מזוהה"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{item.content}</p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => approve(item)}
              disabled={busyId === item.id}
              className="h-9 rounded-xl"
            >
              <Check className="h-4 w-4" />
              אישור
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => remove(item)}
              disabled={busyId === item.id}
              className="h-9 rounded-xl text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              מחיקה
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}