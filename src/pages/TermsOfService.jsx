import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function TermsOfService() {
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
          <h1 className="text-xl font-bold">תקנון השימוש</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-4xl mx-auto py-8 space-y-6 text-right">
        <section>
          <h2 className="text-2xl font-bold mb-4">תקנון השימוש באתר מה יש פה?</h2>
          <p className="text-muted-foreground mb-4">
            עדכון אחרון: אוקטובר 2026
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">1. הגדרות בסיסיות</h3>
          <p className="text-foreground leading-relaxed">
            "האתר" - פלטפורמת גילוי מקומות בישראל "מה יש פה?"<br/>
            "המשתמש" - כל אדם המשתמש באתר<br/>
            "תוכן" - כל המידע, הודעות, ההערות וההמלצות שפורסמו באתר
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">2. כללי הימורים והתנהגות</h3>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>אסור להעלות תוכן פוגעני, גנאי או מטריד</li>
            <li>אסור להעלות תוכן המפר זכויות יוצרים או קניין רוחני</li>
            <li>אסור להשתמש באתר לטעמי טרדה או הטרדה</li>
            <li>אסור להתחזות לאדם אחר או לפרסם מידע כוזב</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">3. הגבלת אחריות</h3>
          <p className="text-foreground leading-relaxed">
            האתר מסופק "כמו שהוא" ללא כל אחריות. בעל האתר לא אחראי לנזקים כלשהם שנגרמו בשל שימוש באתר, כולל:
          </p>
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>שגיאות או אי-דיוקים במידע</li>
            <li>נזקים הנובעים מהסתמכות על המידע</li>
            <li>הפרות של זכויות צד שלישי</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">4. זכויות יוצרים</h3>
          <p className="text-foreground leading-relaxed">
            כל התוכן באתר שפורסם על ידי המשתמשים הוא בעלות המשתמש. על ידי פרסום תוכן באתר, המשתמש מעניק לאתר רישיון רחב להשתמש בו, להציגו, ולשתף אותו.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">5. ביטול חשבון</h3>
          <p className="text-foreground leading-relaxed">
            המשתמש יכול לבקש למחוק את חשבונו בכל עת. בעל האתר יכול להסיר חשבון בו זמנית אם המשתמש משבור את התקנון.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">6. שינויים לתקנון</h3>
          <p className="text-foreground leading-relaxed">
            בעל האתר רשאי לשנות את התקנון בכל עת. השימוש המתמשך באתר לאחר שינוי מהווה הסכמה לתקנון החדש.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">7. סמכות שיפוט</h3>
          <p className="text-foreground leading-relaxed">
            תקנון זה כפוף לחוקי מדינת ישראל. כל סכסוך יוגש בבתי המשפט בתל אביב.
          </p>
        </section>

        <div className="bg-secondary p-6 rounded-lg mt-8">
          <p className="text-sm text-muted-foreground">
            אם יש לך שאלות בנוגע לתקנון זה, אנא צור קשר דרך דף יצירת הקשר באתר.
          </p>
        </div>
      </div>
    </div>
  );
}
