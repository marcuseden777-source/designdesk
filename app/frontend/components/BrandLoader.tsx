import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, Platform, StyleSheet } from "react-native";

// react-native-web has no native animation thread — driver must be JS-side on web.
const USE_NATIVE = Platform.OS !== "web";

const TERRACOTTA_SOFT = "#d98b6a";

/**
 * Font-independent DesignDesk mark — a terracotta floor-plan glyph drawn purely
 * with Views (no icon font / no custom text font), so it renders correctly on the
 * very first frame, even before `useFonts` resolves during cold start.
 */
export function BrandMark({ size = 84 }: { size?: number }) {
  const inner = Math.round(size * 0.48);
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
      className="bg-terracotta/15 border border-terracotta/30 items-center justify-center"
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderWidth: 2,
          borderColor: "rgba(217,139,106,0.55)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {/* vertical wall */}
        <View style={{ position: "absolute", top: 0, bottom: 0, left: "56%", width: 2, backgroundColor: TERRACOTTA_SOFT }} />
        {/* horizontal wall — meets the vertical to read as two rooms */}
        <View style={{ position: "absolute", left: 0, top: "46%", width: "56%", height: 2, backgroundColor: TERRACOTTA_SOFT }} />
      </View>
    </View>
  );
}

/**
 * Full-screen branded loader on the dark ink ground.
 *
 * - `variant="boot"`     → app cold-start (fonts + auth resolving). Shows the
 *                          "Preparing design engine" caption + an indeterminate
 *                          sweep. Uses NO custom/icon fonts.
 * - `variant="transition"` → brief overlay between internal screens. Logo + wordmark
 *                          (fonts are ready by then), no caption.
 */
export function BrandLoader({
  variant = "boot",
  caption = "Preparing design engine",
}: {
  variant?: "boot" | "transition";
  caption?: string;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE }),
        Animated.timing(pulse, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE }),
      ])
    );
    p.start();

    let s: Animated.CompositeAnimation | undefined;
    if (variant === "boot") {
      s = Animated.loop(
        Animated.timing(sweep, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE })
      );
      s.start();
    }
    return () => {
      p.stop();
      s?.stop();
    };
  }, [variant]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.06] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-50, 140] });

  return (
    <View style={StyleSheet.absoluteFill} className="bg-ink items-center justify-center">
      {/* deepest ink ground, in case bg-ink hasn't painted yet on first frame */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#0d0a08" }]} />

      <Animated.View style={{ transform: [{ scale }], opacity: glow }}>
        <BrandMark size={variant === "boot" ? 88 : 76} />
      </Animated.View>

      <Text
        style={{
          fontFamily: variant === "transition" ? "PlayfairDisplay_700Bold" : undefined,
          color: "#fdfcf8",
          fontSize: 22,
          marginTop: 20,
          letterSpacing: 0.5,
        }}
      >
        DesignDesk
      </Text>

      {variant === "boot" && (
        <View style={{ alignItems: "center", marginTop: 6 }}>
          <Text style={{ color: "rgba(253,252,248,0.5)", fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase" }}>
            {caption}
          </Text>
          {/* indeterminate sweep bar */}
          <View style={{ marginTop: 16, width: 140, height: 2, borderRadius: 999, backgroundColor: "rgba(253,252,248,0.12)", overflow: "hidden" }}>
            <Animated.View style={{ width: 50, height: 2, borderRadius: 999, backgroundColor: TERRACOTTA_SOFT, transform: [{ translateX: sweepX }] }} />
          </View>
        </View>
      )}
    </View>
  );
}
