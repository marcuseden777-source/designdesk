import { View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDashboardData } from "@/hooks/useDashboardData";

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
    <SafeAreaView className="flex-1 bg-off-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-2 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 bg-charcoal/5 border border-charcoal/10 rounded-full items-center justify-center"
        >
          <Ionicons name="arrow-back" size={18} color="#1a1a1a" />
        </TouchableOpacity>
        <View>
          <Text className="text-charcoal/50 text-xs tracking-widest uppercase">Plans</Text>
          <Text className="text-charcoal text-xl font-serif">Choose Your Plan</Text>
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
                  ? "bg-charcoal border-charcoal"
                  : "bg-white border-charcoal/10"
              }`}
            >
              {/* Tier header */}
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text
                    className={`text-xs tracking-widest uppercase ${
                      isFeatured ? "text-off-white/60" : "text-charcoal/50"
                    }`}
                  >
                    {tier.name}
                  </Text>
                  <View className="flex-row items-baseline mt-1">
                    <Text
                      className={`text-3xl font-serif ${
                        isFeatured ? "text-off-white" : "text-charcoal"
                      }`}
                    >
                      {tier.price}
                    </Text>
                    {tier.period ? (
                      <Text
                        className={`text-sm ml-1 ${
                          isFeatured ? "text-off-white/50" : "text-charcoal/40"
                        }`}
                      >
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
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={isFeatured ? "#b85c38" : "#16a34a"}
                    />
                    <Text
                      className={`text-sm flex-1 ${
                        isFeatured ? "text-off-white/80" : "text-charcoal/70"
                      }`}
                    >
                      {f}
                    </Text>
                  </View>
                ))}
                {tier.limits.map((l) => (
                  <View key={l} className="flex-row items-center gap-2">
                    <Ionicons name="close-circle-outline" size={16} color="#999" />
                    <Text className="text-sm text-charcoal/40">{l}</Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={() => handleUpgrade(tier.id)}
                disabled={isCurrent}
                activeOpacity={0.8}
                className={`py-3.5 rounded-xl items-center ${
                  isCurrent
                    ? "bg-charcoal/10 border border-charcoal/10"
                    : isFeatured
                    ? "bg-terracotta"
                    : "bg-charcoal"
                }`}
              >
                <Text
                  className={`font-sans-semibold text-sm ${
                    isCurrent ? "text-charcoal/40" : "text-off-white"
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
          <Text className="text-charcoal/40 text-xs text-center leading-relaxed">
            All plans include a 14-day free trial. Cancel anytime.{"\n"}
            Prices are in SGD and exclude GST.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
