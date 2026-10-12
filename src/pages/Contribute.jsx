import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Upload, CheckCircle, AlertCircle, Crosshair, Loader2 } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import AmenitiesField from '@/components/places/AmenitiesField';
import HoursEditor from '@/components/admin/places/HoursEditor';
import useUserLocation from '@/hooks/useUserLocation';
import { geocodeAddress, reverseGeocodeAddress } from '@/lib/geo';
import { uploadPlaceImage, validateImageFile } from '@/lib/uploadPlaceImage';
import { contributionProblem, hoursFields, insideIsrael } from '@/lib/contributeForm';

const CATEGORIES = [
  { id: 'carts', hint: 'רק פוד טראקים ועגלות קפה', label: 'עגלות קפה ופוד טראקים', icon: '☕' },
  { id: 'food', hint: 'מסעדות, בתי קפה ומאפיות (לא עגלות)', label: 'אוכל', icon: '🍽️' },
  { id: 'nature', label: 'טבע וטיולים', icon: '🏞️' },
  { id: 'nightlife', label: 'חיי לילה', icon: '🌙' },
  { id: 'shopping', label: 'קניות ושווקים', icon: '🛍️' },
  { id: 'culture', label: 'תרבות ואמנות', icon: '🎨' },
  { id: 'attractions', label: 'אטרקציות', icon: '🎢' },
];

