import { View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// TODO: Phase 3 — Stripe subscription management
export default function SubscriptionScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-off-white" edges={["top"]}>
      <TouchableOpacity onPress={() => router.back()} className="px-5 pt-4 mb-6">
        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="star-outline" size={48} color="#b85c38" />
        <Text className="text-charcoal text-2xl font-serif mt-4 text-center">
          Upgrade to Pro
        </Text>
        <Text className="text-charcoal/50 text-sm font-sans text-center mt-2 leading-relaxed">
          Subscription management — coming in the next build.
        </Text>
      </View>
    </SafeAreaView>
  );
}
