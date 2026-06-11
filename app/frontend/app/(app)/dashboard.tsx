import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Card } from "@/components/Card";
import { DashboardStats } from "@/components/DashboardStats";
import { DashboardActions } from "@/components/DashboardActions";

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
        <View className="relative">
          <View className="w-full bg-charcoal p-8 pt-12 pb-16">
            <Text className="text-off-white/60 text-sm font-sans tracking-widest uppercase mb-2">
              Welcome back
            </Text>
            <Text className="font-serif text-4xl text-off-white">
              Hello, {firstName}.
            </Text>
          </View>

          <DashboardStats quoteCount={quoteCount} activeQuotesCount={recentQuotes.length} />
        </View>

        <DashboardActions
          onNewDesign={() => router.push("/(app)/design/upload")}
          onNewQuote={() => router.push("/(app)/quote/new")}
        />

        {/* ── Recent activity (Masonry-like) ── */}
        <View className="px-5">
          <Text className="text-charcoal text-xl font-serif mb-6">Recent Work</Text>
          <View className="flex-row flex-wrap gap-4">
            {recentQuotes.map((q) => (
              <View key={q.id} className="w-two-column">
                <Card
                  imageSource={{ uri: 'https://picsum.photos/400/300' }}
                  title={q.client_name}
                  metadata={q.project_address ?? "Interior project"}
                  onPress={() => router.push(`/(app)/quote/${q.id}`)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
