# Brief: 3 תמונות שיווק לאתר "מה יש פה?" (ליצירה ב-Gemini / Nano Banana)

פורמט: אנכי **1290×2796** (אייפון 6.7"). שלוש תמונות באותו סגנון, שיראו כסדרה אחת.

## עיקרון חשוב: לא לבקש מ-Gemini טקסט בעברית
מודלי תמונה משבשים אותיות בעברית (רואים את זה גם בתמונות הברים שנוצרו קודם). לכן:
1. מבקשים מ-Gemini תמונה **בלי טקסט**, עם אזור ריק למעלה (כ-22% מהגובה).
2. מוסיפים את הכותרת בעברית אחר כך (Canva / PowerPoint / Figma, או שאני מוסיף ב-PowerShell). כך האותיות מושלמות.

## מה לצלם ולהעלות ל-Gemini כרפרנס (3 צילומי מסך מהאתר)
בדפדפן: F12 → מצב מכשיר (Device toolbar) → iPhone 14 Pro Max (430×932) → רענון. לצלם:
1. **דף הבית**: רשימת כרטיסי מקומות עם קטגוריות, עם הצילום מסך שמראה כמה שיותר תמונות צבעוניות. בלי חלון קופץ.
2. **קטגוריית "טבע וטיולים"**: מעיינות, תצפיות וחופים עם תמונות.
3. **קטגוריית "חיי לילה" או "אוכל"** עם תווית "פתוח עכשיו" או שעות פתיחה (אפשר גם עמוד מקום עם שעות וכפתור ניווט).

טיפ: לפני הצילום לוודא שמוצגות תמונות אמיתיות ולא תמונות המחשה; להסתיר סרגלים מיותרים.

## מפרט סגנון משותף (להדביק בתחילת כל בקשה)
```
Create a vertical App-Store-style marketing image, 1290x2796 px (9:19.5 portrait).
Style: modern, clean, professional mobile-app promo.
Background: ONE flat, solid color #1E88C8 (ocean blue) for the entire canvas. No gradient, no glow, no pattern, no sparkles.
Composition: the TOP 22% of the canvas is completely empty (flat background only) — I will add a headline there later.
Below it: a realistic modern black smartphone mockup (thin bezels, dynamic island), centered horizontally, placed high so its top edge starts right below the empty area, and its bottom part bleeds off the bottom edge of the canvas (cropped, not fully visible).
The phone screen must display EXACTLY the attached app screenshot, unchanged (do not redraw, translate or invent UI).
IMPORTANT: absolutely NO text anywhere in the image apart from what is already inside the attached app screenshot. No logos, no watermark, no extra captions.
Keep everything inside the central 70% of the width (the sides may get cropped later).
Add a soft drop shadow under the phone. Optional: ONE subtle supporting element related to the topic (see below), small and tasteful, never overlapping the empty top area.
```

## תמונה 1 — "גלה · מה יש לעשות סביבך"
העלה: צילום דף הבית.
```
[shared style block above]
App screenshot: the attached home-screen screenshot (a list of place cards with photos).
Supporting element (optional): a small floating location pin icon in teal/white near the upper-right of the phone, partly overlapping the phone edge.
```
כותרת שתוסיף אחר כך: **גלה** (גדול) / **מה יש לעשות סביבך** (קטן)

## תמונה 2 — "טייל · מעיינות, תצפיות וחופים"
העלה: צילום קטגוריית טבע וטיולים.
```
[shared style block above]
App screenshot: the attached nature-category screenshot (springs, viewpoints, beaches).
Supporting element (optional): a few soft stylized green leaves or a small mountain/wave icon floating beside the phone, flat style, low contrast, matching the blue background.
```
כותרת: **טייל** / **מעיינות, תצפיות וחופים**

## תמונה 3 — "צא · לבר, לקפה או לאוכל ברחוב"
העלה: צילום חיי לילה/אוכל עם "פתוח עכשיו".
```
[shared style block above]
App screenshot: the attached nightlife/food screenshot with the "open now" badge.
Supporting element (optional): a small floating coffee cup or cocktail-glass icon near the phone, flat style.
```
כותרת: **צא** / **לבר, לקפה או לאוכל ברחוב**

## אחרי שגמיני מחזיר תמונה
1. **לבדוק** שהמסך בטלפון זהה לצילום ושאין טקסט מומצא. אם יש שינוי — לבקש: *"Keep the phone screen exactly identical to the attached screenshot. Remove any added text."*
2. **עקביות בין התמונות:** מהתמונה השנייה והלאה להעלות גם את התמונה הראשונה שאושרה ולכתוב: *"Match the style, phone mockup, position, shadow and background of the first image exactly; only the screen content changes."*
3. **גודל:** גמיני מחזיר בדרך כלל 9:16. חותכים את הצדדים לאחסן 1290×2796 (יחס 0.461): רוחב = גובה × 1290/2796, חיתוך שווה משני הצדדים, ואז שינוי גודל. אפשר לבקש ממני לעשות את זה.
4. **כותרת בעברית:** גופן עבה (Rubik Black / Heebo Black), לבן, מרכז, פועל גדול ומשפט קטן מתחתיו, בתוך 70% מרוחב התמונה.

## ניסוח קצר אם רוצים גרסה מהירה
```
Vertical 1290x2796 phone mockup promo on a solid #1E88C8 background, empty top 22%, black smartphone centered and bleeding off the bottom, screen shows the attached screenshot exactly, no text, soft shadow.
```
