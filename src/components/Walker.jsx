import { useEffect, useRef } from "react";

const CELL = 64;
const FRAMES = 2;
const SCALE = 1;
const SIZE = CELL * SCALE;
const SHEET_W = SIZE * FRAMES;
const SHEET_H = SIZE;
const SPEED = 130;
const FRAME_MS = 160;

export default function Walker() {
  const panelRef = useRef(null);
  const spriteRef = useRef(null);
  const state = useRef({
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    facing: 1,
    frame: 0,
    walking: false,
    elapsed: 0,
  });

  useEffect(() => {
    const panel = panelRef.current;
    const sprite = spriteRef.current;
    if (!panel || !sprite) return;

    function bounds() {
      return {
        maxX: Math.max(0, panel.clientWidth - SIZE),
        maxY: Math.max(0, panel.clientHeight - SIZE),
      };
    }

    function paint() {
      const s = state.current;
      sprite.style.transform = `translate(${s.x}px, ${s.y}px) scaleX(${s.facing})`;
      sprite.style.backgroundPosition = `-${s.frame * SIZE}px 0`;
    }

    function place(x, y) {
      const { maxX, maxY } = bounds();
      state.current.x = Math.min(maxX, Math.max(0, x));
      state.current.y = Math.min(maxY, Math.max(0, y));
      paint();
    }

    const { maxX, maxY } = bounds();
    place(maxX / 2, maxY / 2);
    state.current.tx = state.current.x;
    state.current.ty = state.current.y;

    let last = performance.now();
    let raf = 0;

    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const dist = Math.hypot(dx, dy);

      if (s.walking && dist > 1) {
        if (Math.abs(dx) > 2) s.facing = dx < 0 ? -1 : 1;
        const step = SPEED * dt;
        if (step >= dist) {
          place(s.tx, s.ty);
          s.walking = false;
          s.frame = 0;
          s.elapsed = 0;
        } else {
          place(s.x + (dx / dist) * step, s.y + (dy / dist) * step);
          s.elapsed += dt * 1000;
          if (s.elapsed >= FRAME_MS) {
            s.elapsed -= FRAME_MS;
            s.frame = (s.frame + 1) % FRAMES;
          }
        }
        paint();
      } else if (s.walking) {
        s.walking = false;
        s.frame = 0;
        s.elapsed = 0;
        paint();
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    function onResize() {
      const next = bounds();
      place(state.current.x, state.current.y);
      state.current.tx = Math.min(next.maxX, state.current.tx);
      state.current.ty = Math.min(next.maxY, state.current.ty);
    }

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  function onWalk(event) {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const point = event.changedTouches ? event.changedTouches[0] : event;
    const s = state.current;
    const maxX = Math.max(0, panel.clientWidth - SIZE);
    const maxY = Math.max(0, panel.clientHeight - SIZE);
    s.tx = Math.min(maxX, Math.max(0, point.clientX - rect.left - SIZE / 2));
    s.ty = Math.min(maxY, Math.max(0, point.clientY - rect.top - SIZE / 2));
    if (Math.abs(s.tx - s.x) > 2) s.facing = s.tx < s.x ? -1 : 1;
    s.walking = true;
  }

  return (
    <div
      className="portal-panel"
      ref={panelRef}
      onClick={onWalk}
      role="application"
      aria-label="Click to walk"
    >
      <div
        ref={spriteRef}
        className="portal-walker"
        style={{
          width: SIZE,
          height: SIZE,
          backgroundSize: `${SHEET_W}px ${SHEET_H}px`,
        }}
      />
      <p className="portal-hint">Click to walk</p>
    </div>
  );
}
