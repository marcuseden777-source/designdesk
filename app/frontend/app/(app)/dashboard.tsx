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
import { useDashboardData } from "@/hooks/useDashboardData";
import { Card } from "@/components/Card";

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
        <View className="w-full bg-charcoal p-8 pt-12">
          <Text className="text-off-white/60 text-sm font-sans tracking-widest uppercase mb-2">
            Welcome back
          </Text>
          <Text className="font-serif text-4xl text-off-white">
            Hello, {firstName}.
          </Text>
        </View>

        {/* ── Stats ── */}
        <View className="flex-row gap-4 p-5">
          <View className="flex-1 border-b border-charcoal/20 pb-4">
            <Text className="text-charcoal text-2xl font-serif">{quoteCount}</Text>
            <Text className="text-charcoal/70 text-xs font-sans mt-1 uppercase tracking-wider">Quotations</Text>
          </View>
          <View className="flex-1 border-b border-charcoal/20 pb-4">
            <Text className="text-charcoal text-2xl font-serif">{recentQuotes.length}</Text>
            <Text className="text-charcoal/70 text-xs font-sans mt-1 uppercase tracking-wider">Active</Text>
          </View>
        </View>

        {/* ── Actions ── */}
        <View className="px-5 mb-8 flex-row gap-4">
          <TouchableOpacity
            onPress={() => router.push("/(app)/design/upload")}
            className="flex-1 border border-charcoal p-4"
          >
            <Text className="font-serif text-lg text-charcoal">New Design</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(app)/quote/new")}
            className="flex-1 border border-charcoal p-4"
          >
            <Text className="font-serif text-lg text-charcoal">New Quote</Text>
          </TouchableOpacity>
        </View>

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
                  onPress={() => router.push(`/(app)/quote/${q.id}` as any)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
