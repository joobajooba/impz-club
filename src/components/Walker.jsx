import { useEffect, useRef } from "react";

const CELL = 16;
const DIRS = 4;
const WALK_FRAMES = 4;
const SCALE = 2;
const SIZE = CELL * SCALE;
const IDLE_SHEET_W = SIZE * DIRS;
const IDLE_SHEET_H = SIZE;
const WALK_SHEET_W = SIZE * DIRS;
const WALK_SHEET_H = SIZE * WALK_FRAMES;
const SPEED = 130;
const WALK_MS = 120;
const IDLE_MS = 280;

const IDLE_SRC = "/walker-idle.png";
const WALK_SRC = "/walker-walk.png";

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
    idleFrame: 0,
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
      sprite.style.transform = `translate(${s.x}px, ${s.y}px)`;
      if (s.walking) {
        sprite.style.backgroundImage = `url(${WALK_SRC})`;
        sprite.style.backgroundSize = `${WALK_SHEET_W}px ${WALK_SHEET_H}px`;
        sprite.style.backgroundPosition = `-${s.dir * SIZE}px -${s.frame * SIZE}px`;
      } else {
        sprite.style.backgroundImage = `url(${IDLE_SRC})`;
        sprite.style.backgroundSize = `${IDLE_SHEET_W}px ${IDLE_SHEET_H}px`;
        sprite.style.backgroundPosition = `-${s.dir * SIZE}px 0`;
        const bob = s.idleFrame ? SCALE : 0;
        sprite.style.transform = `translate(${s.x}px, ${s.y + bob}px)`;
      }
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
          if (s.elapsed >= WALK_MS) {
            s.elapsed -= WALK_MS;
            s.frame = (s.frame + 1) % WALK_FRAMES;
          }
        }
        paint();
      } else if (s.walking) {
        s.walking = false;
        s.frame = 0;
        s.elapsed = 0;
        paint();
      } else {
        s.elapsed += dt * 1000;
        if (s.elapsed >= IDLE_MS) {
          s.elapsed -= IDLE_MS;
          s.idleFrame = s.idleFrame ? 0 : 1;
          paint();
        }
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
    s.dir = facing(s.tx - s.x, s.ty - s.y);
    s.walking = true;
    s.frame = 0;
    s.elapsed = 0;
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
          backgroundImage: `url(${IDLE_SRC})`,
          backgroundSize: `${IDLE_SHEET_W}px ${IDLE_SHEET_H}px`,
        }}
      />
      <p className="portal-hint">Click to walk</p>
    </div>
  );
}
