import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const ACTIONS = {
  status_change: 'שינוי סטטוס',
  delete: 'מחיקה',
  role_change: 'שינוי הרשאה',
  config_change: 'שינוי הגדרות',
  owner_edit: 'עריכה על ידי בעל עסק',
  apply_request: 'אישור בקשת עדכון',
};
const TARGETS = {
  places: 'מקום',
  tips: 'טיפ',
  reports: 'דיווח',
  profiles: 'משתמש',
  place_owners: 'בעלות על מקום',
  place_update_requests: 'בקשת עדכון',
  app_config: 'הגדרות',
};
const FIELD_LABELS = {
  short_description: 'תיאור קצר', description: 'תיאור', phone: 'טלפון', opening_hours: 'שעות', opening_schedule: 'שעות',
  images: 'תמונות', kosher: 'כשרות', kosher_note: 'כשרות', price_level: 'מחיר', tags: 'תגיות',
};

// A short human line for the details column; never prints raw objects
function describeDetails(details) {
  if (!details) return '';
  if (Array.isArray(details.fields)) {
    return `שדות: ${[...new Set(details.fields.map((f) => FIELD_LABELS[f] || f))].join(', ')}`;
  }
  if (typeof details.from === 'string' && typeof details.to === 'string') return `(${details.from} ← ${details.to})`;
  if (details.to && typeof details.to === 'object' && details.to.ends_at) {
    return `סוף בטא: ${new Date(details.to.ends_at).toLocaleDateString('he-IL')}, הטבה לכולם: ${details.to.everyone_pro ? 'כן' : 'לא'}`;
  }
  return '';
}

export default function AuditLog({ onError }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        if (!cancelled) setRows(data || []);
      } catch (e) {
        console.error('Failed to load audit log:', e);
        onError?.('שגיאה בטעינת יומן הפעולות');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-center py-12 text-muted-foreground">עדיין אין פעולות ביומן</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="bg-card border border-border rounded-2xl p-4 text-right text-sm">
          <p className="font-medium text-foreground">
            {ACTIONS[r.action] || r.action} · {TARGETS[r.target_type] || r.target_type}
            {describeDetails(r.details) ? ` ${describeDetails(r.details)}` : ''}
          </p>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {new Date(r.created_at).toLocaleString('he-IL')} · {r.target_id}
          </p>
        </li>
      ))}
    </ul>
  );
}
