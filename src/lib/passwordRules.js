// Password rules (they match the Supabase Auth settings of this project) and plain, formal Hebrew messages
// for the errors the auth service returns. Pure helpers: no React, no network.

export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_RULES = [
  { key: 'length', label: `לפחות ${MIN_PASSWORD_LENGTH} תווים`, test: (pw) => pw.length >= MIN_PASSWORD_LENGTH },
  { key: 'lower', label: 'אות קטנה אחת לפחות באנגלית (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { key: 'upper', label: 'אות גדולה אחת לפחות באנגלית (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'digit', label: 'ספרה אחת לפחות (0-9)', test: (pw) => /[0-9]/.test(pw) },
];

/** The rules the password does not meet yet. */
export const unmetRules = (password) => PASSWORD_RULES.filter((rule) => !rule.test(String(password ?? '')));

/** '' when the password is fine, otherwise a formal message that names what is missing. */
export function passwordProblem(password) {
  const missing = unmetRules(password);
  if (missing.length === 0) return '';
  return `הסיסמה אינה עומדת בדרישות. יש לכלול: ${missing.map((rule) => rule.label).join(', ')}.`;
}

const HEBREW = /[֐-׿]/;

/**
 * A readable Hebrew message for an auth error. The service answers in English
 * ("Password should contain at least one character of each..."), which is not shown to people as it is.
 */
export function authErrorMessage(error, fallback = 'אירעה שגיאה. יש לנסות שוב.') {
  const text = String(error?.message ?? error ?? '');
  if (!text) return fallback;
  if (/password should contain|at least one character of each/i.test(text)) {
    return 'הסיסמה אינה עומדת בדרישות. יש לכלול לפחות אות קטנה באנגלית, אות גדולה באנגלית וספרה אחת.';
  }
  if (/password.*(at least|should be).*\d+ characters|weak.?password|password is too (short|weak)/i.test(text)) {
    return `הסיסמה קצרה או חלשה מדי. יש להשתמש בלפחות ${MIN_PASSWORD_LENGTH} תווים.`;
  }
  if (/new password should be different|same password|different from the old/i.test(text)) {
    return 'הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית.';
  }
  if (/already (been )?registered|already exists|user already/i.test(text)) {
    return 'כתובת הדוא"ל כבר רשומה במערכת. ניתן להתחבר, או לאפס את הסיסמה.';
  }
  if (/invalid login credentials|invalid credentials/i.test(text)) {
    return 'כתובת הדוא"ל או הסיסמה אינן נכונות. יש לבדוק ולנסות שוב.';
  }
  if (/email not confirmed/i.test(text)) {
    return 'יש לאשר את כתובת הדוא"ל לפני ההתחברות. נשלח אליך מייל אישור.';
  }
  if (/invalid email|unable to validate email|email address .*invalid|is invalid/i.test(text)) {
    return 'כתובת הדוא"ל אינה תקינה.';
  }
  if (/rate limit|too many|over_.*_rate_limit|security purposes/i.test(text)) {
    return 'בוצעו יותר מדי ניסיונות. יש לנסות שוב בעוד מספר דקות.';
  }
  if (/captcha/i.test(text)) {
    return 'אימות האבטחה נכשל. יש לנסות שוב.';
  }
  if (/failed to fetch|network|load failed/i.test(text)) {
    return 'אין חיבור לשרת. יש לבדוק את החיבור לאינטרנט ולנסות שוב.';
  }
  // a message that is already in Hebrew is kept; an unknown English one is never shown raw
  return HEBREW.test(text) ? text : fallback;
}
