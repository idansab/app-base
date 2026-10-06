import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Trash2, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { id: 'cafe', label: 'חיי קפה' },
  { id: 'springs', label: 'טבועות שפעתוניות' },
  { id: 'nature', label: 'טבע ופרחוניות' },
  { id: 'other', label: 'אחר' },
  { id: 'beaches', label: 'חופים' },
  { id: 'treatments', label: 'טיפולים' },
  { id: 'food', label: 'אוכל וסיור רחוב' },
  { id: 'family', label: 'גילויים משפחתי' },
  { id: 'shopping', label: 'שווקים וקניות' },
];

const API_BASE = 'http://localhost:3001/api';

export default function PlaceForm({ place, onSave, onDelete, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'nature',
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

  useEffect(() => {
    if (place) setFormData(place);
  }, [place]);

  const handleAutoGeocode = async () => {
    if (!formData.address) return;
    setGeocoding(true);
    try {
      const res = await fetch(`${API_BASE}/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: formData.address }),
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, lat: data.lat, lng: data.lng }));
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
      const method = place?.id ? 'PATCH' : 'POST';
      const url = place?.id ? `${API_BASE}/places/${place.id}` : `${API_BASE}/places`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onSave?.(data);
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
      await fetch(`${API_BASE}/places/${place.id}`, { method: 'DELETE' });
      onDelete?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Category */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריה</label>
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

      {/* Name */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">שם</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="שם המקום"
        />
      </div>

      {/* Address & Geocoding */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">כתובת</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="כתובת המקום"
          />
          <button
            onClick={handleAutoGeocode}
            disabled={geocoding}
            className="px-4 py-3 bg-slate-100 text-gray-700 rounded-2xl hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {geocoding ? <Loader2 size={20} className="animate-spin" /> : 'זיהוי'}
          </button>
        </div>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-4 text-right">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">קו רוחב</label>
          <input
            type="number"
            step="0.0001"
            value={formData.lat}
            onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">קו אורך</label>
          <input
            type="number"
            step="0.0001"
            value={formData.lng}
            onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
      </div>

      {/* Image URL */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">תמונה (URL)</label>
        <input
          type="url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="https://..."
        />
      </div>

      {/* Description */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">תיאור</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
          rows={6}
          placeholder="תיאור מלא של המקום..."
        />
      </div>

      {/* Short Description */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">תיאור קצר</label>
        <input
          type="text"
          value={formData.short_description}
          onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          maxLength="150"
          placeholder="תיאור בקצרה (עד 150 תווים)"
        />
      </div>

      {/* Opening Hours */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">שעות פתיחה</label>
        <input
          type="text"
          value={formData.opening_hours}
          onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="09:00-17:00"
        />
      </div>

      {/* Phone */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">טלפון</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="050-0000000"
        />
      </div>

      {/* Rating */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">דירוג</label>
        <input
          type="number"
          min="0"
          max="5"
          step="0.1"
          value={formData.rating}
          onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {/* Tags */}
      <div className="text-right">
        <label className="block text-sm font-medium text-gray-700 mb-2">תגיות</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="תגיות מופרדות בפסיקים"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
        >
          ביטול
        </button>

        {place?.id && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-100 text-red-700 rounded-2xl font-medium hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            מחיקה
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          שמור
        </button>
      </div>
    </motion.div>
  );
}
