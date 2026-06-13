import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { AppBackdrop } from "@/components/AppBackdrop";

interface DesignSession {
  id: string;
  floor_plan_url: string | null;
  generated_design_url: string | null;
  design_style_id: string | null;
  status: string;
  created_at: string;
  project_type: string | null;
  total_sqft: number | null;
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  analysed:  { label: "Analysed",  color: "#d98b6a", bg: "rgba(217,139,106,0.14)" },
  generated: { label: "Generated", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  error:     { label: "Error",     color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStyle(id: string | null): string {
  if (!id) return "No style";
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SessionCard({ session, onPress }: { session: DesignSession; onPress: () => void }) {
  const status = STATUS_STYLE[session.status] ?? STATUS_STYLE.analysed;
  const imageUrl = session.generated_design_url || session.floor_plan_url;
  const isDataUri = imageUrl?.startsWith("data:");

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-off-white/[0.06] border border-off-white/12 rounded-2xl overflow-hidden mb-4"
    >
      {/* Image */}
      {imageUrl && !isDataUri ? (
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-40"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-40 bg-off-white/5 items-center justify-center">
          <Ionicons name="image-outline" size={32} color="#fdfcf8" style={{ opacity: 0.2 }} />
        </View>
      )}

      {/* Info */}
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-off-white font-serif text-base">
            {formatStyle(session.design_style_id)}
          </Text>
          <View style={{ backgroundColor: status.bg }} className="px-2.5 py-1 rounded-full">
            <Text style={{ color: status.color }} className="text-xs font-sans">
              {status.label}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          {session.project_type && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="home-outline" size={12} color="rgba(253,252,248,0.45)" />
              <Text className="text-off-white/50 text-xs font-sans capitalize">{session.project_type}</Text>
            </View>
          )}
          {session.total_sqft && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="resize-outline" size={12} color="rgba(253,252,248,0.45)" />
              <Text className="text-off-white/50 text-xs font-sans">{session.total_sqft} sqft</Text>
            </View>
          )}
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={12} color="rgba(253,252,248,0.45)" />
            <Text className="text-off-white/50 text-xs font-sans">{formatDate(session.created_at)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 pt-16">
      <View className="w-20 h-20 bg-off-white/10 border border-off-white/15 rounded-3xl items-center justify-center mb-5">
        <Ionicons name="color-wand-outline" size={36} color="rgba(253,252,248,0.5)" />
      </View>
      <Text className="text-off-white text-lg font-serif text-center mb-2">
        No designs yet
      </Text>
      <Text className="text-off-white/50 text-sm font-sans text-center leading-relaxed mb-8">
        Upload your first floor plan and let AI generate a styled interior design.
      </Text>
      <TouchableOpacity
        onPress={onNew}
        activeOpacity={0.85}
        className="bg-terracotta px-6 py-3 rounded-full flex-row items-center gap-2"
      >
        <Ionicons name="add" size={18} color="#fdfcf8" />
        <Text className="text-off-white text-sm font-sans-bold">Upload Floor Plan</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DesignHistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DesignSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listDesignSessions();
      setSessions(data as DesignSession[]);
    } catch (e) {
      console.error("Failed to load design sessions:", e);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <AppBackdrop />
      <View className="flex-row items-center justify-between px-5 pt-4 pb-5">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 bg-off-white/10 border border-off-white/15 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={18} color="#fdfcf8" />
          </TouchableOpacity>
          <View>
            <Text className="text-off-white text-xl font-serif">Design History</Text>
            {sessions.length > 0 && (
              <Text className="text-off-white/50 text-xs mt-0.5 font-sans">
                {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(app)/design/upload")}
          className="w-9 h-9 bg-terracotta/15 border border-terracotta/35 rounded-full items-center justify-center"
        >
          <Ionicons name="add" size={20} color="#d98b6a" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#d98b6a" size="large" />
        </View>
      ) : sessions.length === 0 ? (
        <EmptyState onNew={() => router.push("/(app)/design/upload")} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => router.push(`/(app)/design/upload`)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#d98b6a"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
