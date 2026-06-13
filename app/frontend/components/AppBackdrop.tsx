import { View, Image, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Shared cinematic backdrop for the web app — carries the scroll landing's
 * dark floor-plan scene behind the glass panels of login, dashboard and the
 * upload/quote flow so the whole web experience feels continuous.
 *
 * Web renders the textured photo (served from /public); native falls back to
 * the ink gradient only (the /textures URL doesn't resolve off-web).
 * Rendered as an absolute-fill layer — mount it as the first child of a
 * flex-1 screen root, with content as later siblings so it sits behind.
 */
export function AppBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0d0a08" }]} />
      {Platform.OS === "web" && (
        <Image
          source={{ uri: "/textures/backdrop.webp" }}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
        />
      )}
      {/* Warm ink wash for legibility over the photo */}
      <LinearGradient
        colors={["rgba(13,10,8,0.80)", "rgba(10,8,6,0.92)"]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
