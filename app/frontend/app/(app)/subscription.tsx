import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// TODO: Phase 3 — Stripe subscription management
export default function SubscriptionScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      <TouchableOpacity onPress={() => router.back()} className="px-5 pt-4 mb-6">
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="star-outline" size={48} color="#C9A96E" />
        <Text className="text-white text-2xl font-bold mt-4 text-center">
          Upgrade to Pro
        </Text>
        <Text className="text-brand-muted text-sm text-center mt-2 leading-relaxed">
          Subscription management — coming in the next build.
        </Text>
      </View>
    </SafeAreaView>
  );
}
