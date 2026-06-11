import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Designer } from "@/types";

// ─── Recent project card ──────────────────────────────────────────────────────

function RecentCard({
  title,
  subtitle,
  icon,
  badge,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-brand-mid border border-white/8 rounded-2xl p-4 mb-3 flex-row items-center gap-3"
    >
      <View className="w-10 h-10 bg-brand-accent/15 rounded-xl items-center justify-center">
        <Ionicons name={icon} size={18} color="#C9A96E" />
      </View>
      <View className="flex-1">
        <Text className="text-white text-sm font-semibold">{title}</Text>
        <Text className="text-brand-muted text-xs mt-0.5">{subtitle}</Text>
      </View>
      {badge && (
        <View className="bg-brand-accent/20 px-2.5 py-1 rounded-full">
          <Text className="text-brand-accent text-xs font-medium">{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Mode card ────────────────────────────────────────────────────────────────

function ModeCard({
  title,
  description,
  icon,
  gradient,
  onPress,
  tag,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  onPress: () => void;
  tag: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} className="flex-1">
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1 rounded-3xl p-6 min-h-[200px]"
      >
        {/* Tag */}
        <View className="self-start bg-white/15 px-3 py-1 rounded-full mb-4">
          <Text className="text-white/80 text-xs font-medium tracking-wider uppercase">
            {tag}
          </Text>
        </View>

        {/* Icon */}
        <View className="w-14 h-14 bg-white/15 rounded-2xl items-center justify-center mb-4">
          <Ionicons name={icon} size={28} color="white" />
        </View>

        {/* Text */}
        <Text className="text-white text-xl font-bold mb-2">{title}</Text>
        <Text className="text-white/70 text-sm leading-relaxed">{description}</Text>

        {/* Arrow */}
        <View className="mt-auto pt-4 flex-row items-center gap-1">
          <Text className="text-white/60 text-sm font-medium">Get started</Text>
          <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.6)" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [quoteCount, setQuoteCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [recentQuotes, setRecentQuotes] = useState<any[]>([]);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("designers")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      setDesigner({
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? "Designer",
        subscription_tier: profile?.subscription_tier ?? "free",
        created_at: user.created_at,
      });
    }
  }

  async function loadStats() {
    try {
      const quotes = await api.listQuotations() as any[];
      setQuoteCount(quotes.length);
      setClientCount(new Set(quotes.map((q: any) => q.client_name)).size);
      setRecentQuotes(quotes.slice(0, 3));
      const now = new Date();
      const monthly = quotes
        .filter((q) => {
          const d = new Date(q.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum: number, q: any) => sum + (q.grand_total ?? 0), 0);
      setMonthlyTotal(monthly);
    } catch {
      // stats are best-effort — silently fail
    }
  }

  useEffect(() => {
    loadUser();
    loadStats();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadUser(), loadStats()]);
    setRefreshing(false);
  }

  const firstName = designer?.full_name?.split(" ")[0] ?? "Designer";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C9A96E"
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Header ── */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-6">
          <View>
            <Text className="text-brand-muted text-sm">{greeting},</Text>
            <Text className="text-white text-2xl font-bold mt-0.5">
              {firstName} 👋
            </Text>
          </View>
          <TouchableOpacity
            onPress={async () => {
              await signOut();
              // AuthGate handles redirect automatically
            }}
            className="w-10 h-10 bg-brand-mid border border-white/10 rounded-full items-center justify-center"
          >
            <Ionicons name="person-outline" size={18} color="#8892A4" />
          </TouchableOpacity>
        </View>

        {/* ── Stats bar ── */}
        <View className="flex-row gap-3 px-5 mb-8">
          {[
            { label: "Clients", value: String(clientCount), icon: "people-outline" as const },
            { label: "Quotes", value: String(quoteCount), icon: "document-text-outline" as const },
            { label: "This month", value: monthlyTotal > 0 ? `S$${Math.round(monthlyTotal / 1000)}k` : "S$0", icon: "trending-up-outline" as const },
          ].map((stat) => (
            <View
              key={stat.label}
              className="flex-1 bg-brand-mid border border-white/8 rounded-2xl p-3 items-center"
            >
              <Ionicons name={stat.icon} size={16} color="#C9A96E" />
              <Text className="text-white text-lg font-bold mt-1">
                {stat.value}
              </Text>
              <Text className="text-brand-muted text-xs">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Mode cards ── */}
        <Text className="text-brand-muted text-xs font-semibold tracking-widest uppercase px-5 mb-4">
          What would you like to do?
        </Text>
        <View className="flex-row gap-4 px-5 mb-8">
          <ModeCard
            title="Design Mode"
            description="Upload a floor plan, pick a style, and generate a top-view design to show your client."
            icon="color-palette-outline"
            gradient={["#C9A96E", "#8B6914"] as const}
            tag="AI Design"
            onPress={() => router.push("/(app)/design/upload")}
          />
          <ModeCard
            title="Paperwork Mode"
            description="Build a detailed room-by-room quotation and export a professional PDF."
            icon="document-text-outline"
            gradient={["#0F3460", "#16213E"] as const}
            tag="Quotation"
            onPress={() => router.push("/(app)/quote/new")}
          />
        </View>

        {/* ── Subscription badge (free tier nudge) ── */}
        {designer?.subscription_tier === "free" && (
          <TouchableOpacity
            className="mx-5 mb-8 rounded-2xl overflow-hidden"
            activeOpacity={0.85}
            onPress={() => router.push("/(app)/subscription")}
          >
            <LinearGradient
              colors={["#0F3460", "#1A1A2E"]}
              className="flex-row items-center gap-3 p-4 border border-brand-accent/30 rounded-2xl"
            >
              <View className="w-10 h-10 bg-brand-accent/20 rounded-xl items-center justify-center">
                <Ionicons name="star-outline" size={18} color="#C9A96E" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold">
                  You're on the Free plan
                </Text>
                <Text className="text-brand-muted text-xs mt-0.5">
                  Upgrade to Pro for unlimited designs & PDF exports
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C9A96E" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Recent activity ── */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-brand-muted text-xs font-semibold tracking-widest uppercase">
              Recent Quotations
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(app)/quote/list")}
              className="flex-row items-center gap-1"
            >
              <Text className="text-brand-accent text-xs font-medium">View all</Text>
              <Ionicons name="arrow-forward" size={12} color="#C9A96E" />
            </TouchableOpacity>
          </View>

          {recentQuotes.length > 0 ? (
            recentQuotes.map((q) => (
              <RecentCard
                key={q.id}
                title={q.client_name}
                subtitle={q.project_address ?? "Interior project"}
                icon="document-text-outline"
                badge={q.status}
                onPress={() => router.push(`/(app)/quote/${q.id}` as any)}
              />
            ))
          ) : (
            <View className="bg-brand-mid border border-white/8 rounded-2xl p-8 items-center">
              <Ionicons name="document-text-outline" size={32} color="#8892A4" />
              <Text className="text-white text-base font-semibold mt-3">
                No quotations yet
              </Text>
              <Text className="text-brand-muted text-sm text-center mt-1 leading-relaxed">
                Create a room-by-room quotation and export a professional PDF.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(app)/quote/new")}
                activeOpacity={0.85}
                className="mt-5 bg-brand-accent/15 border border-brand-accent/30 px-5 py-2.5 rounded-xl flex-row items-center gap-2"
              >
                <Ionicons name="add" size={16} color="#C9A96E" />
                <Text className="text-brand-accent text-sm font-semibold">New Quotation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
