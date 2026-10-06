import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, Send } from 'lucide-react';
import useUserLocation from '@/hooks/useUserLocation';
import { geocodeAddress, haversineKm } from '@/lib/geo';

const API_BASE = 'http://localhost:3001/api';

export default function Studio() {
  const { location: userLocation } = useUserLocation({ auto: true });
  const [places, setPlaces] = useState([]);
  const [nearestPlace, setNearestPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' or 'manage'
  const [quickContent, setQuickContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/places?status=approved`);
        if (!res.ok) throw new Error('Failed to load places');
        const data = await res.json();
        setPlaces(data.data || []);

        // Find nearest place
        if (userLocation && data.data && data.data.length > 0) {
          const nearest = data.data.reduce((closest, place) => {
            const dist = haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng);
            const closestDist = haversineKm(userLocation.lat, userLocation.lng, closest.lat, closest.lng);
            return dist < closestDist ? place : closest;
          });
          setNearestPlace(nearest);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadPlaces();
  }, [userLocation]);

  const handlePublishQuick = async () => {
    if (!quickContent.trim() || !nearestPlace) {
      alert('כתוב טיפ בחר מקום');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: nearestPlace.id,
          content: quickContent,
        }),
      });

      if (!res.ok) throw new Error('Failed to publish');
      alert('🎉 פורסם בהצלחה!');
      setQuickContent('');
    } catch (e) {
      alert('שגיאה בפרסום: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-24">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-700">טוען סטודיו...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-20 py-4">
        <div className="px-4 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-right text-green-600">סטודיו תוכן</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[60px] z-19">
        <div className="px-4 max-w-6xl mx-auto flex gap-4 justify-end">
          <button
            onClick={() => setActiveTab('quick')}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'quick'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            עדכון מהיר
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'manage'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ניהול מקומות
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-6xl mx-auto py-6">
        {activeTab === 'quick' && (
          <div className="max-w-2xl mr-auto">
            {/* Quick Panel */}
            <div className="bg-white rounded-2xl p-6 border-2 border-green-200 mb-6">
              <h2 className="text-xl font-bold text-right mb-4">פרסום מהיר</h2>

              {nearestPlace && (
                <div className="mb-6 p-4 bg-green-50 rounded-2xl text-right">
                  <p className="text-sm font-medium text-green-900 flex items-center gap-2 justify-end">
                    <MapPin size={16} />
                    זוהה אוטומטית: <strong>{nearestPlace.name}</strong>
                  </p>
                </div>
              )}

              <textarea
                value={quickContent}
                onChange={(e) => setQuickContent(e.target.value)}
                placeholder="כתוב טיפ או דיווח מהשטח..."
                className="w-full p-4 border border-gray-200 rounded-2xl text-right resize-none focus:outline-none focus:ring-2 focus:ring-green-600 mb-4"
                rows={4}
              />

              <button
                onClick={handlePublishQuick}
                disabled={submitting || !nearestPlace}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    פורסום...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    פרסום מיידי
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div>
            <h2 className="text-xl font-bold text-right mb-6">ניהול מקומות</h2>

            {places.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl">
                <p className="text-gray-600">אין מקומות להציג</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {places.map(place => (
                  <div
                    key={place.id}
                    className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-green-600 transition-colors"
                  >
                    <div className="flex items-start gap-4 text-right">
                      {place.image_url && (
                        <img
                          src={place.image_url}
                          alt={place.name}
                          className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => (e.target.style.display = 'none')}
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{place.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{place.short_description}</p>
                        <div className="flex gap-2 justify-end">
                          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                            עריכה
                          </button>
                          <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium">
                            מחיקה
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
