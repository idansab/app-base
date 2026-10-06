import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PlaceForm from "@/components/places/PlaceForm";
import { geocodeAddress } from "@/lib/geo";
import { useToast } from "@/components/ui/use-toast";

export default function AddPlaceForm() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const { toast } = useToast();

  const handleSubmit = async (payload) => {
    setBusy(true);
    setNotice(null);
    try {
      const parts = [payload.address, payload.city, "ישראל"].filter(Boolean);
      let coords = null;
      if (payload.address) {
        coords = await geocodeAddress(parts.join(", "));
      }

      const record = { ...payload };
      if (coords) {
        record.lat = coords.lat;
        record.lng = coords.lng;
      }
      record.status = "pending";

      await base44.entities.Place.create(record);
      setFormKey((key) => key + 1);
      setNotice(
        coords
          ? "ההמלצה נשלחה לאישור, והמיקום זוהה אוטומטית על המפה."
          : "ההמלצה נשלחה לאישור. לא הצלחנו לזהות את המיקום אוטומטית — מנהל ישלים אותו."
      );
      toast({ title: "תודה!", description: "ההמלצה נשלחה לאישור מנהל." });
    } catch (error) {
      setNotice("לא הצלחנו לשלוח את ההמלצה. נסו שוב בעוד רגע.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {notice ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </div>
      ) : null}
      <PlaceForm key={formKey} onSubmit={handleSubmit} busy={busy} submitLabel="שליחה לאישור" />
    </div>
  );
}