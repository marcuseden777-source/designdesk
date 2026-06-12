"use client";

import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useRef,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import {
  activeSceneIndex,
  clamp01,
  sceneProgress,
  SCENES,
  scrollState,
  useScrollProgress,
} from "../hooks/useScrollProgress";
import { DustField } from "./assets";

const Scene1Hero = lazy(() => import("./Scene1_Hero"));
const Scene2Upload = lazy(() => import("./Scene2_Upload"));
const Scene3Styles = lazy(() => import("./Scene3_Styles"));
const Scene4BeforeAfter = lazy(() => import("./Scene4_BeforeAfter"));
const Scene5Quote = lazy(() => import("./Scene5_Quote"));
const Scene6Workflow = lazy(() => import("./Scene6_Workflow"));
const Scene7CTA = lazy(() => import("./Scene7_CTA"));

export interface SceneContextValue {
  activeScene: number;
  scrollProgress: number;
}

export const SceneContext = createContext<SceneContextValue>({
  activeScene: 1,
  scrollProgress: 0,
});

export function useSceneContext(): SceneContextValue {
  return useContext(SceneContext);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Single shared camera, driven piecewise by global scroll progress.
 * Targets are lerped each frame so scene-to-scene handoffs stay smooth.
 */
function CameraRig() {
  const { camera } = useThree();
  const introDone = useRef(false);
  const target = useRef(new THREE.Vector3(0, 2, 8));

  useEffect(() => {
    camera.position.set(0, 2, 15);
    const tween = gsap.to(camera.position, {
      z: 8,
      duration: 2,
      ease: "power3.out",
      onComplete: () => {
        introDone.current = true;
      },
    });
    return () => {
      tween.kill();
    };
  }, [camera]);

  useFrame(() => {
    const p = scrollState.progress;

    // Let the mount tween own the camera until it finishes or the user scrolls.
    if (!introDone.current) {
      if (p < 0.02) {
        camera.lookAt(0, 0, 0);
        return;
      }
      gsap.killTweensOf(camera.position);
      introDone.current = true;
    }

    const v = target.current;
    if (p < SCENES.upload.start) {
      v.set(0, 2, 8);
    } else if (p < SCENES.upload.end) {
      // Aerial → presentation-height glide while the floor plan settles.
      const t = sceneProgress(p, SCENES.upload);
      v.set(
        0,
        THREE.MathUtils.lerp(2, 1.4, t),
        THREE.MathUtils.lerp(8, 4.9, t)
      );
    } else if (p < SCENES.styles.end) {
      const t = clamp01(sceneProgress(p, SCENES.styles) / 0.25);
      v.set(
        0,
        THREE.MathUtils.lerp(1.4, 0.1, t),
        THREE.MathUtils.lerp(4.9, 6.4, t)
      );
    } else if (p < SCENES.beforeAfter.end) {
      const t = clamp01(sceneProgress(p, SCENES.beforeAfter) / 0.25);
      v.set(0, THREE.MathUtils.lerp(0.1, 1, t), THREE.MathUtils.lerp(6.4, 5, t));
    } else if (p < SCENES.quote.end) {
      v.set(0, 1, 5);
    } else if (p < SCENES.workflow.end) {
      // Slow full orbit around the flattened floor plan.
      const t = sceneProgress(p, SCENES.workflow);
      const angle = t * Math.PI * 2;
      v.set(Math.sin(angle) * 5, 2, Math.cos(angle) * 5);
    } else {
      // Pull up to a bird's-eye view for the CTA reveal.
      const t = easeOutCubic(clamp01(sceneProgress(p, SCENES.cta) / 0.4));
      v.set(0, THREE.MathUtils.lerp(2, 9, t), THREE.MathUtils.lerp(5, 0.1, t));
    }

    camera.position.lerp(v, 0.12);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function ScrollCanvas() {
  const scrollProgress = useScrollProgress();
  const activeScene = activeSceneIndex(scrollProgress);

  // Cap device pixel ratio lower on phones to keep the GPU comfortable.
  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;
  const dprMax = isMobile ? 1.5 : 2;

  return (
    <SceneContext.Provider value={{ activeScene, scrollProgress }}>
      <Canvas
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100dvh",
          zIndex: 0,
        }}
        camera={{ position: [0, 2, 8], fov: 50 }}
        dpr={[1, dprMax]}
        performance={{ min: 0.5 }}
      >
        {/* Transparent canvas — the warm home backdrop shows through */}
        <fog attach="fog" args={["#171210", 11, 27]} />
        <ambientLight intensity={0.5} color="#fff1e0" />
        <directionalLight position={[3, 5, 4]} intensity={1.05} color="#ffe8cc" />
        <CameraRig />
        <DustField />
        <Suspense fallback={null}>
          <Scene1Hero />
          <Scene2Upload />
          <Scene3Styles />
          <Scene4BeforeAfter />
          <Scene5Quote />
          <Scene6Workflow />
          <Scene7CTA />
        </Suspense>
      </Canvas>
    </SceneContext.Provider>
  );
}
