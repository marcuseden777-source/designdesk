"use client";

import { LenisProvider } from "./components/LenisProvider";
import ScrollCanvas from "./components/ScrollCanvas";
import MobileFallback from "./components/MobileFallback";
import { Scene1Overlay } from "./components/Scene1_Hero";
import { Scene2Overlay } from "./components/Scene2_Upload";
import { Scene3Overlay } from "./components/Scene3_Styles";
import { Scene4Overlay } from "./components/Scene4_BeforeAfter";
import { Scene5Overlay } from "./components/Scene5_Quote";
import { Scene6Overlay } from "./components/Scene6_Workflow";
import { Scene7Overlay } from "./components/Scene7_CTA";
import { useDeviceCheck } from "./hooks/useDeviceCheck";

function LoadingSkeleton() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-ink">
      <div className="flex flex-col items-center gap-4">
        <div className="h-24 w-20 animate-pulse rounded-lg border border-slate-700 bg-slate-900" />
        <div className="h-3 w-32 animate-pulse rounded-full bg-slate-800" />
      </div>
    </div>
  );
}

/**
 * The full DesignDesk scroll experience. Rendered at both `/` (the front
 * door) and `/scroll-demo`. Capable devices get the WebGL story; low-end or
 * offline-leaning devices get the CSS scroll-snap fallback.
 */
export default function ScrollExperience() {
  const { ready, useFallback } = useDeviceCheck();

  // SSR + first client paint: neutral skeleton until the device check runs.
  if (!ready) return <LoadingSkeleton />;

  // Low-end path renders OUTSIDE Lenis so CSS scroll-snap works natively.
  if (useFallback) return <MobileFallback />;

  return (
    <LenisProvider>
      <main
        style={{
          height: "1150svh",
          position: "relative",
          background:
            "linear-gradient(rgba(13, 10, 8, 0.82), rgba(10, 8, 6, 0.88)), url(/textures/backdrop.webp) center / cover fixed no-repeat #0d0a08",
        }}
      >
        <ScrollCanvas />
        {/* Cinematic warm vignette between canvas and overlay content */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(8, 5, 3, 0.55) 100%)",
          }}
        />
        {/* Top scrim keeps the brand mark legible over any scene */}
        <div
          aria-hidden
          className="fixed inset-x-0 top-0 z-10 h-24"
          style={{
            pointerEvents: "none",
            background:
              "linear-gradient(rgba(8, 5, 3, 0.55), rgba(8, 5, 3, 0))",
          }}
        />
        {/* Brand wordmark */}
        <div
          className="fixed left-5 top-5 z-20 md:left-6 md:top-6"
          style={{ pointerEvents: "none" }}
        >
          <p className="text-xs font-semibold tracking-[0.3em] text-white/85 md:text-sm md:tracking-[0.35em]">
            DESIGN<span className="text-teal-300">DESK</span>
          </p>
        </div>
        <div
          style={{ position: "relative", zIndex: 10, pointerEvents: "none" }}
        >
          <section style={{ height: "150svh" }}>
            <Scene1Overlay />
          </section>
          <section style={{ height: "150svh" }}>
            <Scene2Overlay />
          </section>
          <section style={{ height: "200svh" }}>
            <Scene3Overlay />
          </section>
          <section style={{ height: "150svh" }}>
            <Scene4Overlay />
          </section>
          <section style={{ height: "150svh" }}>
            <Scene5Overlay />
          </section>
          <section style={{ height: "200svh" }}>
            <Scene6Overlay />
          </section>
          <section style={{ height: "150svh" }}>
            <Scene7Overlay />
          </section>
        </div>
      </main>
    </LenisProvider>
  );
}
