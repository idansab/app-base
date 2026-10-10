import React from 'react';
import { motion } from 'motion/react';
import { Heart, Github } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-t from-slate-900 to-slate-800 text-white">
      <div className="px-4 max-w-6xl mx-auto py-12 md:py-16">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="md:col-span-1 text-right md:text-left"
          >
            <h2 className="text-2xl font-bold text-green-400 mb-2">מה יש פה?</h2>
            <p className="text-sm text-gray-400">
              פלטפורמה מקומית לגילוי מקומות בישראל
            </p>
          </motion.div>

          {/* Links */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="font-bold mb-4 text-right md:text-left">ניווט</h3>
            <ul className="space-y-2 text-sm text-gray-400 text-right md:text-left">
              <li><a href="/" className="hover:text-green-400 transition-colors">בית</a></li>
              <li><a href="/trips" className="hover:text-green-400 transition-colors">מסלולים</a></li>
              <li><a href="/surprise" className="hover:text-green-400 transition-colors">הפתעה</a></li>
              <li><a href="/about" className="hover:text-green-400 transition-colors">אודות</a></li>
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-bold mb-4 text-right md:text-left">משפטי</h3>
            <ul className="space-y-2 text-sm text-gray-400 text-right md:text-left">
              <li><a href="/privacy" className="hover:text-green-400 transition-colors">מדיניות פרטיות</a></li>
              <li><a href="/terms" className="hover:text-green-400 transition-colors">תנאי שימוש</a></li>
              <li><a href="/cookies" className="hover:text-green-400 transition-colors">מדיניות Cookie</a></li>
              <li><a href="/accessibility" className="hover:text-green-400 transition-colors">הצהרת נגישות</a></li>
            </ul>
          </motion.div>

          {/* Social */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="font-bold mb-4 text-right md:text-left">עקוב</h3>
            <div className="flex gap-3 justify-end md:justify-start">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-700 rounded-full hover:bg-green-600 transition-colors"
              >
                📷
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-700 rounded-full hover:bg-green-600 transition-colors"
              >
                f
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-700 rounded-full hover:bg-green-600 transition-colors"
              >
                <Github size={18} />
              </a>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700 mb-8" />

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-400"
        >
          <div className="flex items-center gap-2 order-2 md:order-1 mt-4 md:mt-0">
            <span>בנוי בשמחה עם</span>
            <Heart size={16} className="text-red-500 fill-red-500" />
            <span>עבור קהילת ישראל 🇮🇱</span>
          </div>
          <div className="text-right md:text-left order-1 md:order-2">
            <p>&copy; {currentYear} מה יש פה? כל הזכויות שמורות.</p>
            <p className="mt-1 text-xs">
              חלק מהמקומות מבוססים על נתונים של{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                © תורמי OpenStreetMap
              </a>{' '}
              (רישיון ODbL) ·{' '}
              <a
                href="https://overturemaps.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                Overture Maps
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
