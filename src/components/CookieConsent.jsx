import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { analyticsEnabled, getConsent, setConsent, trackPageView } from '@/lib/analytics';

/** Analytics consent banner + SPA page-view tracking. Renders nothing if GA is not configured. */
export default function CookieConsent() {
  const location = useLocation();
  const [choice, setChoice] = useState(getConsent());

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  if (!analyticsEnabled || choice) return null;

  const decide = (value) => {
    setConsent(value);
    setChoice(value);
  };

  return (
    <div
      role="dialog"
      aria-label="הסכמה לניתוח תנועה"
      className="fixed bottom-20 inset-x-3 z-[60] max-w-md mx-auto bg-card border border-border rounded-2xl p-4 shadow-lg text-right"
    >
      <p className="text-sm text-foreground leading-relaxed">
        אנחנו משתמשים ב-Google Analytics כדי להבין איך משתמשים באתר ולשפר אותו. הכלי פועל רק באישורך.{' '}
        <Link to="/cookies" className="text-primary underline">פרטים נוספים</Link>
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => decide('granted')}
          className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium"
        >
          מאשר
        </button>
        <button
          onClick={() => decide('denied')}
          className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium"
        >
          לא תודה
        </button>
      </div>
    </div>
  );
}
