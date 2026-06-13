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
import { AppBackdrop } from "@/components/AppBackdrop";

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
  draft:    { label: "Draft",    color: "#999",    bg: "rgba(153,153,153,0.10)" },
  sent:     { label: "Sent",     color: "#b85c38", bg: "rgba(184,92,56,0.10)" },
  accepted: { label: "Accepted", color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
  rejected: { label: "Rejected", color: "#dc2626", bg: "rgba(220,38,38,0.10)" },
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
      className="bg-off-white/[0.06] border border-off-white/12 rounded-2xl p-4 mb-3"
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-off-white text-sm font-sans-semibold flex-1 mr-3" numberOfLines={1}>
          {quote.client_name}
        </Text>
        <View
          style={{ backgroundColor: status.bg }}
          className="px-2.5 py-1 rounded-full"
        >
          <Text style={{ color: status.color }} className="text-xs font-sans">
            {status.label}
          </Text>
        </View>
      </View>

      <Text className="text-off-white/50 text-xs mb-3 font-sans" numberOfLines={1}>
        {quote.project_address}
      </Text>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="home-outline" size={12} color="rgba(253,252,248,0.45)" />
          <Text className="text-off-white/50 text-xs capitalize font-sans">
            {quote.project_type}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={12} color="rgba(253,252,248,0.45)" />
            <Text className="text-off-white/50 text-xs font-sans">
              {formatDate(quote.created_at)}
            </Text>
          </View>
          <Text className="text-terracotta-soft text-sm font-sans-bold">
            {formatCurrency(quote.grand_total)}
          </Text>
        </View>
      </View>

      <View className="absolute right-4 top-1/2 -translate-y-2">
        <Ionicons name="chevron-forward" size={16} color="rgba(253,252,248,0.2)" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 pt-16">
      <View className="w-20 h-20 bg-off-white/10 border border-off-white/15 rounded-3xl items-center justify-center mb-5">
        <Ionicons name="document-text-outline" size={36} color="rgba(253,252,248,0.5)" />
      </View>
      <Text className="text-off-white text-lg font-serif text-center mb-2">
        No quotations yet
      </Text>
      <Text className="text-off-white/50 text-sm font-sans text-center leading-relaxed mb-8">
        Create your first professional quotation — room by room, with PDF export.
      </Text>
      <TouchableOpacity
        onPress={onNew}
        activeOpacity={0.85}
        className="bg-terracotta px-6 py-3 rounded-full flex-row items-center gap-2"
      >
        <Ionicons name="add" size={18} color="#fdfcf8" />
        <Text className="text-off-white text-sm font-sans-bold">New Quotation</Text>
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
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <AppBackdrop />
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-5">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 bg-off-white/10 border border-off-white/15 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={18} color="#fdfcf8" />
          </TouchableOpacity>
          <View>
            <Text className="text-off-white text-xl font-serif">Quotations</Text>
            {quotes.length > 0 && (
              <Text className="text-off-white/50 text-xs mt-0.5 font-sans">
                {quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
              </Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push("/(app)/quote/builder")}
            className="flex-row items-center gap-1.5 h-9 px-3 bg-off-white/15 border border-off-white/20 rounded-full"
          >
            <Ionicons name="construct-outline" size={16} color="#fdfcf8" />
            <Text className="text-off-white text-sm font-sans-semibold">Build</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(app)/quote/new")}
            className="w-9 h-9 bg-terracotta/15 border border-terracotta/35 rounded-full items-center justify-center"
          >
            <Ionicons name="add" size={20} color="#d98b6a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#d98b6a" size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={40} color="#e87a5a" />
          <Text className="text-off-white text-base font-sans-semibold mt-3 text-center">
            Something went wrong
          </Text>
          <Text className="text-off-white/50 text-sm font-sans text-center mt-1">{error}</Text>
          <TouchableOpacity
            onPress={() => { setLoading(true); loadQuotes().finally(() => setLoading(false)); }}
            className="mt-6 bg-off-white/10 border border-off-white/15 px-5 py-2.5 rounded-full"
          >
            <Text className="text-off-white text-sm font-sans">Try again</Text>
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
              tintColor="#d98b6a"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
