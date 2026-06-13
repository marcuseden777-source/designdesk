import { View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AppBackdrop } from "@/components/AppBackdrop";

const TIERS = [
  {
    id: "free",
    name: "Starter",
    price: "Free",
    period: "",
    features: [
      "3 quotations per month",
      "1 AI design generation",
      "Basic floor plan analysis",
      "PDF export",
    ],
    limits: [
      "No priority support",
      "Standard generation speed",
    ],
  },
  {
    id: "pro",
    name: "Professional",
    price: "S$49",
    period: "/month",
    featured: true,
    features: [
      "Unlimited quotations",
      "20 AI design generations",
      "Advanced floor plan analysis",
      "PDF export with branding",
      "Priority support",
      "Client presentation mode",
    ],
    limits: [],
  },
  {
    id: "studio",
    name: "Studio",
    price: "S$129",
    period: "/month",
    features: [
      "Everything in Professional",
      "Unlimited AI generations",
      "Team collaboration (up to 5)",
      "Custom branding & templates",
      "API access",
      "Dedicated account manager",
    ],
    limits: [],
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { designer } = useDashboardData();
  const currentTier = designer?.subscription_tier ?? "free";

  function handleUpgrade(tierId: string) {
    if (tierId === currentTier) return;
    Alert.alert(
      "Upgrade Coming Soon",
      "Payment integration is being finalized. You'll be able to upgrade shortly.",
      [{ text: "OK" }]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <AppBackdrop />
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-2 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 bg-off-white/10 border border-off-white/15 rounded-full items-center justify-center"
        >
          <Ionicons name="arrow-back" size={18} color="#fdfcf8" />
        </TouchableOpacity>
        <View>
          <Text className="text-off-white/50 text-xs tracking-widest uppercase">Plans</Text>
          <Text className="text-off-white text-xl font-serif">Choose Your Plan</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
      >
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentTier;
          const isFeatured = tier.featured;

          return (
            <View
              key={tier.id}
              className={`mb-4 rounded-2xl p-5 border ${
                isFeatured
                  ? "bg-terracotta/12 border-terracotta/40"
                  : "bg-off-white/[0.06] border-off-white/12"
              }`}
            >
              {/* Tier header */}
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-xs tracking-widest uppercase text-off-white/55">
                    {tier.name}
                  </Text>
                  <View className="flex-row items-baseline mt-1">
                    <Text className="text-3xl font-serif text-off-white">
                      {tier.price}
                    </Text>
                    {tier.period ? (
                      <Text className="text-sm ml-1 text-off-white/45">
                        {tier.period}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {isCurrent && (
                  <View className="bg-terracotta/20 px-3 py-1 rounded-full">
                    <Text className="text-terracotta text-xs font-sans-semibold">Current</Text>
                  </View>
                )}
                {isFeatured && !isCurrent && (
                  <View className="bg-terracotta px-3 py-1 rounded-full">
                    <Text className="text-off-white text-xs font-sans-semibold">Popular</Text>
                  </View>
                )}
              </View>

              {/* Features */}
              <View className="gap-2 mb-4">
                {tier.features.map((f) => (
                  <View key={f} className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-circle" size={16} color="#d98b6a" />
                    <Text className="text-sm flex-1 text-off-white/80">
                      {f}
                    </Text>
                  </View>
                ))}
                {tier.limits.map((l) => (
                  <View key={l} className="flex-row items-center gap-2">
                    <Ionicons name="close-circle-outline" size={16} color="rgba(253,252,248,0.3)" />
                    <Text className="text-sm text-off-white/35">{l}</Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={() => handleUpgrade(tier.id)}
                disabled={isCurrent}
                activeOpacity={0.8}
                className={`py-3.5 rounded-full items-center ${
                  isCurrent
                    ? "bg-off-white/10 border border-off-white/15"
                    : isFeatured
                    ? "bg-terracotta"
                    : "bg-off-white/15 border border-off-white/20"
                }`}
              >
                <Text
                  className={`font-sans-semibold text-sm ${
                    isCurrent ? "text-off-white/40" : "text-off-white"
                  }`}
                >
                  {isCurrent ? "Current Plan" : `Upgrade to ${tier.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Footer note */}
        <View className="items-center mt-2 px-4">
          <Text className="text-off-white/40 text-xs text-center leading-relaxed">
            All plans include a 14-day free trial. Cancel anytime.{"\n"}
            Prices are in SGD and exclude GST.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
