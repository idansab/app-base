import React, { useState, useEffect } from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { Plus, Edit2, Trash2, Upload, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { geocodeAddress } from '@/lib/geo';
import { supabase } from '@/api/base44Client';
const CATEGORIES = ['nature', 'culture', 'food', 'shopping', 'sports', 'entertainment'];

export default function Admin() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('studio');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'nature',
    city: '',
    address: '',
    lat: '',
    lng: '',
    description: '',
    short_description: '',
    image_url: '',
    rating: 4.5,
    price_level: 'moderate',
    opening_hours: '09:00-18:00',
    phone: '',
    tags: '',
  });

  // Load places
  useEffect(() => {
    if (activeTab === 'places' || activeTab === 'approval') {
      loadPlaces();
    }
  }, [activeTab]);

  const loadPlaces = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .limit(100);
      if (error) throw error;
      setPlaces(data || []);
    } catch (e) {
      console.error('Failed to load places:', e);
    } finally {
      setLoading(false);
    }
  };

  // Geocode address
  const handleGeocodeAddress = async () => {
    if (!formData.address) return;
    try {
      setGeocoding(true);
      const result = await geocodeAddress(formData.address);
      if (result) {
        setFormData(prev => ({
          ...prev,
          lat: result.lat.toString(),
          lng: result.lng.toString(),
        }));
        showSuccess('הכתובת זוהתה בהצלחה');
      } else {
        showSuccess('כתובת לא נמצאה');
      }
    } catch (e) {
      console.error('Geocoding failed:', e);
    } finally {
      setGeocoding(false);
    }
  };

  // Save place
  const handleSavePlace = async () => {
    if (!formData.name || !formData.address || !formData.lat || !formData.lng) {
      showSuccess('מלא את כל השדות הנדרשים');
      return;
    }

    try {
      setLoading(true);
      const method = editingPlace ? 'PATCH' : 'POST';
      const url = editingPlace
        ? `${API_BASE}/places/${editingPlace.id}`
        : `${API_BASE}/places`;

      const payload = {
        ...formData,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        rating: parseFloat(formData.rating),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showSuccess('המקום נשמר בהצלחה');
        setFormData({
          name: '',
          category: 'nature',
          city: '',
          address: '',
          lat: '',
          lng: '',
          description: '',
          short_description: '',
          image_url: '',
          rating: 4.5,
          price_level: 'moderate',
          opening_hours: '09:00-18:00',
          phone: '',
          tags: '',
        });
        setEditingPlace(null);
        setShowForm(false);
        loadPlaces();
      }
    } catch (e) {
      console.error('Failed to save place:', e);
    } finally {
      setLoading(false);
    }
  };

  // Approve/Reject place
  const handleApprovePlace = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/places/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showSuccess(status === 'approved' ? 'המקום אושר בהצלחה' : 'המקום נדחה בהצלחה');
        loadPlaces();
      } else {
        const error = await res.json();
        showSuccess(error.error || 'שגיאה בעדכון הסטטוס');
      }
    } catch (e) {
      console.error('Failed to update place status:', e);
      showSuccess('שגיאה בעדכון הסטטוס');
    }
  };

  // Delete place
  const handleDeletePlace = async (id) => {
    if (!confirm('בטוח שברצונך למחוק את המקום הזה?')) return;
    try {
      const res = await fetch(`${API_BASE}/places/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      if (res.ok) {
        showSuccess('המקום נמחק בהצלחה');
        loadPlaces();
      }
    } catch (e) {
      console.error('Failed to delete place:', e);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogout = async () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_id');
    await supabase.auth.signOut();
    navigate('/admin-login');
  };

  const startEdit = (place) => {
    setEditingPlace(place);
    setFormData({
      name: place.name,
      category: place.category,
      city: place.city,
      address: place.address,
      lat: place.lat.toString(),
      lng: place.lng.toString(),
      description: place.description,
      short_description: place.short_description,
      image_url: place.image_url || '',
      rating: place.rating.toString(),
      price_level: place.price_level,
      opening_hours: place.opening_hours,
      phone: place.phone,
      tags: (place.tags || []).join(', '),
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Tab Navigation */}
      <div className="sticky top-0 bg-card border-b border-border z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4 justify-between items-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
            aria-label="התנתק"
          >
            <LogOut size={18} />
            <span>התנתק</span>
          </button>
          <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-6 py-2 rounded-2xl font-medium transition-colors ${
              activeTab === 'studio'
                ? 'bg-green-600 text-white'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            סטודיו תוכן
          </button>
          <button
            onClick={() => setActiveTab('approval')}
            className={`px-6 py-2 rounded-2xl font-medium transition-colors ${
              activeTab === 'approval'
                ? 'bg-green-600 text-white'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            אישור מקומות
          </button>
          <button
            onClick={() => setActiveTab('places')}
            className={`px-6 py-2 rounded-2xl font-medium transition-colors ${
              activeTab === 'places'
                ? 'bg-green-600 text-white'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            ניהול מקומות
          </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-24 right-4 z-50 flex items-center gap-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200 px-6 py-3 rounded-2xl shadow-md border border-green-200 dark:border-green-800 animate-in">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'studio' && (
          <div>
            <h1 className="text-2xl font-bold text-right mb-6 text-foreground">סטודיו תוכן מהיר</h1>

            {/* Quick Publish Form */}
            <div className="bg-card rounded-3xl p-6 mb-8 border border-border">
              <h2 className="text-lg font-bold text-right mb-4 text-foreground">פרסום מהיר</h2>
              <div className="space-y-4">
                <textarea
                  placeholder="כתוב טיפ או דיווח מהשטח..."
                  className="w-full p-4 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right bg-background text-foreground"
                  rows={4}
                />
                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-3 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <Upload size={18} />
                    פרסום
                  </button>
                  <button className="px-4 py-3 border border-border rounded-2xl font-medium hover:bg-secondary transition-colors text-foreground">
                    ביטול
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Tips */}
            <div className="bg-white rounded-3xl p-6">
              <h2 className="text-lg font-bold text-right mb-4">טיפים אחרונים</h2>
              <div className="text-gray-600 text-right text-sm">
                טבעת תוכן קהילתית תופיע כאן
              </div>
            </div>
          </div>
        )}

        {activeTab === 'places' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-right">ניהול מקומות</h1>
              <button
                onClick={() => {
                  setEditingPlace(null);
                  setFormData({
                    name: '',
                    category: 'nature',
                    city: '',
                    address: '',
                    lat: '',
                    lng: '',
                    description: '',
                    short_description: '',
                    image_url: '',
                    rating: 4.5,
                    price_level: 'moderate',
                    opening_hours: '09:00-18:00',
                    phone: '',
                    tags: '',
                  });
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                הוסף מקום
              </button>
            </div>

            {/* Form */}
            {showForm && (
              <div className="bg-white rounded-3xl p-6 mb-8">
                <h2 className="text-lg font-bold text-right mb-6">
                  {editingPlace ? 'עריכת מקום' : 'הוספת מקום חדש'}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      שם המקום *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      קטגוריה
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      רמת מחיר
                    </label>
                    <select
                      value={formData.price_level}
                      onChange={(e) => setFormData({ ...formData, price_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    >
                      <option value="free">חינם</option>
                      <option value="budget">בתקציב</option>
                      <option value="moderate">בינוני</option>
                      <option value="expensive">יקר</option>
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      עיר
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>

                  {/* Address */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      כתובת *
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGeocodeAddress}
                        disabled={geocoding}
                        className="px-4 py-2 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {geocoding ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                        זהי כתובת
                      </button>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                      />
                    </div>
                  </div>

                  {/* Coordinates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      קו רוחב
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      קו אורך
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      תיאור קצר
                    </label>
                    <input
                      type="text"
                      value={formData.short_description}
                      onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>

                  {/* Full Description */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      תיאור מלא
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                      rows={4}
                    />
                  </div>

                  {/* Image URL */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      URL תמונה
                    </label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      דירוג
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>

                  {/* Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      שעות פתיחה
                    </label>
                    <input
                      type="text"
                      value={formData.opening_hours}
                      onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      טלפון
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>

                  {/* Tags */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      תגיות (מופרדות בפסיקים)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-right"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSavePlace}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'שמור'}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}

            {/* Places List */}
            {loading && !showForm ? (
              <div className="text-center py-12">
                <Loader2 size={40} className="animate-spin mx-auto text-green-600" />
              </div>
            ) : (
              <div className="grid gap-4">
                {places.map(place => (
                  <div
                    key={place.id}
                    className="bg-white rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 text-right">
                      <h3 className="font-bold text-lg">{place.name}</h3>
                      <p className="text-sm text-gray-600">{place.city} • {place.category}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(place)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletePlace(place.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'approval' && (
          <div>
            <h1 className="text-2xl font-bold text-right mb-6">אישור מקומות</h1>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 size={40} className="animate-spin mx-auto text-green-600" />
              </div>
            ) : (
              <div className="grid gap-4">
                {places.filter(p => p.status === 'pending').length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center text-gray-600">
                    אין מקומות המחכים לאישור
                  </div>
                ) : (
                  places.filter(p => p.status === 'pending').map(place => (
                    <div
                      key={place.id}
                      className="bg-white rounded-2xl p-6 border-2 border-yellow-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 text-right">
                          <h3 className="font-bold text-lg">{place.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{place.city} • {place.category}</p>
                          <p className="text-sm text-gray-700 mt-2">{place.address}</p>
                          {place.description && (
                            <p className="text-sm text-gray-600 mt-2">{place.description}</p>
                          )}
                        </div>
                        {place.image_url && (
                          <img
                            src={place.image_url}
                            alt={place.name}
                            className="w-20 h-20 object-cover rounded-lg ml-4 flex-shrink-0"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                      </div>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => handleApprovePlace(place.id, 'approved')}
                          className="px-6 py-2 bg-green-600 text-white rounded-2xl font-medium hover:bg-green-700 transition-colors"
                        >
                          אשר
                        </button>
                        <button
                          onClick={() => handleApprovePlace(place.id, 'rejected')}
                          className="px-6 py-2 bg-red-600 text-white rounded-2xl font-medium hover:bg-red-700 transition-colors"
                        >
                          דחה
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
