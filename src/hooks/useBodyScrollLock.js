import { useEffect } from 'react';

// Several dialogs can be open at once: the page unlocks only when the last one closes.
let locks = 0;
let saved = null;

/**
 * Stops the page behind a dialog from scrolling while `active` is true.
 * The scrollbar width is kept as padding so the page does not jump sideways.
 */
export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const { body, documentElement: html } = document;
    if (locks === 0) {
      const scrollbar = window.innerWidth - html.clientWidth;
      saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      body.style.overflow = 'hidden';
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0 && saved) {
        body.style.overflow = saved.overflow;
        body.style.paddingRight = saved.paddingRight;
        saved = null;
      }
    };
  }, [active]);
}
