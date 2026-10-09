import React, { useEffect, useState } from "react";
import { ClipboardList, Lightbulb, MapPin, Radio } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import EmptyState from "@/components/common/EmptyState";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/labels";
import { cn } from "@/lib/utils";

function SubmissionRow({ icon: Icon, title, subtitle, status }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {subtitle ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
          STATUS_TONES[status] || STATUS_TONES.pending
        )}
      >
        {STATUS_LABELS[status] || status}
      </span>
    </li>
  );
}

export default function MySubmissions() {
  const { user } = useAuth();
  const [data, setData] = useState({ places: [], tips: [], reports: [], placeNames: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.id) return;
      setLoading(true);
      const options = { sort: "-created_date", limit: 30 };
      const [placesPage, tipsPage, reportsPage] = await Promise.all([
        base44.entities.Place.filter({ created_by_id: user.id }, options),
        base44.entities.Tip.filter({ created_by_id: user.id }, options),
        base44.entities.FieldReport.filter({ created_by_id: user.id }, options),
      ]);

      const tips = tipsPage.items || [];
      const reports = reportsPage.items || [];
      const ids = [...new Set([...tips, ...reports].map((item) => item.place_id).filter(Boolean))];
      const placeNames = {};
      if (ids.length > 0) {
        const placesPage = await base44.entities.Place.filter(
          { id: { $in: ids } },
          { limit: 100 }
        );
        (placesPage.items || []).forEach((place) => {
          placeNames[place.id] = place.name;
        });
      }

      if (!cancelled) {
        setData({
          places: placesPage.items || [],
          tips,
          reports,
          placeNames,
        });
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const total = data.places.length + data.tips.length + data.reports.length;

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="עדיין אין הגשות"
        description="כל המלצה, טיפ או דיווח שתשלחו יופיעו כאן עד לאישור."
      />
    );
  }

  return (
    <div className="space-y-6">
      {data.places.length > 0 ? (
        <section className="space-y-3">
          <h3 className="font-heading text-sm font-semibold text-muted-foreground">מקומות שהמלצתם</h3>
          <ul className="space-y-2.5">
            {data.places.map((place) => (
              <SubmissionRow
                key={place.id}
                icon={MapPin}
                title={place.name}
                subtitle={place.short_description || place.city}
                status={place.status}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {data.tips.length > 0 ? (
        <section className="space-y-3">
          <h3 className="font-heading text-sm font-semibold text-muted-foreground">הטיפים שלכם</h3>
          <ul className="space-y-2.5">
            {data.tips.map((tip) => (
              <SubmissionRow
                key={tip.id}
                icon={Lightbulb}
                title={data.placeNames[tip.place_id] || "מקום"}
                subtitle={tip.content}
                status={tip.status}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {data.reports.length > 0 ? (
        <section className="space-y-3">
          <h3 className="font-heading text-sm font-semibold text-muted-foreground">הדיווחים שלכם</h3>
          <ul className="space-y-2.5">
            {data.reports.map((report) => (
              <SubmissionRow
                key={report.id}
                icon={Radio}
                title={data.placeNames[report.place_id] || "מקום"}
                subtitle={report.content}
                status={report.status}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}