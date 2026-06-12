"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { startScrollTracking } from "../hooks/useScrollProgress";

gsap.registerPlugin(ScrollTrigger, CustomEase);

let easesRegistered = false;

/** Live Lenis instance, for programmatic scrolling (e.g. hero ghost button). */
export let lenisInstance: Lenis | null = null;

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!easesRegistered) {
      CustomEase.create("cinematicSilk", "0.45, 0.05, 0.55, 0.95");
      CustomEase.create("snapCard", "0.34, 1.56, 0.64, 1");
      easesRegistered = true;
    }

    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      touchMultiplier: 2.0,
    });
    lenisInstance = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const stopTracking = startScrollTracking();
    ScrollTrigger.refresh();
    if (process.env.NODE_ENV !== "production" || true) {
      (window as unknown as Record<string, unknown>).__lenis = lenis;
      (window as unknown as Record<string, unknown>).__ScrollTrigger =
        ScrollTrigger;
    }

    return () => {
      stopTracking();
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  return <>{children}</>;
}
