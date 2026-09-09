'use client';

import { useEffect } from 'react';

/**
 * Scroll-reveal engine. Watches `.k-line` (kinetic mask lines) and `[data-fade]`
 * (cards/rows) and flips them to `.is-in` as they enter the viewport.
 * Stagger: consecutive `[data-fade]` siblings offset automatically.
 * Pure enhancement — if JS is off, elements are already visible via
 * `prefers-reduced-motion` + SSR defaults defined in globals.css.
 */
export default function MotionController() {
  useEffect(() => {
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const HIDDEN = '.k-line:not(.is-in), [data-fade]:not(.is-in)';
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;

          // Stagger: measure distance from the first [data-fade] sibling.
          let delay = 0;
          if (el.dataset && el.dataset.fade !== undefined) {
            let sib = el.previousElementSibling;
            while (sib) {
              if (sib.hasAttribute && sib.hasAttribute('data-fade')) delay += 90;
              sib = sib.previousElementSibling;
            }
          }
          if (delay) el.style.transitionDelay = `${delay}ms`;
          el.classList.add('is-in');
          observer.unobserve(el);
        }
        // Filter out 0-rect entries that fired immediately (above the fold reveal).
        null;
      },
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
    );

    const nodes = Array.from(document.querySelectorAll(HIDDEN));
    for (const n of nodes) observer.observe(n);

    // Force-reveal anything already on screen (hero above the fold).
    requestAnimationFrame(() => {
      for (const n of nodes) {
        const el = n as HTMLElement;
        if (el.classList.contains('is-in') || el.style.transitionDelay) continue;
        const r = n.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.85 && r.bottom > 0) {
          el.classList.add('is-in');
        }
      }
    });

    return () => observer.disconnect();
  }, []);

  return null;
}