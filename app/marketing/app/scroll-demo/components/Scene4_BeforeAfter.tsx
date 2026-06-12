"use client";

import {
  sceneProgress,
  SCENES,
  useScrollProgress,
} from "../hooks/useScrollProgress";
import { IconCheck, IconClock } from "./icons";

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
      className="sticky top-0 h-[100svh] transition-opacity duration-300"
      style={{ opacity: inScene ? 1 : 0 }}
    >
      <div className="relative h-full w-full overflow-hidden">
        {/* Before: the raw blueprint, desaturated */}
        <div className="absolute inset-0 bg-ink">
          <div
            className="absolute inset-0 opacity-55 grayscale"
            style={{
              backgroundImage: "url(/textures/blueprint.webp)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-ink/45" />
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-2xl font-medium tracking-[0.3em] text-stone md:text-4xl">
            FLOOR PLAN
          </p>
          <span className="absolute bottom-24 left-6 inline-flex items-center gap-2 rounded-full border border-off-white/15 bg-ink/80 px-4 py-2 font-sans text-sm font-medium text-stone md:left-12">
            <IconClock className="h-4 w-4 text-stone-dim" />
            1–2 weeks revisions
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
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-2xl font-medium tracking-[0.3em] text-off-white drop-shadow-lg md:text-4xl">
            STYLED ROOM
          </p>
          <span className="absolute bottom-24 right-6 inline-flex items-center gap-2 rounded-full border border-terracotta/40 bg-terracotta/20 px-4 py-2 font-sans text-sm font-medium text-off-white md:right-12">
            <IconCheck className="h-4 w-4 text-terracotta-soft" />
            2 minutes
          </span>
        </div>

        {/* Wipe seam */}
        <div
          className="absolute top-0 h-full w-0.5 bg-gradient-to-b from-terracotta/0 via-terracotta-soft to-terracotta/0 shadow-[0_0_18px_rgba(217,139,106,0.8)]"
          style={{ left: `${t * 100}%` }}
        />

        <div className="absolute inset-x-0 top-16 px-6 text-center md:top-24">
          <p className="font-sans text-sm text-off-white/85 md:text-base">
            <span className="text-stone line-through decoration-stone-dim">
              Week 1–2 of back-and-forth
            </span>
            <span className="mx-3 text-stone-dim">→</span>
            <span className="font-medium text-terracotta-soft">
              &lt; 2 minutes with DesignDesk
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
