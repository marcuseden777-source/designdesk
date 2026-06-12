"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { gsap } from "gsap";
import {
  SCENES,
  scrollState,
  useScrollProgress,
} from "../hooks/useScrollProgress";
import { useImageTextures } from "./assets";

export const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ??
  "https://interior-design-app-gilt.vercel.app/dashboard";

const ROOMS: {
  name: string;
  plan: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}[] = [
  { name: "living", plan: "/textures/plans/living.webp", position: [0, 0, 0], size: [1.8, 0.5, 1.4], color: "#e8d5b7" },
  { name: "kitchen", plan: "/textures/plans/kitchen.webp", position: [2.5, 0, 0], size: [1.2, 0.5, 1.2], color: "#d4c5a0" },
  { name: "bedroom1", plan: "/textures/plans/bedroom1.webp", position: [-2, 0, 1.5], size: [1.4, 0.5, 1.1], color: "#c4b08a" },
  { name: "bedroom2", plan: "/textures/plans/bedroom2.webp", position: [-2, 0, -1.5], size: [1.4, 0.5, 1.1], color: "#b8a07a" },
  { name: "bathroom", plan: "/textures/plans/bathroom.webp", position: [1, 0, 2], size: [0.9, 0.5, 0.9], color: "#d4c5a0" },
  { name: "corridor", plan: "/textures/plans/corridor.webp", position: [0, 0, 1.5], size: [1.5, 0.3, 0.6], color: "#e8d5b7" },
];

/**
 * Scene 7 — bird's-eye apartment reveal. Each room volume pops in with
 * elastic ease, its top face textured with a generated top-down floor-plan
 * render so the camera looks down into six genuinely styled rooms.
 */
export default function Scene7CTA() {
  const group = useRef<THREE.Group>(null);
  const rooms = useRef<(THREE.Mesh | null)[]>([]);
  const revealed = useRef(false);
  const urls = useMemo(() => ROOMS.map((r) => r.plan), []);
  const topTextures = useImageTextures(urls);

  useFrame(() => {
    if (!group.current) return;
    const p = scrollState.progress;
    const visible = p >= SCENES.cta.start;
    group.current.visible = visible;
    if (!visible) {
      // Reset so re-scrolling up and back replays the reveal.
      if (revealed.current) {
        revealed.current = false;
        rooms.current.forEach((m) => m?.scale.setScalar(0.0001));
      }
      return;
    }
    if (!revealed.current) {
      revealed.current = true;
      const meshes = rooms.current.filter(Boolean) as THREE.Mesh[];
      meshes.forEach((mesh, i) => {
        gsap.fromTo(
          mesh.scale,
          { x: 0.0001, y: 0.0001, z: 0.0001 },
          {
            x: 1,
            y: 1,
            z: 1,
            duration: 1.2,
            delay: i * 0.1,
            ease: "elastic.out(1, 0.5)",
          }
        );
      });
    }
  });

  return (
    <group ref={group} visible={false}>
      {ROOMS.map((room, i) => (
        <mesh
          key={room.name}
          ref={(el) => {
            rooms.current[i] = el;
          }}
          position={room.position}
          scale={0.0001}
        >
          <boxGeometry args={room.size} />
          {/* box faces: +x, -x, +y (top), -y, +z, -z — top gets the interior photo */}
          {[0, 1, 2, 3, 4, 5].map((face) =>
            face === 2 ? (
              <meshStandardMaterial
                key={face}
                attach={`material-${face}`}
                map={topTextures[i] ?? undefined}
                color={topTextures[i] ? "#ffffff" : room.color}
                roughness={0.55}
              />
            ) : (
              <meshStandardMaterial
                key={face}
                attach={`material-${face}`}
                color={room.color}
                roughness={0.7}
              />
            )
          )}
        </mesh>
      ))}
      {/* floor slab beneath the rooms */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.28, 0.3]}>
        <planeGeometry args={[7.5, 5.5]} />
        <meshStandardMaterial color="#141420" roughness={0.95} />
      </mesh>
      <pointLight position={[0, 5, 0]} intensity={1.6} color="#fff4e0" />
    </group>
  );
}

/** HTML overlay — sequential reveal of the closing lines + CTA button. */
export function Scene7Overlay() {
  const p = useScrollProgress();

  const show = (threshold: number) => ({
    opacity: p >= threshold ? 1 : 0,
    transform: p >= threshold ? "translateY(0)" : "translateY(16px)",
    transition: "opacity 0.5s ease, transform 0.5s ease",
  });

  return (
    <div className="sticky top-0 flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-3xl font-semibold text-white" style={show(0.88)}>
        Your design.
      </p>
      <p className="text-3xl font-semibold text-white" style={show(0.91)}>
        Your quote.
      </p>
      <p
        className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-6xl font-black text-transparent md:text-7xl"
        style={show(0.94)}
      >
        Instantly.
      </p>
      <a
        href={DASHBOARD_URL}
        className="pointer-events-auto mt-8 rounded-full bg-gradient-to-r from-teal-500 to-purple-600 px-8 py-4 text-lg font-semibold text-white transition-transform hover:scale-105"
        style={show(0.97)}
      >
        Start Designing Free →
      </a>
    </div>
  );
}
