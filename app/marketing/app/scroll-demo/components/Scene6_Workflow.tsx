"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SCENES, scrollState } from "../hooks/useScrollProgress";
import { useBlueprintTexture } from "./Scene1_Hero";
import { styleUrl, useImageTexture, useImageTextures } from "./assets";

gsap.registerPlugin(ScrollTrigger);

const SATELLITE_SLUGS = [
  "japandi",
  "industrial",
  "art-deco",
  "biophilic",
  "coastal",
  "mid-century-modern",
];

/**
 * Scene 6 — the flat floor plan with six generated designs orbiting it
 * like satellites, while the camera (CameraRig) slowly circles the scene.
 */
export default function Scene6Workflow() {
  const group = useRef<THREE.Group>(null);
  const satellites = useRef<THREE.Group>(null);
  const blueprint = useBlueprintTexture();
  const apartmentPlan = useImageTexture("/textures/plans/apartment.webp");
  const texture = apartmentPlan ?? blueprint;
  const urls = useMemo(() => SATELLITE_SLUGS.map(styleUrl), []);
  const satelliteTextures = useImageTextures(urls);

  useFrame(({ clock, camera }, delta) => {
    if (!group.current) return;
    const p = scrollState.progress;
    group.current.visible =
      p >= SCENES.workflow.start && p < SCENES.workflow.end;
    if (!group.current.visible || !satellites.current) return;

    satellites.current.rotation.y += delta * 0.25;
    satellites.current.children.forEach((child, i) => {
      child.position.y = 0.9 + Math.sin(clock.elapsedTime * 0.8 + i * 2) * 0.1;
      // billboard each panel toward the orbiting camera
      child.lookAt(camera.position);
    });
  });

  return (
    <group ref={group} visible={false}>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.5, 0]}>
        <planeGeometry args={[2.5, 3.5]} />
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          emissive={apartmentPlan ? "#000000" : "#10243f"}
          emissiveIntensity={apartmentPlan ? 0 : 0.4}
          roughness={0.7}
        />
      </mesh>
      <group ref={satellites}>
        {SATELLITE_SLUGS.map((slug, i) => {
          const angle = (i / SATELLITE_SLUGS.length) * Math.PI * 2;
          return (
            <group
              key={slug}
              position={[Math.sin(angle) * 2.6, 0.9, Math.cos(angle) * 2.6]}
            >
              <mesh position-z={-0.01}>
                <planeGeometry args={[0.66, 0.92]} />
                <meshBasicMaterial color="#f5f0e8" side={THREE.DoubleSide} />
              </mesh>
              <mesh>
                <planeGeometry args={[0.6, 0.85]} />
                <meshBasicMaterial
                  map={satelliteTextures[i] ?? undefined}
                  color={satelliteTextures[i] ? "#ffffff" : "#1e293b"}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        })}
      </group>
      <pointLight position={[0, 3, 0]} intensity={1.2} color="#7dd3fc" />
    </group>
  );
}

const TRADITIONAL_STEPS = [
  { step: "Measure space", time: "Day 1–2" },
  { step: "Draft floor plan", time: "Day 3–4" },
  { step: "Send to client", time: "Day 5" },
  { step: "Client revisions", time: "Day 6–8" },
  { step: "Redraft", time: "Day 9–10" },
  { step: "Source materials", time: "Day 11–12" },
  { step: "Build quote", time: "Day 13–14" },
  { step: "Get approval", time: "Day 15+" },
];

const DESIGNDESK_STEPS = [
  { step: "Upload floor plan", time: "0:00" },
  { step: "AI generates 20 styles + quote", time: "0:45" },
  { step: "Client approves", time: "0:50" },
];

function TraditionalCard({
  step,
  time,
  className = "",
}: {
  step: string;
  time: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-red-500/25 bg-red-950/30 px-4 py-3 ${className}`}
    >
      <span className="text-sm text-slate-200">❌ {step}</span>
      <span className="ml-3 shrink-0 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
        {time}
      </span>
    </div>
  );
}

function DesignDeskCard({
  step,
  time,
  className = "",
}: {
  step: string;
  time: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-green-500/25 bg-green-950/30 px-4 py-3 ${className}`}
    >
      <span className="text-sm text-slate-200">✅ {step}</span>
      <span className="ml-3 shrink-0 rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
        {time}
      </span>
    </div>
  );
}

/**
 * HTML overlay — desktop pins a viewport-height comparison panel for the
 * scene's 200vh and scrubs steps in; mobile collapses to stacked cards.
 */
export function Scene6Overlay() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current || !pinRef.current) return;
    const mm = gsap.matchMedia();
    const selector = gsap.utils.selector(rootRef.current);

    mm.add("(min-width: 768px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          pin: pinRef.current,
        },
      });
      tl.from(selector("[data-trad-step]"), {
        x: -30,
        opacity: 0,
        stagger: 0.25,
        ease: "none",
      });
      tl.from(
        selector("[data-dd-step]"),
        { scale: 0.8, opacity: 0, stagger: 0.4, ease: "none" },
        "<25%"
      );
    });

    mm.add("(max-width: 767px)", () => {
      selector("[data-wf-card]").forEach((el) => {
        gsap.from(el, {
          y: 36,
          opacity: 0,
          duration: 0.55,
          ease: "power2.out",
          scrollTrigger: { trigger: el as Element, start: "top 88%" },
        });
      });
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative h-full">
      {/* Desktop: pinned split comparison */}
      <div
        ref={pinRef}
        className="hidden h-[100svh] flex-col justify-center px-8 md:flex lg:px-20"
      >
        <h2 className="mb-10 text-center text-3xl font-bold text-white lg:text-5xl">
          Two ways to get there.
        </h2>
        <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-10">
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-red-400">
              Traditional process
            </h3>
            <div className="space-y-2.5">
              {TRADITIONAL_STEPS.map((s) => (
                <div key={s.step} data-trad-step>
                  <TraditionalCard step={s.step} time={s.time} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-green-400">
              DesignDesk
            </h3>
            <div className="space-y-2.5">
              {DESIGNDESK_STEPS.map((s) => (
                <div key={s.step} data-dd-step>
                  <DesignDeskCard step={s.step} time={s.time} />
                </div>
              ))}
              <p className="pt-6 text-sm italic text-slate-400">
                Done before the kettle boils.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: single-column stacked cards, no pinning */}
      <div className="flex min-h-full flex-col justify-center gap-2.5 px-6 py-24 md:hidden">
        <h2 className="mb-6 text-center text-3xl font-bold text-white">
          Two ways to get there.
        </h2>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">
          Traditional process
        </h3>
        {TRADITIONAL_STEPS.map((s) => (
          <div key={s.step} data-wf-card>
            <TraditionalCard step={s.step} time={s.time} />
          </div>
        ))}
        <h3 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-widest text-green-400">
          DesignDesk
        </h3>
        {DESIGNDESK_STEPS.map((s) => (
          <div key={s.step} data-wf-card>
            <DesignDeskCard step={s.step} time={s.time} />
          </div>
        ))}
      </div>
    </div>
  );
}
