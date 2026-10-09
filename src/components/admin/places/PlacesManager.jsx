import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { CATEGORIES, getCategory } from '@/lib/categories';
import ConfirmDialog from '@/components/ConfirmDialog';
import PlaceDrawer from './PlaceDrawer';
import {
  ISSUES,
  STATUS_LABELS,
  getIssues,
  matchesQuery,
  placeToForm,
  placesToCsv,
} from './placeUtils';

const PAGE_SIZE = 25;
const FETCH_CHUNK = 1000;

const STATUS_TONE = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700',
  approved: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200 dark:border-green-700',
  rejected: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-700',
};

const SORTS = {
  recent: { label: 'נוספו לאחרונה', fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  updated: { label: 'עודכנו לאחרונה', fn: (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at) },
  name: { label: 'שם (א-ת)', fn: (a, b) => (a.name || '').localeCompare(b.name || '', 'he') },
  city: { label: 'עיר (א-ת)', fn: (a, b) => (a.city || '').localeCompare(b.city || '', 'he') || (a.name || '').localeCompare(b.name || '', 'he') },
  rating: { label: 'דירוג', fn: (a, b) => (b.rating || 0) - (a.rating || 0) },
};

const selectCls =
  'px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-600';

async function fetchAllPlaces() {
  const all = [];
  for (let from = 0; ; from += FETCH_CHUNK) {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + FETCH_CHUNK - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < FETCH_CHUNK) break;
  }
  return all;
}

