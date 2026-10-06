import React, { useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { geocodeAddress } from "@/lib/geo";
import { DIFFICULTY_LABELS, PRICE_LABELS } from "@/lib/labels";

const SELECT_CLASS =
  "h-11 w-full rounded-2xl border border-input bg-card px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PlaceForm() {
  const [formData, setFormData] = useState({
    name: "",
    category: "cafe",
    city: "",
    address: "",
    lat: "",
    lng: "",
    description: "",
    shortDescription: "",
    imageUrl: "",
    rating: "",
    priceLevel: "",
    openingHours: "",
    phone: "",
    difficultyLevel: "",
    trailLength: "",
    seasonality: "",
    accessibility: "",
    tags: [],
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await geocodeAddress(formData.address);
      console.log("Form submitted successfully:", formData);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">הוסף מקום חדש</h1>
          <p className="text-muted-foreground">שתפו את הקהילה במיקומים שמעניינים אתכם</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6 shadow-lg">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="שם המקום" hint="שם ייחודי שיעזור לאנשים למצוא את המקום">
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="לדוגמה: בית קפה היסטורי בעיר העתיקה"
                required
              />
            </Field>

            <Field label="קטגוריה" hint="בחרו את הקטגוריה המתאימה ביותר">
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={SELECT_CLASS}
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="כתובת" hint="כתובת מלאה שתוצג במפה">
              <Input
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="רחוב, מספר, עיר"
                required
              />
            </Field>

            <Field label="עיר" hint="העיר בה נמצא המקום">
              <Input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="תל אביב"
                required
              />
            </Field>

            <Field label="דירוג" hint="דירוג מ-1 עד 5 כוכבים">
              <Input
                name="rating"
                type="number"
                min="1"
                max="5"
                value={formData.rating}
                onChange={handleInputChange}
                placeholder="4.5"
              />
            </Field>

            <Field label="רמת מחיר" hint="טווח המחירים של המקום">
              <select
                name="priceLevel"
                value={formData.priceLevel}
                onChange={handleInputChange}
                className={SELECT_CLASS}
              >
                <option value="">בחר רמת מחיר</option>
                {PRICE_LABELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="תיאור" hint="תיאור מפורט של המקום והחוויה">
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="ספרו למבקרים על המקום, מה מייחד אותו, מתי הוא פתוח..."
              rows={4}
              required
            />
          </Field>

          <Field label="תיאור קצר" hint="תקציר קצר שיופיע ברשימת המקומות">
            <Textarea
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleInputChange}
              placeholder="במהירות ובקיצור..."
              rows={2}
              maxLength={200}
            />
          </Field>

          <Field label="תמונת URL" hint="לינק לתמונה של המקום">
            <Input
              name="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={handleInputChange}
              placeholder="https://example.com/image.jpg"
            />
          </Field>

          <div className="flex gap-4 pt-6">
            <Button
              type="submit"
              className="flex-1"
              disabled={!formData.name || !formData.category || !formData.address}
            >
              <Loader2 className="mr-2 h-4 w-4" />
              שלח את המקום
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormData({})}>אפס טופס</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PlaceForm;
