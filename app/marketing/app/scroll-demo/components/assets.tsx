"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollState } from "../hooks/useScrollProgress";

/** Slugs matching /public/textures/styles/{slug}.webp — index-aligned with STYLE_NAMES. */
export const STYLE_SLUGS = [
  "scandinavian",
  "japandi",
  "industrial",
  "bohemian",
  "mid-century-modern",
  "minimalist",
  "art-deco",
  "coastal",
  "traditional",
  "contemporary",
  "rustic",
  "farmhouse",
  "hollywood-regency",
  "wabi-sabi",
  "biophilic",
  "maximalist",
  "french-country",
  "mediterranean",
  "eclectic",
  "neo-classical",
] as const;

export const styleUrl = (slug: string) => `/textures/styles/${slug}.webp`;

export function useImageTexture(url: string): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let disposed = false;
    new THREE.TextureLoader().load(url, (t) => {
      if (disposed) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      setTexture(t);
    });
    return () => {
      disposed = true;
    };
  }, [url]);
  return texture;
}

export function useImageTextures(urls: readonly string[]): (THREE.Texture | null)[] {
  const [textures, setTextures] = useState<(THREE.Texture | null)[]>(() =>
    urls.map(() => null)
  );
  useEffect(() => {
    let disposed = false;
    const loader = new THREE.TextureLoader();
    urls.forEach((url, i) => {
      loader.load(url, (t) => {
        if (disposed) return;
        t.colorSpace = THREE.SRGBColorSpace;
        setTextures((prev) => {
          const next = prev.slice();
          next[i] = t;
          return next;
        });
      });
    });
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return textures;
}

/**
 * Ambient dust — slowly rotating point cloud spanning the whole experience.
 * Gives every scene a constant depth cue between camera and background.
 */
export function DustField({ count = 350 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 26;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.012;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#e6c490"
        transparent
        opacity={0.28}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export interface PanelPlacement {
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

/**
 * Floating photo panels — real generated interiors drifting at different
 * depths. A framed plane per image, gentle bob, fades with distance fog.
 */
export function FloatingPanels({
  slugs,
  placements,
  visibleWhen,
  opacity = 0.6,
}: {
  slugs: readonly string[];
  placements: PanelPlacement[];
  visibleWhen: (p: number) => boolean;
  opacity?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const urls = useMemo(() => slugs.map(styleUrl), [slugs]);
  const textures = useImageTextures(urls);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.visible = visibleWhen(scrollState.progress);
    if (!group.current.visible) return;
    group.current.children.forEach((child, i) => {
      child.position.y =
        placements[i].position[1] +
        Math.sin(clock.elapsedTime * 0.5 + i * 1.7) * 0.12;
      child.rotation.y =
        placements[i].rotationY +
        Math.sin(clock.elapsedTime * 0.3 + i) * 0.04;
    });
  });

  return (
    <group ref={group} visible={false}>
      {placements.map((place, i) => (
        <group
          key={i}
          position={place.position}
          rotation-y={place.rotationY}
          scale={place.scale}
        >
          {/* frame */}
          <mesh position-z={-0.012}>
            <planeGeometry args={[1.2, 1.62]} />
            <meshBasicMaterial
              color="#f5f0e8"
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh>
            <planeGeometry args={[1.12, 1.5]} />
            <meshBasicMaterial
              map={textures[i % textures.length] ?? undefined}
              color={textures[i % textures.length] ? "#ffffff" : "#1e293b"}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
