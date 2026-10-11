import React, { useState } from 'react';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { shareText, tripUrl, whatsappUrl } from '@/lib/tripUtils';

/**
 * Share a published trip: WhatsApp, the phone's own share sheet (which offers Instagram and the rest),
 * or copy the link. Instagram has no direct share link for websites, so the link is what travels.
 */
export default function TripShare({ trip, stopNames, km }) {
  const [copied, setCopied] = useState(false);
  const url = tripUrl(window.location.origin, trip.id);
  const text = shareText({ title: trip.title, stopNames, km, url });
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('העתק את הקישור:', url);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: trip.title, text: text.replace(url, '').trim(), url });
    } catch {
      /* closed by the user */
    }
  };

  const buttonCls =
    'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary';

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="שיתוף המסלול">
      <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" className={`${buttonCls} !border-green-600 !bg-green-600 !text-white hover:!bg-green-700`}>
        <MessageCircle size={16} aria-hidden="true" />
        וואטסאפ
      </a>
      {canNativeShare && (
        <button type="button" onClick={nativeShare} className={buttonCls}>
          <Share2 size={16} aria-hidden="true" />
          שתף (אינסטגרם ועוד)
        </button>
      )}
      <button type="button" onClick={copy} className={buttonCls}>
        {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
        {copied ? 'הקישור הועתק' : 'העתק קישור'}
      </button>
      {!canNativeShare && <p className="w-full text-xs text-muted-foreground">לאינסטגרם: העתק את הקישור והדבק אותו בסטורי, בפוסט או בביו.</p>}
    </div>
  );
}
