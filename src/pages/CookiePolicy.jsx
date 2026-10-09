import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CookiePolicy() {
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
          <h1 className="text-xl font-bold">מדיניות עוגיות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-4xl mx-auto py-8 space-y-6 text-right">
        <section>
          <h2 className="text-2xl font-bold mb-4">מדיניות העוגיות של אתר מה יש פה?</h2>
          <p className="text-muted-foreground mb-4">
            עדכון אחרון: אוקטובר 2026
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">1. מה הן עוגיות?</h3>
          <p className="text-foreground leading-relaxed">
            עוגיות הן קבצים קטנים שנשמרים על מחשבך כאשר אתה מבקר באתרים. הן משמשות לשמירת מידע על העדפותיך וניסיונך.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">2. סוגי העוגיות שאנו משתמשים בהם</h3>
          <p className="text-foreground leading-relaxed">
            אנו משתמשים בעוגיות הבאות:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li><strong>עוגיות חיוניות:</strong> נדרשות לפעולת האתר</li>
            <li><strong>עוגיות ביצועים:</strong> עוזרות לנו להבין כיצד משתמשים בו האתר</li>
            <li><strong>עוגיות פונקציונליות:</strong> שומרות על העדפות שלך</li>
            <li><strong>עוגיות מיושהבות:</strong> משמשות למיוחס מודעות וחיזוי</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">3. עוגיות מיוחדות</h3>
          <p className="text-foreground leading-relaxed">
            אנו משתמשים בשירותי ניתוח ומיוחס הבאים (כשיקבלו הסכמה):
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>Google Analytics - לניתוח תנועת המשתמשים</li>
            <li>Facebook Pixel - למדידת המרות וקהל חוזר</li>
            <li>שירותי מיוחס נוספים</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">4. בקרת עוגיות</h3>
          <p className="text-foreground leading-relaxed">
            אתה יכול לשלוט בעוגיות בדרכים הבאות:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>השתמש בשלט הנגישות שלנו על האתר</li>
            <li>הגדר את העדפות העוגיות בדפדפן שלך</li>
            <li>השבת קבלת עוגיות בהגדרות הדפדפן שלך</li>
            <li>השתמש בנתיבים להסרת עוגיות</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">5. השפעה של חסימת עוגיות</h3>
          <p className="text-foreground leading-relaxed">
            אם תחסום עוגיות, חלק מתכונות האתר עלולות שלא לעבוד בכראוי. עוגיות חיוניות נדרשות לתפקוד.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">6. תקשורת עוגיות</h3>
          <p className="text-foreground leading-relaxed">
            בביקור הראשון שלך באתר, נציג בפניך שלט עוגיות. אתה יכול:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>קבל את כל העוגיות</li>
            <li>דחה עוגיות שאינן חיוניות</li>
            <li>התאם את העדפות העוגיות שלך</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">7. עוגיות של צדדים שלישיים</h3>
          <p className="text-foreground leading-relaxed">
            ספקים חיצוניים כמו Google ו-Facebook עשויים להשתמש בעוגיות משלהם. בקרא את מדיניות העוגיות שלהם.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">8. שינויים במדיניות זו</h3>
          <p className="text-foreground leading-relaxed">
            אנו עשויים לעדכן את מדיניות העוגיות בכל עת. המשך שימוש באתר יחשב כהסכמה לשינויים.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">9. יצירת קשר</h3>
          <p className="text-foreground leading-relaxed">
            אם יש לך שאלות בנוגע לעוגיות או למדיניות זו, אנא צור קשר דרך דף יצירת הקשר באתר.
          </p>
        </section>

        <div className="bg-secondary p-6 rounded-lg mt-8">
          <p className="text-sm text-muted-foreground">
            אנו משתמשים בעוגיות כדי לשפר את חוויית המשתמש שלך. לק לנו שלוט במידע שלך.
          </p>
        </div>
      </div>
    </div>
  );
}
