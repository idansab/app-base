import React, { useState } from "react";
import { CheckCircle2, ImagePlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PlacePicker from "./PlacePicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function AddTipForm({ preselectPlaceId = "" }) {
  const [placeId, setPlaceId] = useState(preselectPlaceId);
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const { toast } = useToast();

  const submit = async (event) => {
    event.preventDefault();
    if (!placeId || !content.trim()) {
      setNotice("צריך לבחור מקום ולכתוב את הטיפ.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      let imageUri;
      if (file) {
        const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
        imageUri = uploaded?.file_uri || uploaded?.data?.file_uri;
      }
      await base44.entities.Tip.create({
        place_id: placeId,
        content: content.trim(),
        image_uri: imageUri,
        status: "pending",
      });
      setContent("");
      setFile(null);
      setNotice("הטיפ נשלח לאישור. תודה שאתם עוזרים לקהילה!");
      toast({ title: "תודה!", description: "הטיפ נשלח לאישור מנהל." });
    } catch (error) {
      setNotice("לא הצלחנו לשלוח את הטיפ. נסו שוב בעוד רגע.");
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
        <Label className="text-xs font-semibold text-muted-foreground">על איזה מקום הטיפ?</Label>
        <PlacePicker value={placeId} onChange={setPlaceId} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">הטיפ שלכם</Label>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          placeholder="למשל: הכי טוב להגיע לפני 10:00, יש צל ליד המים וחניה חופשית בצד."
          className="rounded-2xl"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground transition hover:border-primary/40">
        <ImagePlus className="h-4 w-4" />
        {file ? file.name : "הוספת תמונה (אופציונלי)"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>

      <Button type="submit" disabled={busy} className="h-12 w-full rounded-2xl text-sm font-semibold">
        {busy ? "שולח…" : "שליחת הטיפ לאישור"}
      </Button>
    </form>
  );
}