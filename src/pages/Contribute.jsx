import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const CATEGORIES = [
  { id: 'food', label: 'אוכל ושתייה', icon: '🍽️' },
  { id: 'nature', label: 'טבע וטיולים', icon: '🏞️' },
  { id: 'nightlife', label: 'חיי לילה', icon: '🌙' },
  { id: 'shopping', label: 'קניות ושווקים', icon: '🛍️' },
  { id: 'culture', label: 'תרבות ואמנות', icon: '🎨' },
];

export default function Contribute() {
  const [formData, setFormData] = useState({
    name: '',
    category: 'nature',
    city: '',
    address: '',
    lat: '',
    lng: '',
    description: '',
    image_url: '',
    phone: '',
    opening_hours: '24/7',
  });

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, image_url: event.target?.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setErrorMessage('');

    try {
      if (!formData.name || !formData.address || !formData.category) {
        setErrorMessage('נא למלא את השדות החובה: שם, כתובת וקטגוריה');
        setStatus('error');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        lat: parseFloat(formData.lat) || 31.7683,
        lng: parseFloat(formData.lng) || 35.2137,
        status: 'pending',
        created_by_id: 'user',
        tags: [formData.category],
      };

      const response = await fetch(`${API_BASE}/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus('success');
        setFormData({
          name: '',
          category: 'nature',
          city: '',
          address: '',
          lat: '',
          lng: '',
          description: '',
          image_url: '',
          phone: '',
          opening_hours: '24/7',
        });
        setImageFile(null);

        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'שגיאה בשליחת הטופס');
        setStatus('error');
      }
    } catch (err) {
      setErrorMessage(err.message || 'שגיאה בחיבור לשרת');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            שתף מקום אהוב
          </h1>
          <p className="text-lg text-slate-600">
            עזור לקהילה לגלות מקומות חדשים ומרהיבים בישראל
          </p>
        </motion.div>

        {/* Success Message */}
        <AnimatePresence>
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3"
            >
              <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-semibold text-green-900">המקום נשלח בהצלחה!</p>
                <p className="text-sm text-green-800">מנהל האתר יסקור אותו בקרוב</p>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3"
            >
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-semibold text-red-900">שגיאה</p>
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 space-y-6"
        >
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              שם המקום *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="למשל: נחל הקישון"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              קטגוריה *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                  className={`p-3 rounded-xl border-2 transition-all text-right ${
                    formData.category === cat.id
                      ? 'border-green-600 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-sm font-medium">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              כתובת *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="שם הרחוב ומספר"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              עיר
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="למשל: תל אביב"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                קו רוחב (Lat)
              </label>
              <input
                type="number"
                name="lat"
                value={formData.lat}
                onChange={handleInputChange}
                placeholder="31.7683"
                step="0.0001"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                קו אורך (Lng)
              </label>
              <input
                type="number"
                name="lng"
                value={formData.lng}
                onChange={handleInputChange}
                placeholder="35.2137"
                step="0.0001"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              תיאור
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="ספר לנו על המקום - מה מיוחד בו? מה אפשר לעשות שם?"
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right resize-none focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              תמונה
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-input"
              />
              <label
                htmlFor="image-input"
                className="flex items-center justify-center w-full p-8 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-green-600 transition-colors"
              >
                <div className="text-center">
                  <Upload className="mx-auto mb-2 text-slate-400" size={32} />
                  <p className="text-sm text-slate-600">
                    {imageFile ? 'תמונה נבחרה' : 'גרור תמונה או לחץ כאן'}
                  </p>
                </div>
              </label>
              {imageFile && (
                <div className="mt-4 w-full h-48 rounded-xl overflow-hidden">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Phone & Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                טלפון
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="0XX-XXXXXXX"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                שעות פתיחה
              </label>
              <input
                type="text"
                name="opening_hours"
                value={formData.opening_hours}
                onChange={handleInputChange}
                placeholder="24/7"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                שליחה...
              </>
            ) : (
              <>
                <MapPin size={20} />
                שלח מקום
              </>
            )}
          </button>

          <p className="text-sm text-slate-600 text-center">
            המקום יישלח לאישור מנהל האתר לפני שיופיע בחיפוש
          </p>
        </motion.form>
      </div>
    </div>
  );
}
