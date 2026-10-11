import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const CONTACT_EMAIL = 'idansbah21@gmail.com';
export const LEGAL_UPDATED = '11 באוקטובר 2026';

/**
 * A legal document page. `sections` is [{ title, blocks }] and every block is
 * a paragraph (string) or a bullet list ({ list: [...] }).
 */
export default function LegalPage({ heading, title, intro, sections }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="px-4 max-w-4xl mx-auto py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg" aria-label="חזרה">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold">{heading}</h1>
        </div>
      </div>

      <div className="px-4 max-w-4xl mx-auto py-8 space-y-6 text-right">
        <section>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground mb-2">עדכון אחרון: {LEGAL_UPDATED}</p>
          {intro && <p className="text-foreground leading-relaxed">{intro}</p>}
        </section>

        {sections.map((section, index) => (
          <section key={section.title} className="space-y-3">
            <h3 className="text-lg font-semibold">{index + 1}. {section.title}</h3>
            {section.blocks.map((block, i) =>
              typeof block === 'string' ? (
                <p key={i} className="text-foreground leading-relaxed">{block}</p>
              ) : (
                <ul key={i} className="list-disc list-inside space-y-2 text-foreground leading-relaxed">
                  {block.list.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
