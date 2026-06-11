import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Quotation, QuoteLineItem } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Quotation["status"],
  { label: string; color: string; bg: string }
> = {
  draft:    { label: "Draft",    color: "#8892A4", bg: "rgba(136,146,164,0.15)" },
  sent:     { label: "Sent",     color: "#C9A96E", bg: "rgba(201,169,110,0.15)" },
  accepted: { label: "Accepted", color: "#4CAF82", bg: "rgba(76,175,130,0.15)" },
  rejected: { label: "Rejected", color: "#E57373", bg: "rgba(229,115,115,0.15)" },
};

function formatCurrency(n: number) {
  return `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByCategory(items: QuoteLineItem[]): Record<string, QuoteLineItem[]> {
  return items.reduce<Record<string, QuoteLineItem[]>>((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-start py-2.5 border-b border-white/5">
      <Text className="text-brand-muted text-xs w-32">{label}</Text>
      <Text className="text-white text-xs font-medium flex-1 text-right">{value}</Text>
    </View>
  );
}

function CategorySection({ category, items }: { category: string; items: QuoteLineItem[] }) {
  const categoryTotal = items.reduce((sum, i) => sum + i.total_amount, 0);

  return (
    <View className="mb-4">
      {/* Category header */}
      <View className="flex-row justify-between items-center py-2 mb-1">
        <Text className="text-brand-accent text-xs font-bold tracking-wider uppercase">
          {category}
        </Text>
        <Text className="text-brand-accent text-xs font-semibold">
          {formatCurrency(categoryTotal)}
        </Text>
      </View>

      {/* Line items */}
      {items.map((item, idx) => (
        <View
          key={idx}
          className="bg-brand-mid/60 border border-white/5 rounded-xl px-3 py-3 mb-1.5"
        >
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-white text-xs font-medium flex-1 mr-3" numberOfLines={2}>
              {item.item_name}
            </Text>
            <Text className="text-white text-xs font-semibold">
              {formatCurrency(item.total_amount)}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            {item.room && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="location-outline" size={11} color="#8892A4" />
                <Text className="text-brand-muted text-xs">{item.room}</Text>
              </View>
            )}
            <Text className="text-brand-muted text-xs">
              {item.quantity} {item.unit} × {formatCurrency(item.unit_rate)}
            </Text>
            <View className="ml-auto bg-white/5 px-1.5 py-0.5 rounded-md">
              <Text className="text-brand-muted text-xs">{item.selected_tier}</Text>
            </View>
          </View>
          {item.notes ? (
            <Text className="text-brand-muted text-xs mt-1 italic">{item.notes}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getQuotation(id);
      setQuote(data as Quotation);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load quotation");
    }
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleExportPdf() {
    if (!quote) return;
    setExporting(true);
    try {
      // Fetch auth token to include in the download request
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const pdfUrl = api.getPdfUrl(quote.id);
      const dest = new File(Paths.cache, `quote-${quote.id.slice(0, 8)}.pdf`);
      const downloaded = await File.downloadFileAsync(pdfUrl, dest, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing not available", "Your device doesn't support file sharing.");
        return;
      }

      await Sharing.shareAsync(downloaded.uri, {
        mimeType: "application/pdf",
        dialogTitle: `Quote for ${quote.client_name}`,
        UTI: "com.adobe.pdf",
      });
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Could not export PDF");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-brand-dark items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#C9A96E" size="large" />
      </SafeAreaView>
    );
  }

  if (error || !quote) {
    return (
      <SafeAreaView className="flex-1 bg-brand-dark items-center justify-center px-8" edges={["top"]}>
        <Ionicons name="alert-circle-outline" size={40} color="#E57373" />
        <Text className="text-white text-base font-semibold mt-3 text-center">
          {error ?? "Quotation not found"}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 bg-brand-mid border border-white/10 px-5 py-2.5 rounded-xl"
        >
          <Text className="text-white text-sm font-medium">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const status = STATUS_CONFIG[quote.status];
  const grouped = groupByCategory(quote.line_items);

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 bg-brand-mid border border-white/10 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={18} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-lg font-bold" numberOfLines={1}>
              {quote.client_name}
            </Text>
            <Text className="text-brand-muted text-xs mt-0.5">
              {formatDate(quote.created_at)}
            </Text>
          </View>
        </View>

        {/* Status badge */}
        <View style={{ backgroundColor: status.bg }} className="px-3 py-1.5 rounded-full">
          <Text style={{ color: status.color }} className="text-xs font-semibold">
            {status.label}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
      >
        {/* ── Project info ── */}
        <View className="bg-brand-mid border border-white/8 rounded-2xl p-4 mb-5">
          <Text className="text-brand-muted text-xs font-semibold tracking-widest uppercase mb-3">
            Project Details
          </Text>
          <InfoRow label="Address" value={quote.project_address} />
          <InfoRow label="Type" value={quote.project_type} />
          <InfoRow label="Size" value={`${quote.total_sqft} sqft`} />
          <InfoRow label="Rooms" value={quote.rooms.join(", ")} />
        </View>

        {/* ── Line items by category ── */}
        <View className="bg-brand-mid border border-white/8 rounded-2xl p-4 mb-5">
          <Text className="text-brand-muted text-xs font-semibold tracking-widest uppercase mb-4">
            Scope of Work
          </Text>
          {Object.entries(grouped).map(([cat, items]) => (
            <CategorySection key={cat} category={cat} items={items} />
          ))}
        </View>

        {/* ── Totals ── */}
        <View className="bg-brand-mid border border-white/8 rounded-2xl p-4">
          <Text className="text-brand-muted text-xs font-semibold tracking-widest uppercase mb-3">
            Summary
          </Text>
          <View className="flex-row justify-between py-2 border-b border-white/5">
            <Text className="text-brand-muted text-sm">Subtotal</Text>
            <Text className="text-white text-sm">{formatCurrency(quote.subtotal)}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-white/5">
            <Text className="text-brand-muted text-sm">GST (9%)</Text>
            <Text className="text-white text-sm">{formatCurrency(quote.gst_amount)}</Text>
          </View>
          <View className="flex-row justify-between pt-3 mt-1">
            <Text className="text-white text-base font-bold">Grand Total</Text>
            <Text className="text-brand-accent text-base font-bold">
              {formatCurrency(quote.grand_total)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky export button ── */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-brand-dark/95">
        <TouchableOpacity
          onPress={handleExportPdf}
          disabled={exporting}
          activeOpacity={0.85}
          className="bg-brand-accent rounded-2xl py-4 flex-row items-center justify-center gap-2"
        >
          {exporting ? (
            <ActivityIndicator color="#1A1A2E" size="small" />
          ) : (
            <Ionicons name="download-outline" size={18} color="#1A1A2E" />
          )}
          <Text className="text-brand-dark text-sm font-bold">
            {exporting ? "Preparing PDF…" : "Export PDF"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
