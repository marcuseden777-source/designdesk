"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import {
  clamp01,
  SCENES,
  scrollState,
  useScrollProgress,
} from "../hooks/useScrollProgress";
import { lenisInstance } from "./LenisProvider";
import { FloatingPanels, useImageTexture } from "./assets";

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

  useFrame(() => {
    if (!group.current) return;
    group.current.visible = scrollState.progress < SCENES.hero.end;
  });

  return (
    <group ref={group}>
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <BlueprintSheet rotation={[-0.3, 0.15, 0]} />
      </Float>
      {/* Soft glow beneath the sheet */}
      <pointLight position={[0, -1, 2]} intensity={0.8} color="#2dd4bf" distance={8} />
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
      className="sticky top-0 flex h-screen flex-col items-center justify-center px-6 text-center"
      style={{ opacity: fade, visibility: fade <= 0 ? "hidden" : "visible" }}
    >
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.45em] text-teal-400">
        DesignDesk
      </p>
      <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
        Drop your floor plan.
      </h1>
      <p className="mt-4 text-xl text-slate-300 md:text-2xl">
        Get{" "}
        <span className="bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text font-semibold text-transparent">
          20 designs
        </span>{" "}
        in seconds.
      </p>
      <button
        type="button"
        onClick={scrollToNext}
        className="pointer-events-auto mt-12 rounded-full border border-slate-600 px-6 py-3 text-sm text-slate-300 transition-colors hover:border-teal-400 hover:text-teal-300"
      >
        See how it works ↓
      </button>
    </div>
  );
}
