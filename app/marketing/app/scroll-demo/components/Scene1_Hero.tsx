"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  clamp01,
  SCENES,
  scrollState,
  useScrollProgress,
} from "../hooks/useScrollProgress";
import { lenisInstance } from "./LenisProvider";
import { FloatingPanels, useImageTexture } from "./assets";
import { IconArrowDown } from "./icons";

/**
 * Procedural blueprint — instant fallback drawn on canvas while the
 * generated /textures/blueprint.webp image streams in.
 */
export function createBlueprintTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 716;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, 512, 716);

  ctx.strokeStyle = "rgba(125, 211, 252, 0.16)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 716);
    ctx.stroke();
  }
  for (let y = 0; y <= 716; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(512, y + 0.5);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(147, 197, 253, 0.95)";
  ctx.lineWidth = 5;
  ctx.strokeRect(48, 48, 416, 620);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Generated blueprint image with procedural canvas fallback while loading. */
export function useBlueprintTexture(): THREE.Texture {
  const fallback = useMemo(createBlueprintTexture, []);
  const image = useImageTexture("/textures/blueprint.webp");
  return image ?? fallback;
}

/** Shared blueprint sheet mesh (Scene 1 + Scene 2). */
export function BlueprintSheet({
  meshRef,
  rotation = [-0.3, 0, 0] as [number, number, number],
}: {
  meshRef?: React.Ref<THREE.Mesh>;
  rotation?: [number, number, number];
}) {
  const texture = useBlueprintTexture();
  return (
    <mesh ref={meshRef} rotation={rotation}>
      <planeGeometry args={[2.5, 3.5]} />
      <meshStandardMaterial
        map={texture}
        side={THREE.DoubleSide}
        emissive="#1a3a5c"
        emissiveIntensity={0.25}
        roughness={0.5}
      />
    </mesh>
  );
}

/**
 * Scene 1 — blueprint sheet floating in dark space, real interior photos
 * drifting far behind it for depth.
 */
export default function Scene1Hero() {
  const group = useRef<THREE.Group>(null);
  const sheet = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const p = scrollState.progress;
    group.current.visible = p < SCENES.hero.end;
    if (!group.current.visible || !sheet.current) return;
    // Idle bob that eases to a settled pose (rotation [-0.3,0,0], position 0)
    // as we approach the upload handoff, so Scene 2 picks the sheet up with
    // no jump in frame or position.
    const settle = 1 - clamp01(p / SCENES.hero.end);
    const e = clock.elapsedTime;
    sheet.current.position.y = Math.sin(e * 0.8) * 0.08 * settle;
    sheet.current.rotation.y = Math.sin(e * 0.5) * 0.05 * settle;
    sheet.current.rotation.z = Math.sin(e * 0.6) * 0.025 * settle;
  });

  return (
    <group ref={group}>
      <group ref={sheet}>
        <BlueprintSheet rotation={[-0.3, 0, 0]} />
      </group>
      {/* Soft warm glow beneath the sheet */}
      <pointLight position={[0, -1, 2]} intensity={0.85} color="#e3a06f" distance={8} />
      {/* Distant interiors — hint of what's coming, softened by fog */}
      <FloatingPanels
        slugs={["japandi", "art-deco", "biophilic", "industrial", "coastal"]}
        placements={[
          { position: [-4.2, 1.4, -6], rotationY: 0.4, scale: 1.1 },
          { position: [4.5, -0.6, -7], rotationY: -0.35, scale: 1.25 },
          { position: [-3.2, -1.6, -9], rotationY: 0.25, scale: 1.4 },
          { position: [3.4, 2, -10], rotationY: -0.2, scale: 1.5 },
          { position: [0.4, -2.6, -8], rotationY: 0.1, scale: 1.2 },
        ]}
        visibleWhen={(p) => p < SCENES.upload.end}
        opacity={0.5}
      />
    </group>
  );
}

/** HTML overlay — headline + ghost button, fades out over scroll 0→0.13. */
export function Scene1Overlay() {
  const p = useScrollProgress();
  const fade = 1 - clamp01(p / SCENES.hero.end);

  const scrollToNext = () => {
    const target = window.innerHeight * 1.7;
    if (lenisInstance) {
      lenisInstance.scrollTo(target, { duration: 1.6 });
    } else {
      window.scrollTo({ top: target, behavior: "smooth" });
    }
  };

  return (
    <div
      className="sticky top-0 flex h-[100svh] flex-col items-center justify-center px-6 text-center"
      style={{ opacity: fade, visibility: fade <= 0 ? "hidden" : "visible" }}
    >
      {/* Soft radial scrim so the headline reads cleanly over the blueprint */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 58% 42% at center, rgba(8,5,3,0.78) 0%, rgba(8,5,3,0.45) 48%, transparent 76%)",
        }}
      />
      <p className="relative mb-5 font-sans text-xs font-semibold uppercase tracking-[0.45em] text-terracotta-soft">
        DesignDesk
      </p>
      <h1 className="relative font-serif text-5xl font-semibold leading-[1.05] text-off-white md:text-7xl">
        Drop your floor plan.
      </h1>
      <p className="relative mt-5 font-sans text-lg text-off-white/85 md:text-2xl">
        Get <span className="font-medium text-terracotta-soft">20 designs</span>{" "}
        in seconds.
      </p>
      <button
        type="button"
        onClick={scrollToNext}
        className="group relative pointer-events-auto mt-12 inline-flex cursor-pointer items-center gap-2 rounded-full border border-off-white/25 px-6 py-3 font-sans text-sm text-off-white/90 transition-colors duration-200 hover:border-terracotta-soft hover:text-terracotta-soft"
      >
        See how it works
        <IconArrowDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
      </button>
    </div>
  );
}
