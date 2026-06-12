"use client";

import {
  sceneProgress,
  SCENES,
  useScrollProgress,
} from "../hooks/useScrollProgress";

/**
 * Scene 4 is carried entirely by the full-screen HTML split — real blueprint
 * vs the generated styled-room photo. No 3D props needed; the shared dust
 * field keeps depth alive behind the translucent edges.
 */
export default function Scene4BeforeAfter() {
  return null;
}

/** HTML overlay — 50/50 split with scroll-driven clip-path wipe. */
export function Scene4Overlay() {
  const p = useScrollProgress();
  const inScene = p >= SCENES.beforeAfter.start && p < SCENES.beforeAfter.end;
  const t = sceneProgress(p, SCENES.beforeAfter);
  const wipe = 100 - t * 100;

  return (
    <div
      className="sticky top-0 h-screen transition-opacity duration-300"
      style={{ opacity: inScene ? 1 : 0 }}
    >
      <div className="relative h-full w-full overflow-hidden">
        {/* Before: the raw blueprint, desaturated */}
        <div className="absolute inset-0 bg-slate-900">
          <div
            className="absolute inset-0 opacity-60 grayscale"
            style={{
              backgroundImage: "url(/textures/blueprint.webp)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-slate-950/40" />
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold tracking-[0.3em] text-slate-300 md:text-4xl">
            FLOOR PLAN
          </p>
          <span className="absolute bottom-24 left-6 rounded-full bg-red-950/80 px-4 py-2 text-sm font-medium text-red-300 md:left-12">
            ❌ 1–2 weeks revisions
          </span>
        </div>

        {/* After: generated styled room, wiped in by scroll */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${wipe}% 0 0)` }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url(/textures/room-after.webp)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/40" />
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold tracking-[0.3em] text-white drop-shadow-lg md:text-4xl">
            STYLED ROOM
          </p>
          <span className="absolute bottom-24 right-6 rounded-full bg-green-950/80 px-4 py-2 text-sm font-medium text-green-300 md:right-12">
            ✅ 2 minutes
          </span>
        </div>

        {/* Wipe seam */}
        <div
          className="absolute top-0 h-full w-0.5 bg-gradient-to-b from-teal-400/0 via-teal-300 to-teal-400/0 shadow-[0_0_18px_rgba(45,212,191,0.8)]"
          style={{ left: `${t * 100}%` }}
        />

        <div className="absolute inset-x-0 top-16 text-center md:top-24">
          <p className="text-sm text-slate-200 md:text-base">
            <span className="text-red-300 line-through decoration-red-400/70">
              Week 1–2 of back-and-forth
            </span>
            <span className="mx-3 text-slate-400">→</span>
            <span className="font-semibold text-green-300">
              &lt; 2 minutes with DesignDesk
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
