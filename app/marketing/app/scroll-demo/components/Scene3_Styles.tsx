"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  clamp01,
  sceneProgress,
  SCENES,
  scrollState,
  useScrollProgress,
} from "../hooks/useScrollProgress";
import { useImageTextures } from "./assets";

/** Four real client floor plans, each restyled in five different looks. */
const PLANS = ["plan1", "plan2", "plan3", "plan4"] as const;

export const WAVE_STYLES = [
  { name: "Scandinavian", slug: "scandinavian" },
  { name: "Japandi", slug: "japandi" },
  { name: "Industrial", slug: "industrial" },
  { name: "Art Deco", slug: "art-deco" },
  { name: "Biophilic", slug: "biophilic" },
] as const;

const WAVES = WAVE_STYLES.length; // 5 waves × 4 plans = 20 designs
const CARDS_PER_WAVE = PLANS.length;

const beforeUrl = (plan: string) => `/textures/floorplans/${plan}-before.jpg`;
const afterUrl = (plan: string, style: string) =>
  `/textures/floorplans/${plan}-${style}.webp`;

function waveOf(t: number): number {
  return Math.min(WAVES - 1, Math.floor(t * WAVES));
}

function waveLocal(t: number, wave: number): number {
  return clamp01((t - wave / WAVES) * WAVES);
}

/**
 * Scene 3 — "20 styles" shown as 5 scroll-driven waves of 4 cards.
 * Each card is one of the user's real floor plans crossfading from the raw
 * 2D plan (before) to the AI-rendered styled floor plan (after).
 */
export default function Scene3Styles() {
  const group = useRef<THREE.Group>(null);
  const cardRefs = useRef<(THREE.Group | null)[]>([]);

  const beforeUrls = useMemo(() => PLANS.map(beforeUrl), []);
  const afterUrls = useMemo(
    () =>
      WAVE_STYLES.flatMap((style) =>
        PLANS.map((plan) => afterUrl(plan, style.slug))
      ),
    []
  );
  const beforeTextures = useImageTextures(beforeUrls);
  const afterTextures = useImageTextures(afterUrls);

  useFrame(({ viewport }) => {
    if (!group.current) return;
    const p = scrollState.progress;
    const visible = p >= SCENES.styles.start && p < SCENES.styles.end;
    group.current.visible = visible;
    if (!visible) return;

    const t = sceneProgress(p, SCENES.styles);
    const portrait = viewport.aspect < 1;

    for (let w = 0; w < WAVES; w++) {
      const s = waveLocal(t, w);
      const isActive = waveOf(t) === w;
      const entry = 1 - Math.pow(1 - clamp01(s / 0.22), 3);
      const cross = clamp01((s - 0.32) / 0.4);
      const exit = w < WAVES - 1 ? clamp01((s - 0.86) / 0.14) : 0;

      for (let i = 0; i < CARDS_PER_WAVE; i++) {
        const card = cardRefs.current[w * CARDS_PER_WAVE + i];
        if (!card) continue;
        card.visible = isActive;
        if (!isActive) continue;

        // Layout: row of 4 on landscape, 2×2 grid on portrait.
        let tx: number, ty: number;
        if (portrait) {
          tx = (i % 2 === 0 ? -1 : 1) * 0.78;
          ty = (i < 2 ? 1 : -1) * 0.92 - 0.1;
        } else {
          tx = (i - (CARDS_PER_WAVE - 1) / 2) * 1.5;
          ty = -0.1;
        }

        card.position.set(tx, ty, -2.5 + 2.5 * entry - exit * 0.8);
        card.rotation.y = portrait ? 0 : -(i - 1.5) * 0.07;
        card.scale.setScalar((0.7 + 0.3 * entry) * (1 - exit * 0.12));

        const [frame, before, after] = card.children as THREE.Mesh[];
        const fade = entry * (1 - exit);
        (frame.material as THREE.MeshBasicMaterial).opacity = fade * 0.92;
        (before.material as THREE.MeshBasicMaterial).opacity = fade;
        (after.material as THREE.MeshBasicMaterial).opacity = fade * cross;
      }
    }
  });

  return (
    <group ref={group} visible={false}>
      {WAVE_STYLES.map((style, w) =>
        PLANS.map((plan, i) => {
          const index = w * CARDS_PER_WAVE + i;
          return (
            <group
              key={`${style.slug}-${plan}`}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              visible={false}
            >
              {/* frame */}
              <mesh position-z={-0.012}>
                <planeGeometry args={[1.36, 1.36]} />
                <meshBasicMaterial color="#f5f0e8" transparent opacity={0} />
              </mesh>
              {/* before: the raw 2D floor plan */}
              <mesh>
                <planeGeometry args={[1.28, 1.28]} />
                <meshBasicMaterial
                  map={beforeTextures[i] ?? undefined}
                  color={beforeTextures[i] ? "#ffffff" : "#e2e8f0"}
                  transparent
                  opacity={0}
                  toneMapped={false}
                />
              </mesh>
              {/* after: AI-rendered styled floor plan, crossfaded in */}
              <mesh position-z={0.004}>
                <planeGeometry args={[1.28, 1.28]} />
                <meshBasicMaterial
                  map={afterTextures[index] ?? undefined}
                  color={afterTextures[index] ? "#ffffff" : "#1e293b"}
                  transparent
                  opacity={0}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        })
      )}
    </group>
  );
}

/** HTML overlay — heading, live style label, wave progress + before/after state. */
export function Scene3Overlay() {
  const p = useScrollProgress();
  const inScene = p >= SCENES.styles.start && p < SCENES.styles.end;
  const t = sceneProgress(p, SCENES.styles);
  const wave = waveOf(t);
  const s = waveLocal(t, wave);
  const showingAfter = s > 0.52;

  return (
    <div
      className="sticky top-0 flex h-screen flex-col items-center justify-between px-6 py-16 transition-opacity duration-300 md:py-20"
      style={{ opacity: inScene ? 1 : 0 }}
    >
      <div className="text-center">
        <h2 className="text-4xl font-black text-white md:text-6xl">
          20 styles. Your plan.
        </h2>
        <p className="mt-3 text-base text-slate-300 md:text-xl">
          Real floor plans, restyled by DesignDesk in seconds.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div
          className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-widest backdrop-blur-sm transition-colors duration-300 ${
            showingAfter
              ? "border border-teal-400/50 bg-teal-950/60 text-teal-300"
              : "border border-slate-500/50 bg-slate-900/60 text-slate-400"
          }`}
        >
          {showingAfter ? "✦ AI-styled" : "Original plan"}
        </div>
        <div className="flex items-center gap-4 rounded-full border border-white/10 bg-black/40 px-6 py-2.5 backdrop-blur-sm">
          <p className="text-base font-semibold text-white md:text-lg">
            {WAVE_STYLES[wave].name}
          </p>
          <div className="flex gap-1.5">
            {WAVE_STYLES.map((style, i) => (
              <span
                key={style.slug}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === wave ? "w-6 bg-teal-400" : "w-1.5 bg-white/25"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400">
            {wave * CARDS_PER_WAVE + 1}–{(wave + 1) * CARDS_PER_WAVE} of 20
          </p>
        </div>
      </div>
    </div>
  );
}
