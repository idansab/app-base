import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, Clock, Eye, Loader2, MapPin, MessageCircle, Plus, Users } from 'lucide-react';
import CommunityChat from '@/pages/CommunityChat';
import { supabase } from '@/api/base44Client';
import TripBuilder from '@/components/trips/TripBuilder';
import useFavorites from '@/hooks/useFavorites';
import useUserLocation from '@/hooks/useUserLocation';
import { useAuth } from '@/lib/AuthContext';
import { loadCommunityTrips, loadMyTrips, loadSavedTrips } from '@/lib/tripsApi';
import { estimateHours, routeKm, stopsOf } from '@/lib/tripUtils';

const TABS = [
  ['mine', 'שלי', Eye],
  ['community', 'מהקהילה', Users],
  ['saved', 'שמורים', Bookmark],
  ['chat', 'צ׳אט', MessageCircle],
];

function TripCard({ trip, placesById, showAuthor }) {
  const stops = stopsOf(trip.places_order, placesById);
  const km = routeKm(stops);
  const hours = trip.duration_hours || estimateHours(stops.length, km);
  return (
    <Link
      to={`/trips/${encodeURIComponent(trip.id)}`}
      className="block rounded-2xl border-2 border-border bg-card p-4 text-right transition-colors hover:border-primary"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        {trip.is_public && !showAuthor ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">משותף</span>
        ) : (
          <span />
        )}
        <h3 className="truncate text-lg font-bold text-foreground">{trip.title}</h3>
      </div>
      {trip.description && <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{trip.description}</p>}
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {showAuthor && trip.author_name && <span>מאת {trip.author_name}</span>}
        {Number(trip.saves_count) > 0 && <span>{trip.saves_count} שמרו</span>}
        <span className="flex items-center gap-1">
          <Clock size={14} aria-hidden="true" />
          {hours} שעות
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={14} aria-hidden="true" />
          {stops.length} תחנות
          {stops.length > 1 ? ` · כ-${Math.round(km)} ק״מ` : ''}
        </span>
      </div>
    </Link>
  );
}

export default function Trips() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites } = useFavorites();
  const { location: userLocation, request: requestLocation } = useUserLocation();

  const [places, setPlaces] = useState([]);
  const [tab, setTab] = useState(location.state?.tab === 'chat' ? 'chat' : 'community');
  const [mine, setMine] = useState([]);
  const [community, setCommunity] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [builder, setBuilder] = useState(null); // null | { trip?: existing }

  const favoriteIds = useMemo(() => new Set(Object.keys(favorites)), [favorites]);
  const placesById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [placesResult, communityTrips] = await Promise.all([
        supabase.from('places').select('*').eq('status', 'approved'),
        loadCommunityTrips(),
      ]);
      if (placesResult.error) throw placesResult.error;
      setPlaces(placesResult.data || []);
      setCommunity(communityTrips);
      if (user?.id) {
        const [myTrips, savedTrips] = await Promise.all([loadMyTrips(user.id), loadSavedTrips()]);
        setMine(myTrips);
        setSaved(savedTrips);
      } else {
        setMine([]);
        setSaved([]);
      }
    } catch (e) {
      console.error('Loading trips failed:', e);
      setError('לא הצלחנו לטעון את המסלולים. נסה שוב בעוד רגע.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  // coming from a trip page with "edit" or "save and edit"
  useEffect(() => {
    if (location.state?.edit) {
      setBuilder({ trip: location.state.edit });
      setTab('mine');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const startNew = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setBuilder({});
  };

  const onSaved = (trip) => {
    setBuilder(null);
    setTab('mine');
    load();
    navigate(`/trips/${encodeURIComponent(trip.id)}`);
  };

  const lists = { mine, community, saved };
  const emptyText = {
    mine: ['אין לך עדיין מסלולים', 'בנה מסלול חדש מכל מקום באתר, גם בלי מועדפים.'],
    community: ['אין עדיין מסלולים מהקהילה', 'היה הראשון לשתף מסלול.'],
    saved: ['לא שמרת מסלולים', 'במסלולים של הקהילה לחץ "שמור" כדי למצוא אותם כאן.'],
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-20 border-b border-border bg-card py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4">
          <button
            type="button"
            onClick={startNew}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus size={18} aria-hidden="true" />
            מסלול חדש
          </button>
          <h1 className="text-2xl font-bold text-primary">מסלולים</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        {builder && (
          <TripBuilder
            userId={user?.id}
            places={places}
            favoriteIds={favoriteIds}
            userLocation={userLocation}
            onRequestLocation={requestLocation}
            initialTrip={builder.trip}
            onSaved={onSaved}
            onCancel={() => setBuilder(null)}
          />
        )}

        <div className="flex gap-1.5" role="tablist" aria-label="סוגי מסלולים">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-[13px] font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm ${
                tab === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              <Icon size={16} aria-hidden="true" className="hidden shrink-0 sm:block" />
              {label}
              {lists[key] && key !== 'community' && lists[key].length > 0 && <span className="tabular-nums opacity-80">({lists[key].length})</span>}
            </button>
          ))}
        </div>

        {tab === 'chat' ? (
          <CommunityChat embedded />
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : error ? (
          <p role="alert" className="py-10 text-center text-sm text-red-600">{error}</p>
        ) : tab !== 'community' && !isAuthenticated ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center">
            <p className="mb-3 text-muted-foreground">צריך להתחבר כדי לראות את המסלולים שלך.</p>
            <button type="button" onClick={() => navigate('/login', { state: { from: location } })} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
              התחברות
            </button>
          </div>
        ) : lists[tab].length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center">
            <p className="mb-1 font-medium text-foreground">{emptyText[tab][0]}</p>
            <p className="text-sm text-muted-foreground">{emptyText[tab][1]}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {lists[tab].map((trip) => (
              <TripCard key={trip.id} trip={trip} placesById={placesById} showAuthor={tab !== 'mine'} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
