import { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet } from "react-native";
import { usePathname } from "expo-router";
import { BrandLoader } from "@/components/BrandLoader";

const USE_NATIVE = Platform.OS !== "web";

// Tunable timing for the branded transition beat (ms). Total ≈ 1.5s.
const FADE_IN = 200;
const HOLD = 1100;
const FADE_OUT = 200;

/**
 * Brief branded overlay shown on internal route changes. `usePathname()` updates
 * right as the new screen commits, so the logo cover lands over the new screen's
 * first paint and fades out once it has settled — a consistent DesignDesk beat
 * between screens (and it masks dev-mode route-bundling jank).
 *
 * Mount once, as the last child of the root layout so it sits above the Stack.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    // Skip the initial mount — cold start is handled by the boot loader.
    if (first.current) {
      first.current = false;
      return;
    }
    setMounted(true);
    opacity.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: FADE_IN, useNativeDriver: USE_NATIVE }),
      Animated.delay(HOLD),
      Animated.timing(opacity, { toValue: 0, duration: FADE_OUT, useNativeDriver: USE_NATIVE }),
    ]);
    anim.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => anim.stop();
  }, [pathname]);

  if (!mounted) return null;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, zIndex: 100 }]}>
      <BrandLoader variant="transition" />
    </Animated.View>
  );
}
