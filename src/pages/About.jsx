import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Users, MapPin, Zap, Mail, MessageSquare } from 'lucide-react';

export default function About() {
  const faqs = [
    {
      q: 'מה זו אפליקציית מה יש פה?',
      a: 'אפליקציה לגילוי מקומות מקומיים בישראל - מעיינות, קפה, טבע, בילוי ועוד. כל המקומות מדווחים על ידי הקהילה.',
    },
    {
      q: 'איך אני יכול להוסיף מקום?',
      a: 'לחץ על כפתור + בתחתית המסך וקלידו "המלץ על מקום". אם אתה רוצה שדרוג מהיר, השתמש בסטודיו תוכן.',
    },
    {
      q: 'האם זה פועל באופליין?',
      a: 'כן! המקומות שכבר צפית בהם נשמרים במטמון המקומי. כשחוזר קשר, הנתונים מתעדכנים.',
    },
    {
      q: 'כמה עולה?',
      a: 'זה בחינם לגמרי! אנחנו עומדים על הקהילה ולא על מודל תשלום.',
    },
    {
      q: 'איך משתפים מקום עם חברים?',
      a: 'בפתיחת מקום, לחץ על כפתור שיתוף. אפשר לשלוח דרך Whatsapp, SMS, או להעתיק לינק.',
    },
    {
      q: 'איך מוחקים מקום שגוי?',
      a: 'לחץ על מקום, גלול למטה ולחץ דיווח בעיה. המשקיפים שלנו יבדקו ויתקנו.',
    },
  ];

  const features = [
    { icon: MapPin, title: 'גילוי מקומי', desc: 'חפש מקומות קרוב לך או בכל מקום בארץ' },
    { icon: Users, title: 'קהילה', desc: 'טיפים וביקורות מאנשים כמוך' },
    { icon: Zap, title: 'מהיר', desc: 'ממשק נקי וקל לשימוש' },
    { icon: Sparkles, title: 'מסלולים', desc: 'מסלולים מעוצבים או בנה שלך' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-green-50 to-slate-50 pt-12 pb-8 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-green-600 mb-2">מה יש פה?</h1>
          <p className="text-gray-600 text-lg">
            פלטפורמה מקומית חכמה לגילוי מקומות בישראל
          </p>
        </motion.div>
      </div>

      <div className="px-4 max-w-2xl mx-auto py-8 space-y-8">
        {/* Story */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-8 border border-gray-200 text-right"
        >
          <h2 className="text-2xl font-bold text-green-600 mb-4">הסיפור שלנו</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            יצרנו את "מה יש פה?" כי חיפוש אחרי מקומות טובים בישראל היה קשה. בין Google Maps לרשתות חברתיות, לא היה מקום אחד כדי למצוא מקומות מסתתרים.
          </p>
          <p className="text-gray-700 leading-relaxed">
            בנינו פלטפורמה שקהילה של מטיילים, גולשים וחוקרים יוצרים יחד. כל טיפ, כל דיווח, כל ביקורת היא מתנה לקהילה.
          </p>
        </motion.section>

        {/* Features Grid */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-green-600 mb-4 text-right">למה אתה תאהב אתנו</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="bg-white p-6 rounded-2xl border border-gray-200 text-right"
                >
                  <Icon size={28} className="text-green-600 mb-3 ml-auto" />
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-green-600 mb-4 text-right">שאלות נפוצות</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="bg-white p-6 rounded-2xl border border-gray-200 text-right"
              >
                <h3 className="font-bold text-green-600 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-700">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Contact */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-right border-2 border-green-200"
        >
          <h2 className="text-2xl font-bold text-green-600 mb-4">צור איתנו קשר</h2>
          <p className="text-gray-700 mb-6">יש לך הערה? שאלה? בואו לדבר!</p>

          <div className="space-y-3">
            <button className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors">
              <Mail size={20} className="text-green-600 ml-auto" />
              <div className="flex-1 text-right">
                <p className="font-medium">דוא"ל</p>
                <p className="text-sm text-gray-600">hello@mayhishpo.com</p>
              </div>
            </button>

            <button className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors">
              <MessageSquare size={20} className="text-green-600 ml-auto" />
              <div className="flex-1 text-right">
                <p className="font-medium">Feedback</p>
                <p className="text-sm text-gray-600">שתף דעה או תוכיח</p>
              </div>
            </button>
          </div>
        </motion.section>

        {/* Version */}
        <div className="text-center text-xs text-gray-500 py-4">
          <p>מה יש פה? v1.0.0</p>
          <p>בנוי בשמחה עבור קהילת המטיילים בישראל 🇮🇱</p>
        </div>
      </div>
    </div>
  );
}
