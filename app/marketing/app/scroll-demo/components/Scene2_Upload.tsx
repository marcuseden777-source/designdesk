"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { gsap } from "gsap";
import {
  clamp01,
  sceneProgress,
  SCENES,
  scrollState,
  useScrollProgress,
} from "../hooks/useScrollProgress";
import { BlueprintSheet } from "./Scene1_Hero";
import { useImageTextures } from "./assets";

export const APARTMENT_STYLES = [
  { name: "Japandi", slug: "japandi" },
  { name: "Scandinavian", slug: "scandinavian" },
  { name: "Industrial", slug: "industrial" },
  { name: "Art Deco", slug: "art-deco" },
  { name: "Biophilic", slug: "biophilic" },
] as const;

type StyleSlug = (typeof APARTMENT_STYLES)[number]["slug"];

const apartmentUrl = (slug: StyleSlug) =>
  `/textures/plans/apartment-${slug}.webp`;

/**
 * Shared selection between the HTML chips (writer) and the R3F scene
 * (reader, polled in useFrame) — avoids re-rendering the canvas on click.
 */
const styleSelection: { slug: StyleSlug } = { slug: "japandi" };

const SWITCH_DURATION = 0.8; // seconds for the click-triggered re-generate sweep

/**
 * Scene 2 — the floor plan settles onto a warm presentation surface while
 * the camera glides down. A scan beam sweeps the sheet as the raw blueprint
 * dissolves into the AI-furnished render. Once the scan completes, style
 * chips let the user "generate" the same plan in other styles: each click
 * re-runs the beam sweep and crossfades to that design.
 */
export default function Scene2Upload() {
  const group = useRef<THREE.Group>(null);
  const sheet = useRef<THREE.Group>(null);
  const baseMat = useRef<THREE.MeshBasicMaterial>(null);
  const incomingMat = useRef<THREE.MeshBasicMaterial>(null);
  const beam = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  const urls = useRef(APARTMENT_STYLES.map((s) => apartmentUrl(s.slug)));
  const textures = useImageTextures(urls.current);

  const shown = useRef<StyleSlug>("japandi");
  const switching = useRef<{ to: StyleSlug; start: number } | null>(null);

  const textureFor = (slug: StyleSlug) =>
    textures[APARTMENT_STYLES.findIndex((s) => s.slug === slug)] ?? null;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const p = scrollState.progress;
    const visible = p >= SCENES.upload.start && p < SCENES.upload.end;
    group.current.visible = visible;
    if (!visible) return;

    const t = sceneProgress(p, SCENES.upload);
    if (sheet.current) {
      sheet.current.rotation.x = THREE.MathUtils.lerp(-0.3, -1.18, t);
      sheet.current.position.y = THREE.MathUtils.lerp(0.1, -0.42, t);
      sheet.current.scale.setScalar(THREE.MathUtils.lerp(1, 1.1, t));
    }

    // Scroll-driven reveal: designed plan fully visible by t ≈ 0.77,
    // well before the scroll leaves the scene.
    const reveal = clamp01((t - 0.38) * 2.6);
    if (baseMat.current) {
      if (!baseMat.current.map) {
        const tex = textureFor(shown.current);
        if (tex) {
          baseMat.current.map = tex;
          baseMat.current.needsUpdate = true;
        }
      }
      baseMat.current.opacity = reveal;
    }

    // Click-triggered "generate" switch: beam re-sweep + crossfade.
    const now = clock.elapsedTime;
    if (!switching.current && styleSelection.slug !== shown.current) {
      const tex = textureFor(styleSelection.slug);
      if (tex && incomingMat.current) {
        incomingMat.current.map = tex;
        incomingMat.current.needsUpdate = true;
        switching.current = { to: styleSelection.slug, start: now };
      }
    }

    let beamT: number | null = null;
    if (switching.current) {
      const s = clamp01((now - switching.current.start) / SWITCH_DURATION);
      beamT = s;
      if (incomingMat.current) incomingMat.current.opacity = s * reveal;
      if (s >= 1) {
        shown.current = switching.current.to;
        if (baseMat.current && incomingMat.current?.map) {
          baseMat.current.map = incomingMat.current.map;
          baseMat.current.needsUpdate = true;
        }
        if (incomingMat.current) incomingMat.current.opacity = 0;
        switching.current = null;
      }
    } else {
      // Scroll-driven scan sweep on first reveal.
      const scanT = clamp01((t - 0.26) / 0.48);
      if (scanT > 0 && scanT < 1) beamT = scanT;
    }

    if (beam.current) {
      const mat = beam.current.material as THREE.MeshBasicMaterial;
      if (beamT === null) {
        mat.opacity = 0;
      } else {
        beam.current.position.y = THREE.MathUtils.lerp(1.85, -1.85, beamT);
        mat.opacity = Math.sin(beamT * Math.PI) * 0.9;
      }
    }
    if (light.current) {
      light.current.intensity = t * 2.2;
    }
  });

  return (
    <group ref={group} visible={false}>
      <group ref={sheet} rotation={[-0.3, 0, 0]}>
        <BlueprintSheet rotation={[0, 0, 0]} />
        {/* Currently shown AI-furnished design */}
        <mesh position-z={0.004}>
          <planeGeometry args={[2.5, 3.5]} />
          <meshBasicMaterial
            ref={baseMat}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        {/* Incoming design during a click-triggered generate */}
        <mesh position-z={0.008}>
          <planeGeometry args={[2.5, 3.5]} />
          <meshBasicMaterial
            ref={incomingMat}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        {/* Analysis scan beam, sweeps top → bottom in sheet space */}
        <mesh ref={beam} position={[0, 1.85, 0.012]}>
          <planeGeometry args={[2.7, 0.045]} />
          <meshBasicMaterial
            color="#5eead4"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
      {/* Quiet warm floor catching the lamp light */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.15, 0]}>
        <circleGeometry args={[5, 48]} />
        <meshStandardMaterial color="#15110d" roughness={1} />
      </mesh>
      <pointLight
        ref={light}
        color="#ffb35c"
        position={[1.2, 2.2, 1.4]}
        intensity={0}
        distance={11}
      />
    </group>
  );
}

