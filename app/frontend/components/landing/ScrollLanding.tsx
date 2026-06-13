import { useRef } from "react";
import {
  View,
  Image,
  Animated,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Text } from "@/components/Text";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/**
 * In-app scroll landing — the marketing story reimplemented natively in Expo
 * (snap ScrollView + expo-linear-gradient + the real design textures) so it
 * lives in the product codebase and flows straight into the app. Web-first:
 * native app users are routed to login before this renders.
 */

type Card = {
  image: string;
  headline: string;
  sub: string;
  cta?: boolean;
};

const CARDS: Card[] = [
  {
    image: "/textures/blueprint.webp",
    headline: "Drop your floor plan.",
    sub: "Get 20 styled room designs in seconds.",
  },
  {
    image: "/textures/styles/industrial.webp",
    headline: "Upload in one tap.",
    sub: "The old way: 3–5 days. DesignDesk: under two minutes.",
  },
  {
    image: "/textures/styles/japandi.webp",
    headline: "20 styles, instantly.",
    sub: "Scandinavian to Japandi — every style generated on the spot.",
  },
  {
    image: "/textures/room-after.webp",
    headline: "Before → After.",
    sub: "Weeks of back-and-forth become a two-minute reveal.",
  },
  {
    image: "/textures/styles/scandinavian.webp",
    headline: "Quote on the spot.",
    sub: "Area, materials, labour, total — costed from the rendered design.",
  },
  {
    image: "/textures/styles/wabi-sabi.webp",
    headline: "Eight steps become three.",
    sub: "Upload → Generate → Quote. Then export a PDF or editable Word doc.",
  },
  {
    image: "/textures/styles/biophilic.webp",
    headline: "Your design. Your quote. Instantly.",
    sub: "Start designing free today.",
    cta: true,
  },
];

const useNative = Platform.OS !== "web";

function LandingCard({
  card,
  index,
  height,
  scrollY,
  onEnter,
}: {
  card: Card;
  index: number;
  height: number;
  scrollY: Animated.Value;
  onEnter: () => void;
}) {
  // Reveal + gentle parallax as the card passes through centre.
  const inputRange = [(index - 1) * height, index * height, (index + 1) * height];
  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.15, 1, 0.15],
    extrapolate: "clamp",
  });
  const translateY = scrollY.interpolate({
    inputRange,
    outputRange: [44, 0, -44],
    extrapolate: "clamp",
  });

  return (
    <View style={{ height, width: "100%" }} className="items-center justify-center px-8">
      <Image
        source={{ uri: card.image }}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
      />
      <LinearGradient
        colors={["rgba(22,19,16,0.86)", "rgba(22,19,16,0.45)", "rgba(22,19,16,0.9)"]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={{ opacity, transform: [{ translateY }] }} className="items-center">
        <Text
          className="text-terracotta-soft font-sans-semibold"
          style={{ letterSpacing: 4, fontSize: 12, marginBottom: 18 }}
        >
          {String(index + 1).padStart(2, "0")} / 07
        </Text>
        <Text
          className="text-off-white font-serif-bold text-center"
          style={{ fontSize: 38, lineHeight: 42, maxWidth: 560 }}
        >
          {card.headline}
        </Text>
        <Text
          className="text-stone font-sans text-center"
          style={{ fontSize: 16, lineHeight: 24, marginTop: 16, maxWidth: 360 }}
        >
          {card.sub}
        </Text>

        {card.cta && (
          <Pressable
            onPress={onEnter}
            style={{ alignSelf: "center" }}
            className="mt-9 flex-row items-center gap-2 rounded-full bg-terracotta px-8 py-4 active:opacity-90"
          >
            <Text className="text-off-white font-sans-bold" style={{ fontSize: 16 }}>
              Start Designing Free
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fdfcf8" />
          </Pressable>
        )}
        {index === 0 && (
          <View className="mt-10 flex-row items-center gap-1.5">
            <Text className="text-stone-dim font-sans" style={{ fontSize: 13 }}>
              Scroll to see how it works
            </Text>
            <Ionicons name="chevron-down" size={15} color="#8a7d72" />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export default function ScrollLanding() {
  const { height } = useWindowDimensions();
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  const onEnter = () => router.push("/(auth)/login");

  return (
    <View className="flex-1 bg-ink">
      {/* Fixed brand wordmark */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 22, left: 22, zIndex: 20 }}
      >
        <Text className="text-off-white font-sans-semibold" style={{ letterSpacing: 4, fontSize: 13 }}>
          DESIGN<Text className="text-terracotta-soft" style={{ letterSpacing: 4, fontSize: 13 }}>DESK</Text>
        </Text>
      </View>

      {/* Skip-to-app affordance, top-right */}
      <Pressable
        onPress={onEnter}
        style={{ position: "absolute", top: 16, right: 16, zIndex: 20 }}
        className="rounded-full border border-off-white/25 px-4 py-2 active:opacity-80"
      >
        <Text className="text-off-white/90 font-sans" style={{ fontSize: 13 }}>
          Sign in
        </Text>
      </Pressable>

      <Animated.ScrollView
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: useNative }
        )}
      >
        {CARDS.map((card, i) => (
          <LandingCard
            key={card.headline}
            card={card}
            index={i}
            height={height}
            scrollY={scrollY}
            onEnter={onEnter}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}