export default function Contribute() {
  const [formData, setFormData] = useState({
    name: '',
    category: 'nature',
    city: '',
    address: '',
    description: '',
    phone: '',
    amenities: [],
  });

  const { request: requestLocation } = useUserLocation();
  const [schedule, setSchedule] = useState(null); // structured opening hours (null = unknown)
  const [position, setPosition] = useState(null); // { lat, lng } taken from the phone
  const [locating, setLocating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'address') setPosition(null);
  };

  // free the preview URL when it is replaced or the page closes
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const useMyPosition = async () => {
    setLocating(true);
    setErrorMessage('');
    setStatus(null);
    const coords = await requestLocation();
    if (!coords || !insideIsrael(coords.lat, coords.lng)) {
      setLocating(false);
      setErrorMessage(coords ? 'המיקום שלך נמצא מחוץ לישראל.' : 'לא הצלחנו לקבל את המיקום. אשר גישה למיקום בדפדפן, או כתוב כתובת.');
      setStatus('error');
      return;
    }
    setPosition(coords);
    const found = await reverseGeocodeAddress(coords.lat, coords.lng);
    setFormData(prev => ({
      ...prev,
      city: prev.city || found?.city || '',
      address: prev.address || found?.address || '',
    }));
    setLocating(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setErrorMessage(problem);
      setStatus('error');
      return;
    }
    setStatus(null);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setErrorMessage('');

    try {
      const problem = contributionProblem({
        name: formData.name,
        category: formData.category,
        address: formData.address,
        hasPosition: Boolean(position),
        schedule,
      });
      if (problem) {
        setErrorMessage(problem);
        setStatus('error');
        setLoading(false);
        return;
      }

      // the position: from the phone, or looked up on the map from the address
      let coords = position;
      if (!coords) {
        const found = await geocodeAddress(`${formData.address.trim()}, ${formData.city.trim()}, ישראל`.replace(/,\s*,/g, ','));
        if (!found || !insideIsrael(found.lat, found.lng)) {
          setErrorMessage('לא הצלחנו לאתר את הכתובת במפה. נסה לכתוב אותה במלואה (רחוב ומספר, עיר), או לחץ על "המקום נמצא איפה שאני עכשיו".');
          setStatus('error');
          setLoading(false);
          return;
        }
        coords = { lat: found.lat, lng: found.lng };
      }

      // the photo goes to our own storage; the place only keeps its address
      const images = imageFile ? [await uploadPlaceImage(imageFile)] : [];

      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        city: formData.city.trim() || null,
        address: formData.address.trim() || formData.city.trim() || 'מיקום שסומן בטלפון',
        lat: coords.lat,
        lng: coords.lng,
        description: formData.description.trim() || null,
        phone: formData.phone.trim() || null,
        amenities: formData.amenities,
        images,
        ...hoursFields(schedule),
        status: 'pending',
        created_by_id: user?.id,
      };

      const { data, error } = await supabase
        .from('places')
        .insert([payload])
        .select();

      if (!error && data) {
        setStatus('success');
        setFormData({
          name: '',
          category: 'nature',
          city: '',
          address: '',
          description: '',
          phone: '',
          amenities: [],
        });
        setSchedule(null);
        setPosition(null);
        setPreviewUrl('');
        setImageFile(null);

        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setErrorMessage(error?.message?.includes('rate limit') ? 'שלחת הרבה בזמן קצר. נסה שוב מאוחר יותר.' : (error?.message || 'שגיאה בשליחת הטופס'));
        setStatus('error');
      }
    } catch (err) {
      console.error('Contribute error:', err);
      setErrorMessage(err.message || 'שגיאה בחיבור לשרת');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background py-12 px-4 dark:from-amber-950/40">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">
            שתף מקום אהוב
          </h1>
          <p className="text-lg text-muted-foreground">
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
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 dark:bg-green-950/40 dark:border-green-800"
            >
              <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-300">המקום נשלח בהצלחה!</p>
                <p className="text-sm text-green-800 dark:text-green-300">מנהל האתר יסקור אותו בקרוב</p>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 dark:bg-red-950/40 dark:border-red-800"
            >
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-300">שגיאה</p>
                <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card rounded-3xl shadow-xl p-8 space-y-6"
        >
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              שם המקום *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="למשל: נחל הקישון"
              className="w-full px-4 py-3 border border-border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
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
                      ? 'border-green-600 bg-green-50 dark:bg-green-950/40'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-sm font-medium">{cat.label}</div>
                  {cat.hint && <div className="mt-0.5 text-xs text-muted-foreground">{cat.hint}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              כתובת *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="שם הרחוב ומספר"
              className="w-full px-4 py-3 border border-border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">אנחנו מאתרים את המקום במפה לפי הכתובת והעיר. הכפתור למטה ימלא גם כתובת וגם עיר לפי המיקום שלך.</p>
            <button
              type="button"
              onClick={useMyPosition}
              disabled={locating}
              className={`mt-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                position
                  ? 'border-green-600 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200'
                  : 'border-border bg-card text-foreground hover:bg-secondary'
              }`}
            >
              {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
              {position ? 'המיקום שלך נקלט' : 'המקום נמצא איפה שאני עכשיו'}
            </button>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              עיר
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="למשל: תל אביב"
              className="w-full px-4 py-3 border border-border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              תיאור
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="ספר לנו על המקום - מה מיוחד בו? מה אפשר לעשות שם?"
              rows={4}
              className="w-full px-4 py-3 border border-border rounded-xl text-right resize-none focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
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
                className="flex items-center justify-center w-full p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-green-600 transition-colors"
              >
                <div className="text-center">
                  <Upload className="mx-auto mb-2 text-muted-foreground" size={32} />
                  <p className="text-sm text-muted-foreground">
                    {imageFile ? 'תמונה נבחרה' : 'גרור תמונה או לחץ כאן'}
                  </p>
                </div>
              </label>
              {imageFile && (
                <div className="mt-4 w-full h-48 rounded-xl overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              טלפון
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="0XX-XXXXXXX"
              className="w-full px-4 py-3 border border-border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Opening hours: the same editor the admin uses */}
          <div className="rounded-xl border border-border p-4">
            <HoursEditor value={schedule} onChange={setSchedule} />
          </div>

          <AmenitiesField
            value={formData.amenities}
            onChange={(amenities) => setFormData((f) => ({ ...f, amenities }))}
            label="מאפיינים (סמן רק מה שידוע לך בוודאות)"
          />

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

          <p className="text-sm text-muted-foreground text-center">
            המקום יישלח לאישור מנהל האתר לפני שיופיע בחיפוש
          </p>
        </motion.form>
      </div>
    </div>
  );
}
