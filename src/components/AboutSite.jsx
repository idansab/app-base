import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail } from 'lucide-react';
import { ABOUT_SUMMARY, ABOUT_VISION, ABOUT_SOURCES, CONTACT_EMAIL } from '@/lib/siteAbout';

const TONES = {
  light: {
    box: 'border-border bg-card/70',
    strong: 'text-foreground',
    body: 'text-muted-foreground',
    link: 'text-primary',
  },
  // on the dark footer
  dark: {
    box: 'border-slate-600 bg-slate-800/60',
    strong: 'text-white',
    body: 'text-slate-300',
    link: 'text-green-400',
  },
};

/**
 * Short "who we are": a one-line toggle, with the vision, where the places come from and how to reach us
 * a tap away. The text is always in the page, so filters and crawlers read it too.
 */
export default function AboutSite({ tone = 'light' }) {
  const t = TONES[tone] || TONES.light;
  return (
    <details className={`group mx-auto max-w-2xl rounded-2xl border text-right ${t.box}`}>
      <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden ${t.strong}`}>
        <span>מי אנחנו ואיך נאספו המקומות</span>
        <ChevronDown size={18} className={`shrink-0 transition-transform group-open:rotate-180 ${t.body}`} aria-hidden="true" />
      </summary>
      <div className={`space-y-3 px-4 pb-4 text-sm leading-relaxed ${t.body}`}>
        <p className={t.strong}>{ABOUT_SUMMARY}</p>
        <p>
          <span className={`font-semibold ${t.strong}`}>החזון: </span>
          {ABOUT_VISION}
        </p>
        <ul className="space-y-2">
          {ABOUT_SOURCES.map((s) => (
            <li key={s.title}>
              <span className={`font-semibold ${t.strong}`}>{s.title}: </span>
              {s.text}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <Link to="/about" className={`font-medium hover:underline ${t.link}`}>
            עוד עלינו ←
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className={`inline-flex items-center gap-1.5 hover:underline ${t.strong}`}>
            <Mail size={14} aria-hidden="true" />
            <span dir="ltr">{CONTACT_EMAIL}</span>
          </a>
        </div>
      </div>
    </details>
  );
}