const CALLOUTS = [
  { label: "Living", className: "left-[14%] top-[40%] md:left-[26%]" },
  { label: "Bed 1", className: "right-[12%] top-[36%] md:right-[26%]" },
  { label: "Kitchen", className: "left-[16%] bottom-[30%] md:left-[29%]" },
  { label: "Bath", className: "right-[14%] bottom-[34%] md:right-[28%]" },
];

/** HTML overlay — timing cards, scan status, room callouts, style picker. */
export function Scene2Overlay() {
  const p = useScrollProgress();
  const daysRef = useRef<HTMLSpanElement>(null);
  const minsRef = useRef<HTMLSpanElement>(null);
  const played = useRef(false);
  const [selected, setSelected] = useState<StyleSlug>("japandi");
  const [generating, setGenerating] = useState(false);

  const inScene = p >= SCENES.upload.start && p < SCENES.upload.end + 0.02;
  const t = sceneProgress(p, SCENES.upload);
  const scanPct = Math.round(clamp01((t - 0.26) / 0.48) * 100);
  const scanDone = t >= 0.76;

  useEffect(() => {
    if (p < 0.18 || played.current || !daysRef.current || !minsRef.current) {
      return;
    }
    played.current = true;
    const counters = { days: 0, mins: 0 };
    gsap.to(counters, {
      days: 5,
      duration: 1.4,
      ease: "power1.out",
      onUpdate: () => {
        if (daysRef.current) {
          daysRef.current.textContent = `${Math.round(counters.days)}`;
        }
      },
    });
    gsap.to(counters, {
      mins: 2,
      duration: 1.4,
      ease: "power1.out",
      onUpdate: () => {
        if (minsRef.current) {
          minsRef.current.textContent = `${Math.round(counters.mins)}`;
        }
      },
    });
  }, [p]);

  const pickStyle = (slug: StyleSlug) => {
    if (slug === selected) return;
    setSelected(slug);
    setGenerating(true);
    styleSelection.slug = slug;
    window.setTimeout(() => setGenerating(false), SWITCH_DURATION * 1000 + 150);
  };

  const selectedName =
    APARTMENT_STYLES.find((s) => s.slug === selected)?.name ?? "Japandi";

  return (
    <div
      className="sticky top-0 h-screen transition-opacity duration-300"
      style={{ opacity: inScene ? 1 : 0 }}
    >
      <div className="relative flex h-full flex-col items-center justify-between px-4 pb-8 pt-8 md:px-6 md:pb-10 md:pt-12">
        {/* Timing comparison — compact, anchored top */}
        <div className="grid w-full max-w-xl grid-cols-2 gap-3 md:gap-5">
          <div className="rounded-xl border border-red-500/25 bg-red-950/45 px-4 py-3 text-center backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.25em] text-red-400 md:text-xs">
              Traditional way
            </p>
            <p className="mt-1 text-2xl font-bold text-red-300 md:text-3xl">
              3–<span ref={daysRef}>0</span>
              <span className="ml-1.5 text-sm font-medium">days</span>
            </p>
          </div>
          <div className="rounded-xl border border-green-500/25 bg-green-950/45 px-4 py-3 text-center backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.25em] text-green-400 md:text-xs">
              DesignDesk
            </p>
            <p className="mt-1 text-2xl font-bold text-green-300 md:text-3xl">
              &lt;&nbsp;<span ref={minsRef}>0</span>
              <span className="ml-1.5 text-sm font-medium">min</span>
            </p>
          </div>
        </div>

        {/* Room callouts — pop in as the scan finds rooms */}
        {CALLOUTS.map((callout, i) => {
          const show = t > 0.32 + i * 0.1 && !scanDone;
          return (
            <div
              key={callout.label}
              className={`absolute flex items-center gap-2 ${callout.className}`}
              style={{
                opacity: show ? 1 : 0,
                transform: show ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 0.45s ease, transform 0.45s ease",
              }}
            >
              <span className="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_10px_rgba(94,234,212,0.9)]" />
              <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur-md">
                {callout.label}
              </span>
            </div>
          );
        })}

        {/* Bottom: style picker (after scan) + status chip */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex flex-wrap items-center justify-center gap-2"
            style={{
              opacity: scanDone ? 1 : 0,
              transform: scanDone ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
              pointerEvents: scanDone ? "auto" : "none",
            }}
          >
            <span className="mr-1 text-xs uppercase tracking-widest text-slate-400">
              Try a style
            </span>
            {APARTMENT_STYLES.map((style) => (
              <button
                key={style.slug}
                type="button"
                onClick={() => pickStyle(style.slug)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-md transition-all duration-200 hover:scale-105 ${
                  selected === style.slug
                    ? "border-teal-400 bg-teal-500/25 text-teal-200 shadow-[0_0_14px_rgba(45,212,191,0.35)]"
                    : "border-white/15 bg-black/50 text-slate-300 hover:border-teal-400/50 hover:text-teal-200"
                }`}
              >
                {style.name}
              </button>
            ))}
          </div>

          <div
            className={`flex items-center gap-2.5 rounded-full border px-5 py-2.5 backdrop-blur-md transition-colors duration-300 ${
              scanDone && !generating
                ? "border-green-400/40 bg-green-950/60"
                : "border-teal-400/40 bg-black/55"
            }`}
          >
            {!scanDone ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" />
                <span className="text-sm font-medium text-teal-100">
                  Analysing floor plan… {scanPct}%
                </span>
              </>
            ) : generating ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" />
                <span className="text-sm font-medium text-teal-100">
                  ✦ Generating {selectedName}…
                </span>
              </>
            ) : (
              <>
                <span className="text-green-300">✓</span>
                <span className="text-sm font-medium text-green-200">
                  {selectedName} ready — 20 designs + quote
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
