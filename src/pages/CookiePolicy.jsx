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
            עדכון אחרון: 11 באוקטובר 2026
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">1. מה הן עוגיות?</h3>
          <p className="text-foreground leading-relaxed">
            עוגיות הן קבצים קטנים שנשמרים על מחשבך כאשר אתה מבקר באתרים. הן משמשות לשמירת מידע על העדפותיך וניסיונך.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">2. מה אנו שומרים בדפדפן שלך</h3>
          <p className="text-foreground leading-relaxed">
            האתר שומר מעט מאוד מידע על המכשיר שלך, והוא נחוץ לתפעול האתר:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li><strong>התחברות:</strong> אם נרשמת, פרטי ההתחברות נשמרים באחסון המקומי של הדפדפן כדי שלא תצטרך להתחבר מחדש בכל ביקור</li>
            <li><strong>העדפות תצוגה:</strong> מצב יום או לילה והגדרות הנגישות שבחרת</li>
          </ul>
          <p className="text-foreground leading-relaxed">
            איננו משתמשים בעוגיות פרסום, בעוגיות מעקב או במידע שמזהה אותך מעבר לביקור באתר.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">3. ניתוח תנועה באתר</h3>
          <p className="text-foreground leading-relaxed">
            כדי להבין כמה אנשים מבקרים באתר ואילו עמודים פופולריים, אנו משתמשים ב-Cloudflare Web Analytics. השירות מציג נתונים מצטברים בלבד, כמו מספר מבקרים וצפיות בעמודים, מקורות הגעה, סוגי מכשירים ומדינות.
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>השירות אינו משתמש בעוגיות</li>
            <li>הוא אינו עוקב אחריך בין אתרים ואינו יוצר פרופיל אישי</li>
            <li>איננו משתמשים ב-Google Analytics, ב-Facebook Pixel או בשירותי פרסום</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">4. בקרת המידע שנשמר</h3>
          <p className="text-foreground leading-relaxed">
            אתה יכול לשלוט במידע שנשמר בדפדפן בדרכים הבאות:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>למחוק את נתוני האתר בהגדרות הדפדפן שלך</li>
            <li>להתנתק מהחשבון, וכך להסיר את פרטי ההתחברות מהמכשיר</li>
            <li>לשנות את מצב התצוגה ואת הגדרות הנגישות בדף ההגדרות</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">5. השפעה של מחיקת המידע</h3>
          <p className="text-foreground leading-relaxed">
            אם תמחק את נתוני האתר, תתנתק מהחשבון והעדפות התצוגה שלך יחזרו לברירת המחדל. המידע שנשמר רק בדפדפן אינו נשמר אצלנו.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">6. הסכמה</h3>
          <p className="text-foreground leading-relaxed">
            מכיוון שהאתר משתמש רק באחסון הנחוץ לפעולתו ובניתוח תנועה ללא עוגיות, אנו לא מציגים שלט עוגיות. אם נוסיף בעתיד כלים שדורשים הסכמה, נעדכן מדיניות זו ונבקש את הסכמתך לפני השימוש בהם.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">7. צדדים שלישיים</h3>
          <p className="text-foreground leading-relaxed">
            האתר מתארח ב-Cloudflare, המשמשת גם לניתוח התנועה, ומסד הנתונים וההתחברות מופעלים באמצעות Supabase. בעמודי ההרשמה וההתחברות משמש אימות האבטחה Cloudflare Turnstile, המבדיל בין אדם לבוט. אנו ממליצים לקרוא את מדיניות הפרטיות של הספקים.
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
            אנו שומרים על מינימום מידע ואיננו משתמשים בעוגיות פרסום או מעקב.
          </p>
        </div>
      </div>
    </div>
  );
}
