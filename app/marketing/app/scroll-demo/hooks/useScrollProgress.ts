"use client";

import { useEffect, useState } from "react";

/**
 * Mutable singleton — read directly inside R3F useFrame loops so 3D scenes
 * never re-render on scroll. HTML overlays subscribe via useScrollProgress().
 */
export const scrollState = { progress: 0 };

/** Scene scroll ranges as fractions of total page scroll (1150vh). */
export const SCENES = {
  hero: { start: 0, end: 0.13 },
  upload: { start: 0.13, end: 0.26 },
  styles: { start: 0.26, end: 0.435 },
  beforeAfter: { start: 0.435, end: 0.565 },
  quote: { start: 0.565, end: 0.695 },
  workflow: { start: 0.695, end: 0.87 },
  cta: { start: 0.87, end: 1 },
} as const;

export type SceneRange = { start: number; end: number };

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Normalised [0,1] progress within a single scene's scroll range. */
export function sceneProgress(p: number, scene: SceneRange): number {
  return clamp01((p - scene.start) / (scene.end - scene.start));
}

const SCENE_ORDER: SceneRange[] = [
  SCENES.hero,
  SCENES.upload,
  SCENES.styles,
  SCENES.beforeAfter,
  SCENES.quote,
  SCENES.workflow,
  SCENES.cta,
];

/** 1-based active scene number for a given global scroll progress. */
export function activeSceneIndex(p: number): number {
  for (let i = 0; i < SCENE_ORDER.length; i++) {
    if (p < SCENE_ORDER[i].end) return i + 1;
  }
  return SCENE_ORDER.length;
}

/**
 * Starts the global scroll listener that keeps scrollState in sync.
 * Lenis scrolls the native window, so window.scrollY stays accurate.
 * Returns a cleanup function.
 */
export function startScrollTracking(): () => void {
  const update = () => {
    const max =
      document.documentElement.scrollHeight - window.innerHeight;
    scrollState.progress = max > 0 ? clamp01(window.scrollY / max) : 0;
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  return () => {
    window.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
  };
}

/**
 * React state mirror of scrollState for HTML overlays. Updates via rAF and
 * only when the value meaningfully changes, to bound re-render cost.
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const loop = () => {
      if (Math.abs(scrollState.progress - last) > 0.0005) {
        last = scrollState.progress;
        setProgress(last);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return progress;
}
