import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/lib/auth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Card } from "@/components/Card";
import { DashboardStats } from "@/components/DashboardStats";
import { DashboardActions } from "@/components/DashboardActions";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const { designer, quoteCount, recentQuotes, loading, refresh } = useDashboardData();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const firstName = designer?.full_name?.split(" ")[0] ?? "Designer";

  if (loading) return <DashboardSkeleton />;

  return (
    <SafeAreaView className="flex-1 bg-off-white" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1a1a1a"
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Editorial Hero ── */}
        <View className="w-full bg-charcoal p-8 pt-12">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-off-white/60 text-sm font-sans tracking-widest uppercase mb-2">
                Welcome back
              </Text>
              <Text className="font-serif text-4xl text-off-white">
                Hello, {firstName}.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => signOut()}
              className="w-10 h-10 border border-off-white/20 rounded-full items-center justify-center"
            >
              <Ionicons name="log-out-outline" size={18} color="#fdfcf8" />
            </TouchableOpacity>
          </View>
        </View>

        {recentQuotes.length > 0 ? (
          <>
            <DashboardStats quoteCount={quoteCount} activeQuotesCount={recentQuotes.length} />

            <DashboardActions
              onNewDesign={() => router.push("/(app)/design/upload")}
              onNewQuote={() => router.push("/(app)/quote/new")}
            />

            {/* ── Design history link ── */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/design/history" as any)}
              className="mx-5 mb-6 flex-row items-center justify-between bg-white border border-charcoal/10 rounded-xl px-4 py-3"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="color-wand-outline" size={16} color="#b85c38" />
                <Text className="text-charcoal font-sans text-sm">View Design History</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>

            {/* ── Recent activity ── */}
            <View className="px-5">
              <Text className="text-charcoal text-xl font-serif mb-6">Recent Work</Text>
              <View className="flex-row flex-wrap gap-4">
                {recentQuotes.map((q) => (
                  <View key={q.id} className="w-two-column">
                    <Card
                      title={q.client_name}
                      metadata={q.project_address ?? "Interior project"}
                      onPress={() => router.push(`/(app)/quote/${q.id}`)}
                    />
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* ── Onboarding ── */}
            <View className="px-5 mt-8">
              <View className="bg-white border border-charcoal/10 rounded-2xl p-6 mb-6">
                <Text className="font-serif text-2xl text-charcoal mb-2">
                  Welcome to DesignDesk
                </Text>
                <Text className="font-sans text-sm text-charcoal/50 mb-6">
                  Your AI-powered interior design studio. Get started in two ways:
                </Text>

                <View className="flex-row gap-4">
                  <View className="flex-1 bg-white border border-charcoal/10 rounded-2xl p-5">
                    <Ionicons name="color-wand-outline" size={28} color="#b85c38" />
                    <Text className="font-serif text-lg text-charcoal mt-3 mb-1">
                      Upload a Floor Plan
                    </Text>
                    <Text className="font-sans text-xs text-charcoal/50 mb-4">
                      AI analyses your layout and generates styled designs
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push("/(app)/design/upload")}
                      className="bg-terracotta rounded-xl py-3 items-center"
                    >
                      <Text className="text-off-white font-sans-semibold text-sm">Design Mode</Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-1 bg-white border border-charcoal/10 rounded-2xl p-5">
                    <Ionicons name="calculator-outline" size={28} color="#b85c38" />
                    <Text className="font-serif text-lg text-charcoal mt-3 mb-1">
                      Create a Quotation
                    </Text>
                    <Text className="font-sans text-xs text-charcoal/50 mb-4">
                      Build a professional room-by-room quotation
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push("/(app)/quote/new")}
                      className="bg-terracotta rounded-xl py-3 items-center"
                    >
                      <Text className="text-off-white font-sans-semibold text-sm">Quote Mode</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View className="mb-6">
                <Text className="font-serif text-xl text-charcoal mb-4">How it works</Text>
                {[
                  "Upload your floor plan",
                  "AI detects rooms & generates designs",
                  "Create & export professional quotes",
                ].map((step, i) => (
                  <View key={i} className="flex-row items-start mb-3">
                    <Text className="font-serif text-lg text-terracotta mr-3 w-6">{i + 1}.</Text>
                    <Text className="font-sans text-sm text-charcoal/50 flex-1">{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
