import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PlacePicker from "./PlacePicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function AddReportForm({ preselectPlaceId = "" }) {
  const [placeId, setPlaceId] = useState(preselectPlaceId);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const { toast } = useToast();

  const submit = async (event) => {
    event.preventDefault();
    if (!placeId || !content.trim()) {
      setNotice("צריך לבחור מקום ולכתוב את הדיווח.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await base44.entities.FieldReport.create({
        place_id: placeId,
        content: content.trim(),
        status: "pending",
      });
      setContent("");
      setNotice("הדיווח נשלח לאישור. תודה!");
      toast({ title: "תודה!", description: "הדיווח נשלח לאישור מנהל." });
    } catch (error) {
      setNotice("לא הצלחנו לשלוח את הדיווח. נסו שוב בעוד רגע.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {notice ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">על איזה מקום הדיווח?</Label>
        <PlacePicker value={placeId} onChange={setPlaceId} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">מה קורה בשטח?</Label>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          placeholder="למשל: יש עומס חריג, או שהמעיין יבש כרגע והדרך בוצית."
          className="rounded-2xl"
        />
      </div>

      <Button type="submit" disabled={busy} className="h-12 w-full rounded-2xl text-sm font-semibold">
        {busy ? "שולח…" : "שליחת הדיווח לאישור"}
      </Button>
    </form>
  );
}