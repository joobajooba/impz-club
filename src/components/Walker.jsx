import { useEffect, useRef } from "react";

const CELL = 16;
const COLS = 4;
const ROWS = 4;
const SCALE = 4;
const SIZE = CELL * SCALE;
const SHEET = SIZE * COLS;
const SPEED = 130;
const FRAME_MS = 130;

function facing(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 2 : 3;
  return dy < 0 ? 1 : 0;
}

export default function Walker() {
  const panelRef = useRef(null);
  const spriteRef = useRef(null);
  const state = useRef({
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    dir: 0,
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

    function place(x, y) {
      const { maxX, maxY } = bounds();
      const nextX = Math.min(maxX, Math.max(0, x));
      const nextY = Math.min(maxY, Math.max(0, y));
      state.current.x = nextX;
      state.current.y = nextY;
      sprite.style.transform = `translate(${nextX}px, ${nextY}px)`;
    }

    function paint() {
      const { dir, frame } = state.current;
      sprite.style.backgroundPosition = `-${dir * SIZE}px -${frame * SIZE}px`;
    }

    const { maxX, maxY } = bounds();
    place(maxX / 2, maxY / 2);
    state.current.tx = state.current.x;
    state.current.ty = state.current.y;
    paint();

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
        s.dir = facing(dx, dy);
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
            s.frame = (s.frame + 1) % ROWS;
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
      place(state.current.x, state.current.y);
      state.current.tx = Math.min(bounds().maxX, state.current.tx);
      state.current.ty = Math.min(bounds().maxY, state.current.ty);
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
    s.tx = point.clientX - rect.left - SIZE / 2;
    s.ty = point.clientY - rect.top - SIZE / 2;
    const { maxX, maxY } = {
      maxX: Math.max(0, panel.clientWidth - SIZE),
      maxY: Math.max(0, panel.clientHeight - SIZE),
    };
    s.tx = Math.min(maxX, Math.max(0, s.tx));
    s.ty = Math.min(maxY, Math.max(0, s.ty));
    s.dir = facing(s.tx - s.x, s.ty - s.y);
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
          backgroundSize: `${SHEET}px ${SHEET}px`,
        }}
      />
      <p className="portal-hint">Click to walk</p>
    </div>
  );
}
