import { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from "react-native";
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

// ── Interim manual checkout ──────────────────────────────────────────────────
// While the payment merchant is being finalised, "Upgrade" / "Buy" open a
// pre-filled WhatsApp chat with the DesignDesk team to arrange the subscription.
const WHATSAPP_NUMBER = "6593222332"; // +65 9322 2332
const WHATSAPP_DISPLAY = "+65 9322 2332";
const MOVARA_URL = "https://movarasolutions.com";

function openWhatsApp(message: string) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  Linking.openURL(url).catch(() =>
    Alert.alert("Couldn't open WhatsApp", `Message our team at ${WHATSAPP_DISPLAY} to set up your subscription.`)
  );
}

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
    const tier = TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    openWhatsApp(
      `Hi DesignDesk team! I'd like to subscribe to the ${tier.name} plan (${tier.price}${tier.period}).\n\n` +
        `I understand DesignDesk is currently in testing while you improve it. ` +
        `Please set up my official account subscription and let me know when we go live.`
    );
  }

  function handleBuyPack(pack: { renders: number; price: string }) {
    openWhatsApp(
      `Hi DesignDesk team! I'd like to buy the ${pack.renders}-render top-up pack (${pack.price}).\n\n` +
        `I understand DesignDesk is currently in testing. Please confirm my order and let me know when we go live.`
    );
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

        {/* ── Testing notice ── */}
        <View className="mb-5 rounded-2xl p-4 bg-terracotta/10 border border-terracotta/30">
          <View className="flex-row items-center gap-2 mb-1.5">
            <Ionicons name="flask-outline" size={16} color="#d98b6a" />
            <Text className="text-terracotta-soft text-xs font-sans-semibold tracking-wide uppercase">
              Early access · in testing
            </Text>
          </View>
          <Text className="text-off-white/70 text-xs font-sans leading-relaxed">
            We're refining DesignDesk with our first designers. To subscribe, pick a plan and message
            us on WhatsApp — our team sets up your official account and confirms your go-live date.
          </Text>
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
              onPress={() => handleBuyPack(pack)}
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

        {/* ── Trust & support ── */}
        <View className="rounded-2xl p-4 bg-off-white/[0.06] border border-off-white/12 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="shield-checkmark-outline" size={18} color="#d98b6a" />
            <Text className="text-off-white font-sans-semibold text-sm">Trusted & supported</Text>
          </View>
          {[
            { icon: "lock-closed-outline", label: "Your designs & quotes stay private to your account" },
            { icon: "chatbubbles-outline", label: "Real humans on WhatsApp — usually reply within the day" },
            { icon: "refresh-outline", label: "No lock-in while we're in testing — cancel anytime" },
          ].map((row) => (
            <View key={row.label} className="flex-row items-center gap-2.5 mb-2">
              <Ionicons name={row.icon as any} size={15} color="rgba(253,252,248,0.55)" />
              <Text className="text-off-white/70 text-xs flex-1 font-sans">{row.label}</Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => openWhatsApp("Hi DesignDesk team! I have a question about the plans.")}
            activeOpacity={0.8}
            className="mt-2 py-3 rounded-full items-center flex-row justify-center gap-2 bg-off-white/10 border border-off-white/15"
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text className="text-off-white font-sans-semibold text-sm">Chat with support · {WHATSAPP_DISPLAY}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <View className="items-center mt-1 px-4">
          <Text className="text-off-white/40 text-xs text-center leading-relaxed">
            Each AI render is one billable photo. Prices in SGD, excl. GST.{"\n"}
            Subscriptions are arranged with our team while we finalise secure payments.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(MOVARA_URL).catch(() => {})}
            activeOpacity={0.7}
            className="mt-3 flex-row items-center gap-1.5"
          >
            <Text className="text-off-white/35 text-xs">Powered by</Text>
            <Text className="text-terracotta-soft text-xs font-sans-semibold">MovaraSolutions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
