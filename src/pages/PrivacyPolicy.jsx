import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function PrivacyPolicy() {
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
          <h1 className="text-xl font-bold">מדיניות הפרטיות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-4xl mx-auto py-8 space-y-6 text-right">
        <section>
          <h2 className="text-2xl font-bold mb-4">מדיניות הפרטיות של אתר מה יש פה?</h2>
          <p className="text-muted-foreground mb-4">
            עדכון אחרון: אוקטובר 2026
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">1. מידע שאנו אוספים</h3>
          <p className="text-foreground leading-relaxed">
            אנו אוספים את המידע הבא כדי לספק שירותים טובים יותר:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>פרטי הרשמה: שם, דוא"ל, סיסמה</li>
            <li>פעילות המשתמש: מקומות שנצפו, מועדפים, הודעות קהילתיות</li>
            <li>נתוני מכשיר: סוג מכשיר, מערכת הפעלה, כתובת IP</li>
            <li>עוגיות וטקנולוגיות מעקב אחרות</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">2. כיצד אנו משתמשים במידע</h3>
          <p className="text-foreground leading-relaxed">
            אנו משתמשים במידע שאספנו למטרות הבאות:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>הספקת והשיפור של השירות</li>
            <li>ביצוע אנליזה וחקר</li>
            <li>שליחת עדכונים ותקשור</li>
            <li>חדלון הונאה והגנה על הבטיחות</li>
            <li>ציות להוראות חוק</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">3. שיתוף מידע</h3>
          <p className="text-foreground leading-relaxed">
            אנו לא משתפים את המידע האישי שלך עם צדדים שלישיים ללא הסכמתך, למעט:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>כשנדרש על ידי חוק או הוראה משפטית</li>
            <li>עם ספקי שירותים המסייעים לנו להפעיל את האתר</li>
            <li>במקרה של מיזוג או רכישה של החברה</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">4. אבטחת הנתונים</h3>
          <p className="text-foreground leading-relaxed">
            אנו משתמשים בטכנולוגיות הצפנה ותמיד עובדים כדי להגן על המידע שלך מפני הגישה בלא הסכמה. עם זאת, אף שיטת שידור או אחסון אלקטרוני אינה בטוחה לחלוטין.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">5. זכויותיך</h3>
          <p className="text-foreground leading-relaxed">
            יש לך את הזכות לבקש:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>גישה לנתונים האישיים שלך</li>
            <li>תיקון של מידע שגוי</li>
            <li>מחיקת הנתונים שלך</li>
            <li>הגבלת הישתמש שלנו בנתונים שלך</li>
            <li>העברת הנתונים שלך לספק אחר</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">6. עוגיות</h3>
          <p className="text-foreground leading-relaxed">
            האתר משתמש בעוגיות כדי לשפר את חוויית המשתמש. אתה יכול לשלוט בעוגיות דרך הגדרות הדפדפן שלך.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">7. שינויים למדיניות זו</h3>
          <p className="text-foreground leading-relaxed">
            אנו עשויים לעדכן את מדיניות הפרטיות בכל עת. נפרסם הודעה על שינויים משמעותיים.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">8. צור קשר</h3>
          <p className="text-foreground leading-relaxed">
            אם יש לך שאלות בנוגע למדיניות זו או לתרגול הפרטיות שלנו, אנא צור קשר דרך דף יצירת הקשר באתר.
          </p>
        </section>

        <div className="bg-secondary p-6 rounded-lg mt-8">
          <p className="text-sm text-muted-foreground">
            אנו מתחייבים להגן על הפרטיות שלך. זוהי מדיניות הפרטיות שלנו בהתאם לכללי GDPR ודיני ישראל.
          </p>
        </div>
      </div>
    </div>
  );
}
