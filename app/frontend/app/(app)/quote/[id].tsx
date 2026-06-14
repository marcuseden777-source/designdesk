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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { exportPdf } from "@/lib/pdfExport";
import { AppBackdrop } from "@/components/AppBackdrop";
import type { Quotation, QuoteLineItem } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Quotation["status"],
  { label: string; color: string; bg: string }
> = {
  draft:    { label: "Draft",    color: "#b8a99c", bg: "rgba(184,169,156,0.12)" },
  sent:     { label: "Sent",     color: "#d98b6a", bg: "rgba(217,139,106,0.14)" },
  accepted: { label: "Accepted", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  rejected: { label: "Rejected", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
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
    <View className="flex-row justify-between items-start py-2.5 border-b border-off-white/10">
      <Text className="text-off-white/50 text-xs w-32 font-sans">{label}</Text>
      <Text className="text-off-white text-xs font-sans flex-1 text-right">{value}</Text>
    </View>
  );
}

function CategorySection({ category, items }: { category: string; items: QuoteLineItem[] }) {
  const categoryTotal = items.reduce((sum, i) => sum + i.total_amount, 0);

  return (
    <View className="mb-4">
      <View className="flex-row justify-between items-center py-2 mb-1">
        <Text className="text-terracotta-soft text-xs font-sans-bold tracking-wider uppercase">
          {category}
        </Text>
        <Text className="text-terracotta-soft text-xs font-sans-semibold">
          {formatCurrency(categoryTotal)}
        </Text>
      </View>

      {items.map((item, idx) => (
        <View
          key={idx}
          className="bg-off-white/[0.06] border border-off-white/10 rounded-xl px-3 py-3 mb-1.5"
        >
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-off-white text-xs font-sans flex-1 mr-3" numberOfLines={2}>
              {item.item_name}
            </Text>
            <Text className="text-off-white text-xs font-sans-semibold">
              {formatCurrency(item.total_amount)}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            {item.room && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="location-outline" size={11} color="rgba(253,252,248,0.45)" />
                <Text className="text-off-white/50 text-xs font-sans">{item.room}</Text>
              </View>
            )}
            <Text className="text-off-white/50 text-xs font-sans">
              {item.quantity} {item.unit} × {formatCurrency(item.unit_rate)}
            </Text>
            <View className="ml-auto bg-off-white/10 px-1.5 py-0.5 rounded-md">
              <Text className="text-off-white/50 text-xs font-sans">{item.selected_tier}</Text>
            </View>
          </View>
          {(item as any).notes ? (
            <Text className="text-off-white/50 text-xs mt-1 italic font-sans">{(item as any).notes}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

// ─── Status transitions ──────────────────────────────────────────────────────

const NEXT_STATUS: Record<string, { action: string; target: "sent" | "accepted" | "rejected" | "draft"; icon: keyof typeof Ionicons.glyphMap; color: string }[]> = {
  draft: [
    { action: "Mark as Sent", target: "sent", icon: "send-outline", color: "#b85c38" },
  ],
  sent: [
    { action: "Accept", target: "accepted", icon: "checkmark-circle-outline", color: "#16a34a" },
    { action: "Reject", target: "rejected", icon: "close-circle-outline", color: "#dc2626" },
  ],
  rejected: [
    { action: "Reopen as Draft", target: "draft", icon: "refresh-outline", color: "#6b6258" },
  ],
  accepted: [],
};

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [quote, setQuote] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
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
      await exportPdf(quote.id, quote.client_name);
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Could not export PDF");
    } finally {
      setExporting(false);
    }
  }

  async function handleStatusChange(target: "draft" | "sent" | "accepted" | "rejected") {
    if (!quote) return;
    setTransitioning(true);
    try {
      const result = await api.updateQuotationStatus(quote.id, target);
      setQuote({ ...quote, status: result.status as Quotation["status"] });
    } catch (e: any) {
      Alert.alert("Status Update Failed", e?.message ?? "Could not update status");
    } finally {
      setTransitioning(false);
    }
  }

  function handleEdit() {
    if (!quote) return;
    router.push({
      pathname: "/(app)/quote/new",
      params: {
        edit_id: quote.id,
        client_name: quote.client_name,
        project_address: quote.project_address,
        project_type: quote.project_type,
        sqft: String(quote.total_sqft),
        rooms: JSON.stringify(quote.rooms),
      },
    });
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-ink items-center justify-center" edges={["top"]}>
        <AppBackdrop />
        <ActivityIndicator color="#d98b6a" size="large" />
      </SafeAreaView>
    );
  }

  if (error || !quote) {
    return (
      <SafeAreaView className="flex-1 bg-ink items-center justify-center px-8" edges={["top"]}>
        <AppBackdrop />
        <Ionicons name="alert-circle-outline" size={40} color="#f87171" />
        <Text className="text-off-white text-base font-sans-semibold mt-3 text-center">
          {error ?? "Quotation not found"}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 bg-off-white/[0.05] border border-off-white/12 px-5 py-2.5 rounded-xl"
        >
          <Text className="text-off-white text-sm font-sans">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const status = STATUS_CONFIG[quote.status];
  const grouped = groupByCategory(quote.line_items);

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <AppBackdrop />
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 bg-off-white/10 border border-off-white/15 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={18} color="#fdfcf8" />
          </TouchableOpacity>
          <View>
            <Text className="text-off-white text-lg font-serif" numberOfLines={1}>
              {quote.client_name}
            </Text>
            <Text className="text-off-white/50 text-xs mt-0.5 font-sans">
              {formatDate(quote.created_at)}
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: status.bg }} className="px-3 py-1.5 rounded-full">
          <Text style={{ color: status.color }} className="text-xs font-sans-semibold">
            {status.label}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
      >
        {/* ── Project info ── */}
        <View className="bg-off-white/[0.05] border border-off-white/12 rounded-2xl p-4 mb-5">
          <Text className="text-off-white/50 text-xs font-sans tracking-widest uppercase mb-3">
            Project Details
          </Text>
          <InfoRow label="Address" value={quote.project_address} />
          <InfoRow label="Type" value={quote.project_type} />
          <InfoRow label="Size" value={`${quote.total_sqft} sqft`} />
          <InfoRow label="Rooms" value={quote.rooms.join(", ")} />
        </View>

        {/* ── Line items by category ── */}
        <View className="bg-off-white/[0.05] border border-off-white/12 rounded-2xl p-4 mb-5">
          <Text className="text-off-white/50 text-xs font-sans tracking-widest uppercase mb-4">
            Scope of Work
          </Text>
          {Object.entries(grouped).map(([cat, items]) => (
            <CategorySection key={cat} category={cat} items={items} />
          ))}
        </View>

        {/* ── Totals ── */}
        <View className="bg-off-white/[0.05] border border-off-white/12 rounded-2xl p-4">
          <Text className="text-off-white/50 text-xs font-sans tracking-widest uppercase mb-3">
            Summary
          </Text>
          <View className="flex-row justify-between py-2 border-b border-off-white/10">
            <Text className="text-off-white/50 text-sm font-sans">Subtotal</Text>
            <Text className="text-off-white text-sm font-sans">{formatCurrency(quote.subtotal)}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-off-white/10">
            <Text className="text-off-white/50 text-sm font-sans">GST (9%)</Text>
            <Text className="text-off-white text-sm font-sans">{formatCurrency(quote.gst_amount)}</Text>
          </View>
          <View className="flex-row justify-between pt-3 mt-1">
            <Text className="text-off-white text-base font-sans-bold">Grand Total</Text>
            <Text className="text-terracotta-soft text-base font-sans-bold">
              {formatCurrency(quote.grand_total)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky action bar ── */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pt-4 bg-ink/85 border-t border-off-white/10 gap-2.5" style={{ paddingBottom: insets.bottom + 20 }}>
        {/* Status transition buttons */}
        {(NEXT_STATUS[quote.status] ?? []).map((t) => (
          <TouchableOpacity
            key={t.target}
            onPress={() => {
              Alert.alert(
                t.action,
                `Change status from "${quote.status}" to "${t.target}"?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: t.action, onPress: () => handleStatusChange(t.target) },
                ]
              );
            }}
            disabled={transitioning}
            activeOpacity={0.85}
            style={{ backgroundColor: t.color }}
            className="rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
          >
            {transitioning ? (
              <ActivityIndicator color="#fdfcf8" size="small" />
            ) : (
              <Ionicons name={t.icon} size={18} color="#fdfcf8" />
            )}
            <Text className="text-off-white text-sm font-sans-bold">{t.action}</Text>
          </TouchableOpacity>
        ))}

        {/* Export PDF */}
        <TouchableOpacity
          onPress={handleExportPdf}
          disabled={exporting}
          activeOpacity={0.85}
          className="bg-terracotta rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
        >
          {exporting ? (
            <ActivityIndicator color="#fdfcf8" size="small" />
          ) : (
            <Ionicons name="download-outline" size={18} color="#fdfcf8" />
          )}
          <Text className="text-off-white text-sm font-sans-bold">
            {exporting ? "Preparing PDF…" : "Export PDF"}
          </Text>
        </TouchableOpacity>

        {/* Edit (draft only) */}
        {quote.status === "draft" && (
          <TouchableOpacity
            onPress={handleEdit}
            activeOpacity={0.85}
            className="bg-off-white/[0.05] border border-off-white/12 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
          >
            <Ionicons name="create-outline" size={18} color="#fdfcf8" />
            <Text className="text-off-white text-sm font-sans-bold">Edit Quotation</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
