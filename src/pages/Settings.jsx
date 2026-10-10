import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Sun, Lock, HelpCircle, Trash2, LogOut, LogIn, X, Store, ChevronLeft } from 'lucide-react';
import useOwnerOverview from '@/hooks/useOwnerOverview';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function Settings() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, signOut, changePassword, deleteAccount } = useAuth();
  // the entry only exists for users who are approved owners of a business
  const { hasApproved, unseen } = useOwnerOverview();
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const closePasswordModal = () => {
    setChangePasswordOpen(false);
    setPwForm({ current: '', next: '', confirm: '' });
    setPwError('');
    setPwSuccess(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.next.length < 8) {
      setPwError('הסיסמה החדשה חייבת להיות לפחות 8 תווים');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('הסיסמאות החדשות לא תואמות');
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwSuccess(true);
      setTimeout(closePasswordModal, 1500);
    } catch (err) {
      setPwError(err.message || 'שגיאה בשינוי הסיסמה');
    } finally {
      setPwLoading(false);
    }
  };
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      setDeleteOpen(false);
      navigate('/');
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-20 py-4">
        <div className="px-4 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-right text-primary">הגדרות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-2xl mx-auto py-6 space-y-6">
        {/* Display Settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h2 className="font-bold text-lg text-right mb-4 text-foreground">מראה</h2>

          {/* Dark Mode */}
          <motion.div
            className="flex items-center justify-between p-4 bg-secondary rounded-lg mb-3"
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <motion.label className="flex items-center gap-3 cursor-pointer">
              <motion.div
                key={isDark ? 'dark' : 'light'}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                {isDark ? (
                  <Moon size={20} className="text-primary" />
                ) : (
                  <Sun size={20} className="text-yellow-500" />
                )}
              </motion.div>
              <motion.span className="font-medium text-foreground">
                {isDark ? 'מצב לילה' : 'מצב יום'}
              </motion.span>
            </motion.label>
            <motion.button
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-colors ${
                isDark ? 'bg-primary' : 'bg-gray-300'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className={`w-5 h-5 bg-white rounded-full ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Privacy & Security */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h2 className="font-bold text-lg text-right mb-4 text-foreground">פרטיות ואבטחה</h2>

          {isAuthenticated && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={() => setChangePasswordOpen(true)}
              className="w-full p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-between text-right mb-3 text-foreground"
            >
              <Lock size={20} className="text-muted-foreground" />
              <span className="font-medium">שנה סיסמה</span>
            </motion.button>
          )}

          <motion.button
            onClick={() => setPrivacyOpen(true)}
            className="w-full p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-between text-right text-foreground"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <HelpCircle size={20} className="text-muted-foreground" />
            <span className="font-medium">מדיניות פרטיות</span>
          </motion.button>

          {isAuthenticated && (
            <motion.button
              onClick={() => { setDeleteError(''); setDeleteOpen(true); }}
              className="w-full p-4 mt-3 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors flex items-center justify-between text-right"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 size={20} />
              <span className="font-medium">מחיקת החשבון שלי</span>
            </motion.button>
          )}
        </motion.div>

        {/* My business: visible only to approved owners */}
        {isAuthenticated && hasApproved && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            onClick={() => navigate('/my-business')}
            className="w-full flex items-center justify-between gap-3 bg-card rounded-2xl p-5 border border-border hover:bg-secondary/60 transition-colors text-right"
          >
            <ChevronLeft size={20} className="text-muted-foreground" />
            <span className="flex items-center gap-3 flex-1 justify-end">
              {unseen > 0 && (
                <span
                  className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white"
                  aria-label={`${unseen} עדכונים חדשים`}
                >
                  {unseen} חדש
                </span>
              )}
              <span>
                <span className="block font-bold text-foreground">העסקים שלי</span>
                <span className="block text-xs text-muted-foreground">עריכה, נתונים וסטטוס בקשות</span>
              </span>
              <Store size={22} className="text-primary" />
            </span>
          </motion.button>
        )}

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h2 className="font-bold text-lg text-right mb-4 text-foreground">אודות</h2>

          <div className="space-y-3 text-right">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">גרסה</span>
              <span className="font-medium text-foreground">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">שם האפליקציה</span>
              <span className="font-medium text-foreground">מה יש פה?</span>
            </div>
          </div>
        </motion.div>

        {/* Login/Logout Button */}
        {isAuthenticated ? (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={signOut}
            className="w-full p-4 bg-destructive/10 text-destructive rounded-2xl font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut size={20} />
            התנתקות
          </motion.button>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => navigate('/login')}
            className="w-full p-4 bg-primary text-white rounded-2xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogIn size={20} />
            התחברות
          </motion.button>
        )}

        <ConfirmDialog
          isOpen={deleteOpen}
          variant="danger"
          isDangerous
          title="מחיקת החשבון"
          message={deleteError || 'החשבון והנתונים האישיים שלך (מועדפים, טיולים, טיפים ודיווחים) יימחקו לצמיתות. אי אפשר לשחזר.'}
          confirmText="מחק לצמיתות"
          isLoading={deleting}
          onConfirm={handleDeleteAccount}
          onCancel={() => setDeleteOpen(false)}
        />
      </div>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {privacyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end z-50"
            onClick={() => setPrivacyOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-card rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setPrivacyOpen(false)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X size={24} className="text-foreground" />
                </button>
                <h2 className="text-xl font-bold text-foreground">מדיניות פרטיות</h2>
                <div className="w-10" />
              </div>

              <div className="space-y-4 text-right text-foreground">
                <p className="text-sm text-muted-foreground">
                  אנחנו שומרים על פרטיותך ואבטחת המידע שלך בחשיבות רבה.
                </p>

                <h3 className="font-semibold text-lg mt-6">אפליקציה מה יש פה</h3>
                <p className="text-sm text-muted-foreground">
                  פלטפורמה זו מוקדשת לשיתוף מקומות בישראל עם קהילה של חוקרים ותייירים. אנחנו לא שומרים מידע אישי שלא נחוץ לפעולת האפליקציה.
                </p>

                <h3 className="font-semibold text-lg mt-4">מידע שאנחנו אוספים</h3>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  <li>כתובת דוא"ל (להתחברות בלבד)</li>
                  <li>מקום גיאוגרפי (אם אישרת)</li>
                  <li>תוכן שאתה משתף</li>
                </ul>

                <h3 className="font-semibold text-lg mt-4">איך אנחנו משתמשים במידע</h3>
                <p className="text-sm text-muted-foreground">
                  המידע שלך משמש לשיתוף מקומות, תיקיית פרטיות בחשבון שלך, וחיפוש לפי מיקום. אנחנו לא משתפים את המידע שלך עם צד שלישי.
                </p>

                <h3 className="font-semibold text-lg mt-4">איתור וקבלת החלטות אוטומטיות</h3>
                <p className="text-sm text-muted-foreground">
                  אנחנו משתמשים במידע המיקום שלך כדי להראות לך מקומות קרובים. אתה יכול לכבות זאת בכל עת בהגדרות המקום שלך.
                </p>

                <h3 className="font-semibold text-lg mt-4">זכויות המשתמש</h3>
                <p className="text-sm text-muted-foreground">
                  אתה יכול לבקש להוריד את הנתונים שלך או למחוק את החשבון שלך בכל עת. צור קשר: info@example.com
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {changePasswordOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end z-50"
            onClick={closePasswordModal}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-card rounded-t-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={closePasswordModal}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X size={24} className="text-foreground" />
                </button>
                <h2 className="text-xl font-bold text-foreground">שנה סיסמה</h2>
                <div className="w-10" />
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {pwError && (
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">{pwError}</p>
                )}
                {pwSuccess && (
                  <p role="status" className="text-sm text-green-600 dark:text-green-400">הסיסמה עודכנה בהצלחה</p>
                )}
                {[
                  ['current', 'סיסמה נוכחית', 'current-password'],
                  ['next', 'סיסמה חדשה', 'new-password'],
                  ['confirm', 'אשר סיסמה חדשה', 'new-password'],
                ].map(([key, label, autoComplete]) => (
                  <div key={key}>
                    <label htmlFor={`pw-${key}`} className="block text-sm font-medium text-foreground mb-2">{label}</label>
                    <input
                      id={`pw-${key}`}
                      type="password"
                      value={pwForm[key]}
                      onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                      autoComplete={autoComplete}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={pwLoading || pwSuccess}
                  className="w-full p-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors mt-6"
                >
                  {pwLoading ? 'מעדכן...' : 'שנה סיסמה'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
