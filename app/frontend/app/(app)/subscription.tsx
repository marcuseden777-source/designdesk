import { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AppBackdrop } from "@/components/AppBackdrop";
import { api, BillingResponse } from "@/lib/api";

// Mirrors the backend source of truth (app/backend/src/config/plans.ts).
const TIERS = [
  {
    id: "free",
    name: "Starter",
    price: "Free",
    period: "",
    renders: "1 render / month",
    features: [
      "1 AI render / month",
      "1 quotation / month (view-only)",
      "Floor-plan analysis (Claude Vision)",
    ],
    limits: ["No PDF / Word download", "DesignDesk watermark"],
  },
  {
    id: "pro",
    name: "Professional",
    price: "S$49",
    period: "/mo",
    renders: "30 renders / month",
    featured: true,
    features: [
      "30 AI renders / month",
      "Unlimited quotations",
      "Layout-preserving renders (Kontext)",
      "White-label PDF & Word export",
      "Extra renders S$5 each",
      "Priority support",
    ],
    limits: [],
  },
  {
    id: "studio",
    name: "Studio",
    price: "S$129",
    period: "/mo",
    renders: "80 renders / month",
    features: [
      "80 AI renders / month",
      "Everything in Professional",
      "Design variations & before/after",
      "Priority render queue",
      "Extra renders S$5 each",
      "Team seats (coming soon)",
    ],
    limits: [],
  },
];

// Pay-as-you-go render packs (mirrors CREDIT_PACKS in the backend config).
const CREDIT_PACKS = [
  { id: "pack_10", renders: 10, price: "S$45", each: "S$4.50" },
  { id: "pack_25", renders: 25, price: "S$100", each: "S$4.00" },
  { id: "pack_60", renders: 60, price: "S$210", each: "S$3.50" },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { designer } = useDashboardData();
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Live tier + this-month usage. Degrades silently if the billing API isn't
  // reachable yet (e.g. backend not redeployed) — the plan cards still render.
  useEffect(() => {
    let active = true;
    api
      .getBilling()
      .then((b) => active && setBilling(b))
      .catch(() => {})
      .finally(() => active && setLoadingUsage(false));
    return () => {
      active = false;
    };
  }, []);

  const currentTier = billing?.entitlement.tier ?? designer?.subscription_tier ?? "free";

  function handleUpgrade(tierId: string) {
    if (tierId === currentTier) return;
    Alert.alert(
      "Upgrade coming soon",
      "Secure checkout is being finalised. You'll be able to upgrade in-app shortly.",
      [{ text: "OK" }]
    );
  }

  function handleBuyPack() {
    Alert.alert("Render packs coming soon", "Top-up render packs will be purchasable here shortly.", [
      { text: "OK" },
    ]);
  }

  const ent = billing?.entitlement;
  const usedPct = ent && ent.includedRenders > 0 ? Math.min(1, ent.rendersUsed / ent.includedRenders) : 0;

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
          <Text className="text-off-white/50 text-xs tracking-widest uppercase">Plans & Usage</Text>
          <Text className="text-off-white text-xl font-serif">Choose Your Plan</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
      >
        {/* ── This-month usage ── */}
        <View className="mb-5 rounded-2xl p-4 bg-off-white/[0.06] border border-off-white/12">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-off-white/55 text-xs tracking-widest uppercase">Renders this month</Text>
            {loadingUsage ? (
              <ActivityIndicator size="small" color="#d98b6a" />
            ) : ent ? (
              <Text className="text-off-white font-sans-semibold text-sm">
                {ent.rendersUsed} / {ent.includedRenders}
              </Text>
            ) : (
              <Text className="text-off-white/40 text-xs">—</Text>
            )}
          </View>
          {/* progress bar */}
          <View className="h-2 rounded-full bg-off-white/10 overflow-hidden">
            <View
              className="h-2 rounded-full bg-terracotta"
              style={{ width: `${Math.round(usedPct * 100)}%` }}
            />
          </View>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-off-white/45 text-xs font-sans">
              {ent ? `${ent.rendersRemaining} included renders left` : "Sign-in usage syncs here"}
            </Text>
            {ent && ent.credits > 0 ? (
              <Text className="text-terracotta-soft text-xs font-sans-semibold">+{ent.credits} credits</Text>
            ) : null}
          </View>
        </View>

        {/* ── Plans ── */}
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentTier;
          const isFeatured = (tier as any).featured;

          return (
            <View
              key={tier.id}
              className={`mb-4 rounded-2xl p-5 border ${
                isFeatured ? "bg-terracotta/12 border-terracotta/40" : "bg-off-white/[0.06] border-off-white/12"
              }`}
            >
              <View className="flex-row items-center justify-between mb-1">
                <View>
                  <Text className="text-xs tracking-widest uppercase text-off-white/55">{tier.name}</Text>
                  <View className="flex-row items-baseline mt-1">
                    <Text className="text-3xl font-serif text-off-white">{tier.price}</Text>
                    {tier.period ? <Text className="text-sm ml-1 text-off-white/45">{tier.period}</Text> : null}
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

              <Text className="text-terracotta-soft text-xs font-sans-semibold mb-3">{tier.renders}</Text>

              <View className="gap-2 mb-4">
                {tier.features.map((f) => (
                  <View key={f} className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-circle" size={16} color="#d98b6a" />
                    <Text className="text-sm flex-1 text-off-white/80">{f}</Text>
                  </View>
                ))}
                {tier.limits.map((l) => (
                  <View key={l} className="flex-row items-center gap-2">
                    <Ionicons name="close-circle-outline" size={16} color="rgba(253,252,248,0.3)" />
                    <Text className="text-sm text-off-white/35">{l}</Text>
                  </View>
                ))}
              </View>

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
                <Text className={`font-sans-semibold text-sm ${isCurrent ? "text-off-white/40" : "text-off-white"}`}>
                  {isCurrent ? "Current Plan" : `Upgrade to ${tier.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* ── Pay-as-you-go render packs ── */}
        <Text className="text-off-white/55 text-xs tracking-widest uppercase mt-2 mb-3">
          Out of renders? Top up
        </Text>
        <View className="flex-row gap-3 mb-5">
          {CREDIT_PACKS.map((pack) => (
            <TouchableOpacity
              key={pack.id}
              onPress={handleBuyPack}
              activeOpacity={0.8}
              className="flex-1 rounded-2xl p-3 bg-off-white/[0.06] border border-off-white/12 items-center"
            >
              <Text className="text-off-white font-serif text-xl">{pack.renders}</Text>
              <Text className="text-off-white/45 text-xs mb-2">renders</Text>
              <Text className="text-off-white font-sans-semibold text-sm">{pack.price}</Text>
              <Text className="text-off-white/40 text-[10px] mt-0.5">{pack.each} each</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer note */}
        <View className="items-center mt-1 px-4">
          <Text className="text-off-white/40 text-xs text-center leading-relaxed">
            Each AI render is one billable photo. Plans include a monthly render allowance;
            extra renders are charged as overage or from a top-up pack.{"\n"}
            Prices in SGD, excl. GST. Annual billing saves ~2 months.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
