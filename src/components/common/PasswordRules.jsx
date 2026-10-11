import React from 'react';
import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '@/lib/passwordRules';

/** The password requirements, ticked off while the user types. */
export default function PasswordRules({ password, className = '' }) {
  const value = String(password ?? '');
  return (
    <div className={`text-right ${className}`}>
      <p className="mb-1 text-xs font-medium text-muted-foreground">הסיסמה צריכה לכלול:</p>
      <ul className="space-y-1" aria-live="polite">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.key} className={`flex items-center justify-start gap-2 text-xs ${ok ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
              {ok ? <Check size={14} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" />}
              <span>{rule.label}</span>
              <span className="sr-only">{ok ? '(התקיים)' : '(טרם התקיים)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