export default function PlacesManager({
  title = 'ניהול מקומות',
  initialStatus = 'all',
  onPendingChange,
  onError,
  onSuccess,
}) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState('all');
  const [city, setCity] = useState('all');
  const [issue, setIssue] = useState('all');
  const [sortKey, setSortKey] = useState(initialStatus === 'pending' ? 'recent' : 'updated');
  const [page, setPage] = useState(0);

  const [selected, setSelected] = useState(new Set());
  const [drawer, setDrawer] = useState(null); // null | { id } | { id: null, template? }
  const [undo, setUndo] = useState(null); // { label, previous: [{id,status}] }
  const [confirm, setConfirm] = useState(null); // { ids, label }
  const [busy, setBusy] = useState(false);
  const searchRef = useRef(null);
  const undoTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setPlaces(await fetchAllPlaces());
    } catch (e) {
      console.error('Failed to load places:', e);
      setLoadError(true);
      onError?.('שגיאה בטעינת המקומות');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the tab badge in the parent in sync with reality
  useEffect(() => {
    if (!loading) onPendingChange?.(places.filter((p) => p.status === 'pending').length);
  }, [places, loading, onPendingChange]);

  // "/" focuses the search box (unless already typing somewhere)
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && !drawer) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  // ---- derived data -------------------------------------------------------
  const cities = useMemo(
    () => [...new Set(places.map((p) => p.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he')),
    [places]
  );

  const issueCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(ISSUES).map((k) => [k, 0]));
    places.forEach((p) => getIssues(p).forEach((k) => (counts[k] += 1)));
    return counts;
  }, [places]);

  const statusCounts = useMemo(() => {
    const counts = { all: places.length, pending: 0, approved: 0, rejected: 0 };
    places.forEach((p) => {
      if (counts[p.status] !== undefined) counts[p.status] += 1;
    });
    return counts;
  }, [places]);

  const filtered = useMemo(
    () =>
      places
        .filter((p) => (status === 'all' ? true : p.status === status))
        .filter((p) => (category === 'all' ? true : p.category === category))
        .filter((p) => (city === 'all' ? true : p.city === city))
        .filter((p) => (issue === 'all' ? true : getIssues(p).includes(issue)))
        .filter((p) => matchesQuery(p, query))
        .sort(SORTS[sortKey].fn),
    [places, status, category, city, issue, query, sortKey]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // reset to the first page whenever the filters change
  useEffect(() => {
    setPage(0);
  }, [status, category, city, issue, query, sortKey]);

  const drawerIndex = drawer?.id ? filtered.findIndex((p) => p.id === drawer.id) : -1;
  const drawerPlace = drawer?.id ? places.find((p) => p.id === drawer.id) : null;

  // ---- mutations ----------------------------------------------------------
  const patchLocal = (ids, patch) =>
    setPlaces((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, ...patch } : p)));

  const showUndo = (label, previous) => {
    clearTimeout(undoTimer.current);
    setUndo({ label, previous });
    undoTimer.current = setTimeout(() => setUndo(null), 8000);
  };

  const changeStatus = async (ids, newStatus) => {
    const targets = places.filter((p) => ids.includes(p.id) && p.status !== newStatus);
    if (targets.length === 0) return;
    const previous = targets.map((p) => ({ id: p.id, status: p.status }));
    setBusy(true);
    try {
      const { error } = await supabase
        .from('places')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', targets.map((p) => p.id));
      if (error) throw error;
      patchLocal(targets.map((p) => p.id), { status: newStatus });
      showUndo(`${targets.length} מקומות עודכנו ל${STATUS_LABELS[newStatus]}`, previous);
      setSelected(new Set());
    } catch (e) {
      console.error('Status change failed:', e);
      onError?.('שגיאה בעדכון הסטטוס');
    } finally {
      setBusy(false);
    }
  };

  const runUndo = async () => {
    if (!undo) return;
    const { previous } = undo;
    clearTimeout(undoTimer.current);
    setUndo(null);
    setBusy(true);
    try {
      // group by previous status so each group is one request
      const groups = previous.reduce((acc, { id, status: s }) => {
        (acc[s] ||= []).push(id);
        return acc;
      }, {});
      for (const [s, ids] of Object.entries(groups)) {
        const { error } = await supabase.from('places').update({ status: s }).in('id', ids);
        if (error) throw error;
        patchLocal(ids, { status: s });
      }
      onSuccess?.('השינוי בוטל');
    } catch (e) {
      console.error('Undo failed:', e);
      onError?.('לא הצלחנו לבטל את השינוי');
      load();
    } finally {
      setBusy(false);
    }
  };

  const changeCategory = async (ids, newCategory) => {
    if (!newCategory) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('places')
        .update({ category: newCategory, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      patchLocal(ids, { category: newCategory });
      onSuccess?.(`הקטגוריה עודכנה ל-${ids.length} מקומות`);
      setSelected(new Set());
    } catch (e) {
      console.error('Category change failed:', e);
      onError?.('שגיאה בעדכון הקטגוריה');
    } finally {
      setBusy(false);
    }
  };

  const deletePlaces = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('places').delete().in('id', confirm.ids);
      if (error) throw error;
      setPlaces((prev) => prev.filter((p) => !confirm.ids.includes(p.id)));
      setSelected(new Set());
      if (drawer?.id && confirm.ids.includes(drawer.id)) setDrawer(null);
      onSuccess?.(`${confirm.ids.length} מקומות נמחקו`);
    } catch (e) {
      console.error('Delete failed:', e);
      onError?.('שגיאה במחיקה');
    } finally {
      setConfirm(null);
      setBusy(false);
    }
  };

  const savePlace = async (payload, id) => {
    const now = new Date().toISOString();
    if (id) {
      const { data, error } = await supabase
        .from('places')
        .update({ ...payload, updated_at: now })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setPlaces((prev) => prev.map((p) => (p.id === id ? data : p)));
      return data;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('places')
      .insert([{ ...payload, created_by_id: auth?.user?.id ?? null }])
      .select()
      .single();
    if (error) throw error;
    setPlaces((prev) => [data, ...prev]);
    return data;
  };

  const exportCsv = () => {
    const rows = selected.size > 0 ? places.filter((p) => selected.has(p.id)) : filtered;
    const blob = new Blob([placesToCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `places-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onSuccess?.(`יוצאו ${rows.length} מקומות`);
  };

  const duplicate = (place) => {
    setDrawer({
      id: null,
      template: { ...placeToForm(place), name: `${place.name} (עותק)`, status: 'pending' },
    });
  };

  // ---- selection ----------------------------------------------------------
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));
  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageItems.forEach((p) => (allOnPageSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goTo = (offset) => {
    const target = filtered[drawerIndex + offset];
    if (target) setDrawer({ id: target.id });
  };

  const hasFilters = status !== 'all' || category !== 'all' || city !== 'all' || issue !== 'all' || query;
  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setCategory('all');
    setCity('all');
    setIssue('all');
  };

  // ---- render -------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-border text-sm hover:bg-secondary"
          >
            <Download size={16} />
            ייצוא CSV{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
          <button
            onClick={() => setDrawer({ id: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-600 text-white text-sm font-medium hover:bg-green-700"
          >
            <Plus size={16} />
            מקום חדש
          </button>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'טוען…' : `${filtered.length} מתוך ${places.length} מקומות`}
          </p>
        </div>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2 justify-end" role="tablist" aria-label="סינון לפי סטטוס">
        {[['all', 'הכול'], ['pending', 'ממתינים'], ['approved', 'מאושרים'], ['rejected', 'נדחו']].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={status === key}
            onClick={() => setStatus(key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              status === key
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-card text-foreground border-border hover:bg-secondary'
            }`}
          >
            {label} <span className="tabular-nums opacity-80">{statusCounts[key]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם, כתובת, עיר, טלפון או תגית…  ( / )"
            aria-label="חיפוש מקומות"
            className={`${selectCls} w-full pr-9 text-right`}
          />
        </div>
        <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="קטגוריה">
          <option value="all">כל הקטגוריות</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <select className={selectCls} value={city} onChange={(e) => setCity(e.target.value)} aria-label="עיר">
          <option value="all">כל הערים</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className={selectCls} value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="מיון">
          {Object.entries(SORTS).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Data-quality quick filters */}
      <div className="flex flex-wrap gap-2 justify-end items-center">
        {hasFilters && (
          <button onClick={resetFilters} className="text-sm text-primary hover:underline ml-2">
            נקה סינון
          </button>
        )}
        {Object.entries(ISSUES).map(([key, def]) =>
          issueCounts[key] > 0 ? (
            <button
              key={key}
              onClick={() => setIssue(issue === key ? 'all' : key)}
              aria-pressed={issue === key}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                issue === key
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700'
              }`}
            >
              <AlertTriangle size={12} />
              {def.label} <span className="tabular-nums">{issueCounts[key]}</span>
            </button>
          ) : null
        )}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-[72px] z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-green-300 bg-green-50 dark:bg-green-950/60 dark:border-green-700 p-3">
          <span className="text-sm font-medium text-foreground ml-auto">{selected.size} נבחרו</span>
          <button disabled={busy} onClick={() => changeStatus([...selected], 'approved')} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-600 text-white text-sm disabled:opacity-50">
            <Check size={14} /> אשר
          </button>
          <button disabled={busy} onClick={() => changeStatus([...selected], 'rejected')} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 text-white text-sm disabled:opacity-50">
            <X size={14} /> דחה
          </button>
          <select
            className={selectCls}
            value=""
            disabled={busy}
            onChange={(e) => changeCategory([...selected], e.target.value)}
            aria-label="שינוי קטגוריה לנבחרים"
          >
            <option value="">שנה קטגוריה…</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <button
            disabled={busy}
            onClick={() => setConfirm({ ids: [...selected], label: `${selected.size} מקומות` })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-300 text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
          >
            <Trash2 size={14} /> מחק
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-muted-foreground hover:underline">
            בטל בחירה
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : loadError ? (
        <div className="text-center py-12">
          <p className="text-foreground mb-3">לא הצלחנו לטעון את המקומות</p>
          <button onClick={load} className="px-4 py-2 rounded-2xl bg-green-600 text-white">נסה שוב</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-3xl">
          {places.length === 0 ? 'עדיין אין מקומות' : 'לא נמצאו מקומות שמתאימים לסינון'}
          {hasFilters && (
            <div>
              <button onClick={resetFilters} className="mt-3 text-primary hover:underline">נקה סינון</button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-secondary text-sm text-muted-foreground">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="בחר את כל המקומות בעמוד"
                    className="w-4 h-4"
                  />
                </th>
                <th className="p-3 font-medium">מקום</th>
                <th className="p-3 font-medium hidden md:table-cell">קטגוריה</th>
                <th className="p-3 font-medium">סטטוס</th>
                <th className="p-3 font-medium hidden lg:table-cell">דירוג</th>
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((place) => {
                const cat = getCategory(place.category);
                const placeIssues = getIssues(place);
                return (
                  <tr
                    key={place.id}
                    className={`border-t border-border hover:bg-secondary/40 cursor-pointer ${selected.has(place.id) ? 'bg-green-50/60 dark:bg-green-950/30' : ''}`}
                    onClick={() => setDrawer({ id: place.id })}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(place.id)}
                        onChange={() => toggleOne(place.id)}
                        aria-label={`בחר את ${place.name}`}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0">
                          {place.image_url && (
                            <img
                              src={place.image_url}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{place.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[place.city, place.address].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {placeIssues.length > 0 && (
                          <span
                            title={placeIssues.map((k) => ISSUES[k].label).join(', ')}
                            className="flex items-center gap-0.5 text-amber-600 text-xs shrink-0"
                          >
                            <AlertTriangle size={14} />
                            {placeIssues.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-sm text-foreground">{cat.label}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={place.status || 'pending'}
                        disabled={busy}
                        onChange={(e) => changeStatus([place.id], e.target.value)}
                        aria-label={`סטטוס של ${place.name}`}
                        className={`text-xs font-medium rounded-full border px-2 py-1 ${STATUS_TONE[place.status] || STATUS_TONE.pending}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-sm tabular-nums text-foreground">
                      {place.rating ?? '—'}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      <Pencil size={16} aria-hidden="true" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pageCount > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border text-sm">
              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-secondary disabled:opacity-30"
              >
                <ChevronRight size={16} /> הבא
              </button>
              <span className="text-muted-foreground tabular-nums">
                עמוד {safePage + 1} מתוך {pageCount}
              </span>
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-secondary disabled:opacity-30"
              >
                הקודם <ChevronLeft size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Undo toast */}
      {undo && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-2xl bg-foreground text-background px-5 py-3 shadow-lg"
        >
          <span className="text-sm">{undo.label}</span>
          <button onClick={runUndo} className="flex items-center gap-1 text-sm font-semibold underline">
            <Undo2 size={14} /> בטל
          </button>
        </div>
      )}

      {drawer && (
        <PlaceDrawer
          key={drawer.id ?? 'new'}
          place={drawerPlace}
          template={drawer.template}
          position={drawerIndex >= 0 ? `${drawerIndex + 1} / ${filtered.length}` : undefined}
          hasPrev={drawerIndex > 0}
          hasNext={drawerIndex >= 0 && drawerIndex < filtered.length - 1}
          onPrev={() => goTo(-1)}
          onNext={() => goTo(1)}
          onClose={() => setDrawer(null)}
          onSave={savePlace}
          onDelete={(p) => setConfirm({ ids: [p.id], label: `"${p.name}"` })}
          onDuplicate={duplicate}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        title="מחיקת מקומות"
        message={confirm ? `למחוק את ${confirm.label}? הפעולה לא ניתנת לביטול.` : ''}
        variant="danger"
        isDangerous
        confirmText="מחק"
        cancelText="ביטול"
        isLoading={busy}
        onConfirm={deletePlaces}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

