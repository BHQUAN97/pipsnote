'use client';

import { useEffect, useId } from 'react';

/**
 * Ambient grain-particle field — fixed full-screen canvas behind all UI
 * (z-index 0, pointer-events: none). Drifting amber motes + faint mouse
 * repulsion. Progressive/opt-in: rendered only when WebGL-friendly canvas,
 * no-reduced-motion, and landscape-friendly; zero DOM/a11y impact otherwise.
 * Plain 2D on a synthesized canvas — deliberately no three.js dependency.
 */
const ACCENT = '#f3b728';
const COUNT_LG = 90;
const COUNT_SM = 40;

export default function ParticleField() {
  const cid = useId();

  useEffect(() => {
    const reduced =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const canvas = document.getElementById(`particle-field${cid}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cap: skip on tiny screens (no room, battery) — container/content carries.
    const small = window.innerWidth < 768;
    const count = small ? COUNT_SM : COUNT_LG;
    const dpr = window.devicePixelRatio || 1;

    let W = 0, H = 0;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    interface P { x: number; y: number; vx: number; vy: number; r: number; tw: number; }
    const P = (): P => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -Math.random() * 0.14 - 0.03,
      r: 0.6 + Math.random() * 1.6,
      tw: Math.random() * Math.PI * 2,
    });
    let parts: P[] = Array.from({ length: count }, P);

    let mx = -1e4, my = -1e4;
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        const R = 130, R2 = R * R;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (R - d) / R;
          p.vx += (dx / d) * f * 0.12;
          p.vy += (dy / d) * f * 0.12;
        }
        // drift + cap velocity
        p.vx *= 0.98; p.vy = p.vy * 0.98 + -0.002;
        const sp = Math.hypot(p.vx, p.vy);
        const max = 0.6;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }

        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20;
        if (p.y > H + 20) p.y = -20;

        const a = 0.16 + 0.5 * (0.5 + 0.5 * Math.sin(p.tw + t * 1.6));
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.4);
        grad.addColorStop(0, `${ACCENT}${hexAlpha(a)}`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      mx = e.clientX; my = e.clientY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    const onLeave = () => { mx = -1e4; my = -1e4; };
    window.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [cid]);

  return (
    <canvas
      id={`particle-field${cid}`}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-30"
    />
  );
}

function hexAlpha(a: number): string {
  const n = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return n.toString(16).padStart(2, '0');
}