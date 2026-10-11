import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import PlaceDetailsSheet from '@/components/places/PlaceDetailsSheet';
import TripView from '@/components/trips/TripView';
import useFavorites from '@/hooks/useFavorites';
import { useAuth } from '@/lib/AuthContext';
import { loadTripById } from '@/lib/tripsApi';
import { stopsOf } from '@/lib/tripUtils';

/** /trips/:id, the page a shared link opens. Works for visitors who are not signed in. */
export default function TripPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [trip, setTrip] = useState(null);
  const [places, setPlaces] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [openPlace, setOpenPlace] = useState(null);

  useEffect(() => {
    if (authLoading) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setState('loading');
        const found = await loadTripById(id, user?.id);
        if (cancelled) return;
        if (!found) {
          setState('missing');
          return;
        }
        const ids = found.places_order;
        const { data, error } = await supabase.from('places').select('*').in('id', ids).eq('status', 'approved');
        if (error) throw error;
        if (cancelled) return;
        setTrip(found);
        setPlaces(data || []);
        setState('ready');
      } catch (e) {
        console.error('Loading trip failed:', e);
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id, authLoading]);

  const stops = useMemo(() => (trip ? stopsOf(trip.places_order, new Map(places.map((p) => [p.id, p]))) : []), [trip, places]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight size={16} aria-hidden="true" />
          כל המסלולים
        </Link>

        {state === 'loading' && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" />
          </div>
        )}

        {state === 'missing' && (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center">
            <p className="mb-1 font-medium text-foreground">המסלול לא נמצא</p>
            <p className="text-sm text-muted-foreground">ייתכן שהוא נמחק או שהוא כבר לא משותף.</p>
          </div>
        )}

        {state === 'error' && <p role="alert" className="py-12 text-center text-sm text-red-600">לא הצלחנו לטעון את המסלול. נסה שוב בעוד רגע.</p>}

        {state === 'ready' && trip && (
          <TripView
            trip={trip}
            stops={stops}
            onChanged={(next) => setTrip((current) => ({ ...current, ...next }))}
            onDeleted={() => navigate('/trips')}
            onEdit={(t) => navigate('/trips', { state: { edit: t } })}
            onOpenPlace={setOpenPlace}
          />
        )}
      </div>

      <PlaceDetailsSheet
        isOpen={Boolean(openPlace)}
        onClose={() => setOpenPlace(null)}
        place={openPlace}
        userLocation={null}
        isFavorite={openPlace ? isFavorite(openPlace.id) : false}
        onFavoriteToggle={() => openPlace && toggle(openPlace.id).catch(() => {})}
      />
    </div>
  );
}
