import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Trash2, Loader2, ChevronDown, MapPin, ImageIcon, FileText, Clock } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const CATEGORIES = [
  { id: 'coffee_food', label: 'עגלות קפה ואוכל' },
  { id: 'trips', label: 'טיולים' },
  { id: 'nightlife', label: 'חיי לילה' },
  { id: 'shopping', label: 'שווקים וקניות' },
  { id: 'culture', label: 'תרבות' },
];

const FormSection = ({ title, icon: Icon, isOpen, onToggle, children }) => (
  <motion.div
    layout
    className="border border-slate-200 rounded-2xl overflow-hidden"
  >
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 transition-colors text-right"
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className="text-green-600" />
        <span className="font-semibold text-gray-900">{title}</span>
      </div>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <ChevronDown size={20} className="text-gray-600" />
      </motion.div>
    </button>

    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="border-t border-slate-200 px-6 py-6 bg-white space-y-6"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const FormInput = ({ label, helper, error, ...props }) => (
  <div className="text-right">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    {helper && <p className="text-xs text-gray-500 mb-2">{helper}</p>}
    <input
      {...props}
      className={`w-full px-4 py-3 border rounded-2xl text-right focus:outline-none focus:ring-2 transition-all ${
        error
          ? 'border-red-300 focus:ring-red-600 bg-red-50'
          : 'border-gray-300 focus:ring-green-600'
      }`}
    />
    {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
  </div>
);

export default function PlaceForm({ place, onSave, onDelete, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'coffee_food',
    city: '',
    address: '',
    lat: 0,
    lng: 0,
    description: '',
    short_description: '',
    image_url: '',
    rating: 4.5,
    opening_hours: '09:00-17:00',
    phone: '',
    tags: '',
    ...place,
  });

  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [openSections, setOpenSections] = useState({
    basics: true,
    visuals: false,
    details: false,
    operations: false,
  });

  useEffect(() => {
    if (place) setFormData(place);
  }, [place]);

  const handleAutoGeocode = async () => {
    if (!formData.address) return;
    setGeocoding(true);
    try {
      // Using local geocoding since we don't have a backend
      // In production, you might use Google Maps API or Nominatim
      const result = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formData.address)}&format=json&limit=1`)
        .then(r => r.json());
      if (result?.[0]) {
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(result[0].lat),
          lng: parseFloat(result[0].lon)
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        ...formData,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        category: formData.category,
        created_by_id: user?.id,
      };

      if (place?.id) {
        const { data, error } = await supabase
          .from('places')
          .update(payload)
          .eq('id', place.id)
          .select();
        if (error) throw error;
        onSave?.(data?.[0]);
      } else {
        const { data, error } = await supabase
          .from('places')
          .insert([payload])
          .select();
        if (error) throw error;
        onSave?.(data?.[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!place?.id || !confirm('בטוח שרוצה למחוק?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', place.id);
      if (error) throw error;
      onDelete?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Form Progress Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <p className="text-xs font-semibold text-gray-600 mb-3">התקדמות</p>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <motion.div
            layoutId="progress"
            className="h-full bg-green-600 rounded-full"
            style={{
              width: `${((Object.values(openSections).filter(Boolean).length || 1) / 4) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* SECTION 1: Basics */}
      <FormSection
        title="📍 מידע בסיסי"
        icon={MapPin}
        isOpen={openSections.basics}
        onToggle={() => toggleSection('basics')}
      >
        <FormInput
          label="שם המקום"
          helper="זהו השם שיופיע בחיפוש"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="לדוגמה: אגם עוצ'קי"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריה</label>
          <p className="text-xs text-gray-500 mb-2">בחר את הסוג המתאים ביותר</p>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">כתובת</label>
          <p className="text-xs text-gray-500 mb-2">הכנס כתובת דויקת - לחץ "זיהוי" לקבלת קואורדינטות</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="כתובת המקום"
            />
            <motion.button
              onClick={handleAutoGeocode}
              disabled={geocoding}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-3 bg-green-100 text-green-600 rounded-2xl hover:bg-green-200 transition-colors disabled:opacity-50 font-medium"
            >
              {geocoding ? <Loader2 size={20} className="animate-spin" /> : 'זיהוי'}
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="קו רוחב"
            type="number"
            step="0.0001"
            value={formData.lat}
            onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
          />
          <FormInput
            label="קו אורך"
            type="number"
            step="0.0001"
            value={formData.lng}
            onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
          />
        </div>
      </FormSection>

      {/* SECTION 2: Visuals */}
      <FormSection
        title="🖼️ תמונות ותיאור"
        icon={ImageIcon}
        isOpen={openSections.visuals}
        onToggle={() => toggleSection('visuals')}
      >
        <FormInput
          label="URL של תמונה"
          helper="הכנס קישור מלא לתמונה (https://...)"
          type="url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />

        {formData.image_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl overflow-hidden border border-slate-200"
          >
            <img
              src={formData.image_url}
              alt="preview"
              className="w-full h-48 object-cover"
              onError={() => console.log('Image failed to load')}
            />
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">תיאור קצר</label>
          <p className="text-xs text-gray-500 mb-2">תיאור בשורה אחת (עד 150 תווים)</p>
          <input
            type="text"
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
            maxLength="150"
            placeholder="תיאור בקצרה..."
          />
          <p className="text-xs text-gray-500 mt-2 text-left">
            {formData.short_description.length}/150 תווים
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">תיאור מלא</label>
          <p className="text-xs text-gray-500 mb-2">תיאור מפורט של המקום</p>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
            rows={5}
            placeholder="תיאור מלא של המקום..."
          />
        </div>
      </FormSection>

      {/* SECTION 3: Details */}
      <FormSection
        title="📝 פרטים"
        icon={FileText}
        isOpen={openSections.details}
        onToggle={() => toggleSection('details')}
      >
        <FormInput
          label="דירוג"
          helper="דירוג מ-0 עד 5"
          type="number"
          min="0"
          max="5"
          step="0.1"
          value={formData.rating}
          onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
        />

        <FormInput
          label="טלפון"
          helper="מספר טלפון לפניה לעת הצורך"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="050-0000000"
        />

        <FormInput
          label="תגיות"
          helper="הפרדת תגיות בפסיקים (דוגמה: יוקי, משפחה, טבע)"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="תגיות מופרדות בפסיקים"
        />
      </FormSection>

      {/* SECTION 4: Operations */}
      <FormSection
        title="⏰ פעילות"
        icon={Clock}
        isOpen={openSections.operations}
        onToggle={() => toggleSection('operations')}
      >
        <FormInput
          label="שעות פתיחה"
          helper="פורמט: HH:MM-HH:MM (לדוגמה: 09:00-17:00)"
          value={formData.opening_hours}
          onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
          placeholder="09:00-17:00"
        />

        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-right">
          <p className="text-sm text-green-700">
            <span className="font-semibold">טיפ:</span> אתה יכול להשתמש ב"זיהוי" בסעיף "מידע בסיסי" כדי לקבל את הקואורדינטות המדוייקות של המקום.
          </p>
        </div>
      </FormSection>

      {/* Actions */}
      <motion.div
        layout
        className="flex gap-3 pt-6 border-t border-gray-200"
      >
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
        >
          ביטול
        </button>

        {place?.id && (
          <motion.button
            onClick={handleDelete}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 px-4 py-3 bg-red-100 text-red-700 rounded-2xl font-medium hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            מחיקה
          </motion.button>
        )}

        <motion.button
          onClick={handleSave}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save size={18} />
              שמור
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
