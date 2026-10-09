import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function AccessibilityStatement() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="px-4 max-w-4xl mx-auto py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-lg"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold">הצהרת נגישות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-4xl mx-auto py-8 space-y-6 text-right">
        <section>
          <h2 className="text-2xl font-bold mb-4">הצהרת הנגישות של אתר מה יש פה?</h2>
          <p className="text-muted-foreground mb-4">
            עדכון אחרון: אוקטובר 2026
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">1. התחייבותנו לנגישות</h3>
          <p className="text-foreground leading-relaxed">
            אנו מחויבים להנגיש את האתר שלנו לכל אנשים, כולל אלה עם מוגבלויות. אנו עומדים בעקרונות הנגישות של WCAG 2.1 ברמה AA.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">2. תכונות נגישות</h3>
          <p className="text-foreground leading-relaxed">
            האתר שלנו כולל את התכונות הבאות כדי לשפר את הנגישות:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>תמיכה בקוראי מסך (screen readers)</li>
            <li>ניווט מלא עם מקלדת</li>
            <li>ניגודיות צבעוניות מספקת</li>
            <li>תמיכה בהגדלת הטקסט</li>
            <li>טקסט חלופי לתמונות</li>
            <li>תיאור אלטרנטיבי לתוכן מדיה</li>
            <li>תיקיות סמנטיות בקוד HTML</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">3. תאימות דפדפנים</h3>
          <p className="text-foreground leading-relaxed">
            האתר תוכנן לעבוד עם דפדפנים מודרניים בעלי תמיכה בנגישות, כולל:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>Chrome עם הרחבות נגישות</li>
            <li>Firefox עם כלים לנגישות</li>
            <li>Safari עם תכונות נגישות</li>
            <li>Edge עם תמיכה בקוראי מסך</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">4. תכונות הטקסט והגופנים</h3>
          <p className="text-foreground leading-relaxed">
            אנו משתמשים בגופנים קריאים וגודל טקסט הולם. האתר תומך בשינויים של גודל טקסט דרך הגדרות הדפדפן.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">5. ניווט וכלים</h3>
          <p className="text-foreground leading-relaxed">
            האתר ניתן לניווט דרך:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>תפריטים הירארכיים ברורים</li>
            <li>קישורים בעלי תיאור ברור</li>
            <li>כפתורי חיפוש וסינון</li>
            <li>ניווט מלא עם Tab ו-Shift+Tab</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">6. טעויות וביטחון</h3>
          <p className="text-foreground leading-relaxed">
            אנו מספקים הודעות שגיאה ברורות וקישורים לעזרה. כל טופס לבדיקה קלת נגישות.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">7. בדיקות נגישות</h3>
          <p className="text-foreground leading-relaxed">
            אנו בודקים את הנגישות של האתר בקביעות באמצעות:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>כלים אוטומטיים של בדיקת נגישות</li>
            <li>בדיקות ידיות</li>
            <li>בדיקות עם קוראי מסך אמיתיים</li>
            <li>משוב ממשתמשים עם מוגבלויות</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">8. דיווח על בעיות נגישות</h3>
          <p className="text-foreground leading-relaxed">
            אם נתקלת בבעיות נגישות, אנא דווח אותן אלינו:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>שלח לנו דוא"ל דרך דף יצירת הקשר</li>
            <li>תאר את הבעיה בפירוט</li>
            <li>ספר לנו איזה קורא מסך או כלי אתה משתמש בו</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">9. תיאור שירות נגישות</h3>
          <p className="text-foreground leading-relaxed">
            אנו מחויבים להשיג את התאימות הגבוהה ביותר של נגישות. אם אתה זקוק לעזרה, אנא צור קשר.
          </p>
        </section>

        <div className="bg-secondary p-6 rounded-lg mt-8">
          <p className="text-sm text-muted-foreground">
            מטרתנו היא להנגיש את האתר לכולם. אם יש לך הערות או הצעות לשיפור הנגישות, אנא שתף אותן.
          </p>
        </div>
      </div>
    </div>
  );
}
