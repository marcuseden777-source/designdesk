import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuotationSummary {
  id: string;
  client_name: string;
  project_address: string;
  project_type: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  grand_total: number;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  QuotationSummary["status"],
  { label: string; color: string; bg: string }
> = {
  draft:    { label: "Draft",    color: "#8892A4", bg: "rgba(136,146,164,0.15)" },
  sent:     { label: "Sent",     color: "#C9A96E", bg: "rgba(201,169,110,0.15)" },
  accepted: { label: "Accepted", color: "#4CAF82", bg: "rgba(76,175,130,0.15)" },
  rejected: { label: "Rejected", color: "#E57373", bg: "rgba(229,115,115,0.15)" },
};

function formatCurrency(amount: number) {
  return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Quote row card ───────────────────────────────────────────────────────────

function QuoteCard({
  quote,
  onPress,
}: {
  quote: QuotationSummary;
  onPress: () => void;
}) {
  const status = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-brand-mid border border-white/8 rounded-2xl p-4 mb-3"
    >
      {/* Top row: client + status badge */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white text-sm font-semibold flex-1 mr-3" numberOfLines={1}>
          {quote.client_name}
        </Text>
        <View
          style={{ backgroundColor: status.bg }}
          className="px-2.5 py-1 rounded-full"
        >
          <Text style={{ color: status.color }} className="text-xs font-medium">
            {status.label}
          </Text>
        </View>
      </View>

      {/* Address */}
      <Text className="text-brand-muted text-xs mb-3" numberOfLines={1}>
        {quote.project_address}
      </Text>

      {/* Bottom row: type + date + total */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="home-outline" size={12} color="#8892A4" />
          <Text className="text-brand-muted text-xs capitalize">
            {quote.project_type}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={12} color="#8892A4" />
            <Text className="text-brand-muted text-xs">
              {formatDate(quote.created_at)}
            </Text>
          </View>
          <Text className="text-brand-accent text-sm font-bold">
            {formatCurrency(quote.grand_total)}
          </Text>
        </View>
      </View>

      {/* Tap hint */}
      <View className="absolute right-4 top-1/2 -translate-y-2">
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 pt-16">
      <View className="w-20 h-20 bg-brand-mid border border-white/8 rounded-3xl items-center justify-center mb-5">
        <Ionicons name="document-text-outline" size={36} color="#8892A4" />
      </View>
      <Text className="text-white text-lg font-bold text-center mb-2">
        No quotations yet
      </Text>
      <Text className="text-brand-muted text-sm text-center leading-relaxed mb-8">
        Create your first professional quotation — room by room, with PDF export.
      </Text>
      <TouchableOpacity
        onPress={onNew}
        activeOpacity={0.85}
        className="bg-brand-accent px-6 py-3 rounded-2xl flex-row items-center gap-2"
      >
        <Ionicons name="add" size={18} color="#1A1A2E" />
        <Text className="text-brand-dark text-sm font-bold">New Quotation</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function QuoteListScreen() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuotationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuotes = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listQuotations();
      setQuotes(data as QuotationSummary[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load quotations");
    }
  }, []);

  useEffect(() => {
    loadQuotes().finally(() => setLoading(false));
  }, [loadQuotes]);

  async function onRefresh() {
    setRefreshing(true);
    await loadQuotes();
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-5">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 bg-brand-mid border border-white/10 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={18} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-bold">Quotations</Text>
            {quotes.length > 0 && (
              <Text className="text-brand-muted text-xs mt-0.5">
                {quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(app)/quote/new")}
          className="w-9 h-9 bg-brand-accent/20 border border-brand-accent/30 rounded-full items-center justify-center"
        >
          <Ionicons name="add" size={20} color="#C9A96E" />
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C9A96E" size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={40} color="#E57373" />
          <Text className="text-white text-base font-semibold mt-3 text-center">
            Something went wrong
          </Text>
          <Text className="text-brand-muted text-sm text-center mt-1">{error}</Text>
          <TouchableOpacity
            onPress={() => { setLoading(true); loadQuotes().finally(() => setLoading(false)); }}
            className="mt-6 bg-brand-mid border border-white/10 px-5 py-2.5 rounded-xl"
          >
            <Text className="text-white text-sm font-medium">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : quotes.length === 0 ? (
        <EmptyState onNew={() => router.push("/(app)/quote/new")} />
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            <QuoteCard
              quote={item}
              onPress={() => router.push(`/(app)/quote/${item.id}` as any)}
            />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#C9A96E"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
