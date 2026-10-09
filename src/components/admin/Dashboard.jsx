import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  Inbox,
  KeyRound,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  UserPlus,
  Users,
} from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { getCategory } from '@/lib/categories';

const count = async (query) => {
  const { count: n, error } = await query;
  if (error) throw error;
  return n ?? 0;
};

const head = (table) => supabase.from(table).select('*', { count: 'exact', head: true });

/** Card that needs attention; turns amber when there is work to do and links to the right tab. */
function TodoCard({ icon: Icon, label, value, tab, onNavigate }) {
  const hasWork = value > 0;
  return (
    <button
      onClick={() => onNavigate(tab)}
      className={`text-right rounded-3xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-600 ${
        hasWork
          ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        {hasWork ? (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">דורש טיפול</span>
        ) : (
          <CheckCircle2 size={16} className="text-green-600" aria-label="הכול מטופל" />
        )}
        <Icon size={20} className={hasWork ? 'text-amber-600' : 'text-muted-foreground'} />
      </div>
      <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </button>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 text-right">
      <div className="flex items-center justify-end gap-2 text-muted-foreground mb-2">
        <span className="text-sm">{label}</span>
        <Icon size={16} />
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 text-right">
      <h3 className="font-bold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}

function SignupsChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <>
      <div
        className="flex items-end gap-1 h-32"
        role="img"
        aria-label={`הרשמות ב-14 הימים האחרונים: ${total} בסך הכול`}
        dir="ltr"
      >
        {data.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <span className="absolute -top-5 text-[10px] text-foreground opacity-0 group-hover:opacity-100">
              {d.count}
            </span>
            <div
              className={`w-full rounded-t-md ${d.count > 0 ? 'bg-green-600' : 'bg-muted'}`}
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
              title={`${new Date(d.day).toLocaleDateString('he-IL')}: ${d.count}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-2" dir="ltr">
        <span>{new Date(data[0].day).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1].day).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span>
      </div>
    </>
  );
}

function BarRow({ label, value, max, suffix = '' }) {
  return (
    <li>
      <div className="flex justify-between text-sm mb-1">
        <span className="tabular-nums text-muted-foreground">{value}{suffix}</span>
        <span className="text-foreground truncate ml-3">{label}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden" dir="ltr">
        <div className="h-full rounded-full bg-green-600" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </li>
  );
}

export default function Dashboard({ onNavigate, onCounts }) {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [chartsUnavailable, setChartsUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const [pendingPlaces, approvedPlaces, pendingTips, pendingReports, users, newUsers, pendingOwners] = await Promise.all([
        count(head('places').eq('status', 'pending')),
        count(head('places').eq('status', 'approved')),
        count(head('tips').eq('status', 'pending')),
        count(head('reports').eq('status', 'pending')),
        count(head('profiles')),
        count(head('profiles').gte('created_at', weekAgo)),
        count(head('place_owners').eq('status', 'pending')),
      ]);
      const next = { pendingPlaces, approvedPlaces, pendingTips, pendingReports, users, newUsers, pendingOwners };
      setStats(next);
      setUpdatedAt(new Date());
      onCounts?.({ places: pendingPlaces, content: pendingTips + pendingReports, owners: pendingOwners });

      const { data, error: rpcError } = await supabase.rpc('admin_dashboard_stats');
      if (rpcError) {
        setChartsUnavailable(true);
        setCharts(null);
      } else {
        setChartsUnavailable(false);
        setCharts(data);
      }
    } catch (e) {
      console.error('Dashboard load failed:', e);
      setError('לא הצלחנו לטעון את הנתונים');
    } finally {
      setLoading(false);
    }
  }, [onCounts]);

  useEffect(() => {
    load();
  }, [load]);

  if (!stats && loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="mx-auto mb-3 text-red-500" />
        <p className="text-foreground mb-4">{error}</p>
        <button onClick={load} className="px-4 py-2 rounded-2xl bg-green-600 text-white">נסה שוב</button>
      </div>
    );
  }

  const totalPending = stats.pendingPlaces + stats.pendingTips + stats.pendingReports + stats.pendingOwners;
  const topMax = Math.max(1, ...(charts?.top_places || []).map((p) => p.count));
  const catMax = Math.max(1, ...(charts?.categories || []).map((c) => c.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50"
          aria-label="רענן נתונים"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          רענן
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-foreground">לוח בקרה</h1>
          <p className="text-sm text-muted-foreground">
            {totalPending > 0
              ? `${totalPending} פריטים ממתינים לאישור שלך`
              : 'אין כרגע שום דבר שממתין לאישור 🎉'}
            {updatedAt && ` · עודכן ${updatedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TodoCard icon={MapPin} label="מקומות ממתינים" value={stats.pendingPlaces} tab="approval" onNavigate={onNavigate} />
        <TodoCard icon={KeyRound} label="בקשות בעלות" value={stats.pendingOwners} tab="owners" onNavigate={onNavigate} />
        <TodoCard icon={MessageSquare} label="טיפים ממתינים" value={stats.pendingTips} tab="moderation" onNavigate={onNavigate} />
        <TodoCard icon={Inbox} label="דיווחים ממתינים" value={stats.pendingReports} tab="moderation" onNavigate={onNavigate} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MapPin} label="מקומות מאושרים" value={stats.approvedPlaces} />
        <StatCard icon={Users} label="משתמשים" value={stats.users} />
        <StatCard icon={UserPlus} label="הצטרפו השבוע" value={stats.newUsers} />
        <StatCard icon={Heart} label="שמירות למועדפים" value={charts ? charts.favorites_total : '—'} />
      </div>

      {chartsUnavailable ? (
        <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          הגרפים יופיעו לאחר הפעלת מיגרציה 007 במסד הנתונים.
        </div>
      ) : charts ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="הרשמות" subtitle="14 הימים האחרונים">
            <SignupsChart data={charts.signups_by_day} />
          </Panel>

          <Panel title="המקומות הפופולריים" subtitle="לפי שמירות למועדפים">
            {charts.top_places.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">עדיין אין מועדפים</p>
            ) : (
              <ul className="space-y-3">
                {charts.top_places.map((p) => (
                  <BarRow key={p.id} label={p.name} value={p.count} max={topMax} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="מקומות לפי קטגוריה" subtitle="מקומות מאושרים בלבד">
            <ul className="space-y-3">
              {charts.categories.map((c) => (
                <BarRow key={c.category} label={getCategory(c.category).label} value={c.count} max={catMax} />
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
