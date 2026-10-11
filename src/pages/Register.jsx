import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import Turnstile, { TURNSTILE_SITE_KEY } from '@/components/common/Turnstile';
import PasswordRules from '@/components/common/PasswordRules';
import { authErrorMessage, passwordProblem } from '@/lib/passwordRules';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('יש לאשר את התקנון ומדיניות הפרטיות ואת הגיל (18 ומעלה) כדי להירשם.');
      return;
    }

    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות שהוזנו אינן תואמות.');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email, password, captcha);
      setError('');
      if (result?.session) {
        // Email confirmation disabled: already signed in
        navigate('/');
      } else {
        setNeedsConfirmation(true);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setCaptchaReset((n) => n + 1);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow border border-border p-8">
        <h1 className="text-2xl font-bold mb-6 text-foreground">הרשמה</h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {needsConfirmation && (
          <div role="status" className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded mb-4">
            נשלח אליך מייל אימות. אשר את הכתובת ואז{' '}
            <button type="button" onClick={() => navigate('/login')} className="underline font-medium">
              התחבר
            </button>
            .
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              אימייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-background text-foreground"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-background text-foreground"
              required
              autoComplete="new-password"
            />
            <PasswordRules password={password} className="mt-2" />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
              אישור סיסמה
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-background text-foreground"
              required
              autoComplete="new-password"
            />
          </div>

          <label className="flex items-start gap-2 text-right text-sm text-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-green-600"
              required
            />
            <span>
              אני בן/בת 18 ומעלה, קראתי ואני מסכים/ה ל
              <Link to="/terms" target="_blank" className="text-primary underline">תקנון השימוש</Link>
              {' '}ול
              <Link to="/privacy" target="_blank" className="text-primary underline">מדיניות הפרטיות</Link>.
            </span>
          </label>

          <Turnstile onToken={setCaptcha} resetKey={captchaReset} />

          <button
            type="submit"
            disabled={loading || !agreed || (TURNSTILE_SITE_KEY && !captcha)}
            className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'יוצר חשבון...' : 'הירשם'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            כבר יש לך חשבון?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary hover:underline font-medium"
            >
              התחבר
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
