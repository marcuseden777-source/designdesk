import { useState } from "react";
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useQuote, getSubtotal, formatSGD } from "@/lib/quoteContext";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function ReviewScreen() {
  const router = useRouter();
  const { state, dispatch } = useQuote();
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const subtotal = getSubtotal(state.line_items);
  const gst = Math.round(subtotal * 0.09 * 100) / 100;
  const grandTotal = Math.round((subtotal + gst) * 100) / 100;

  const grouped = state.line_items.reduce<Record<string, typeof state.line_items>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {}
  );

  async function handleSave() {
    setSaving(true);
    try {
      const result = await api.createQuotation({
        client_name: state.client_name,
        project_address: state.project_address,
        project_type: state.project_type as string,
        total_sqft: state.total_sqft!,
        rooms: state.rooms,
        line_items: state.line_items,
        design_session_id: state.design_session_id,
      });
      setSavedId(result.id);
    } catch (err: any) {
      Alert.alert("Save Failed", err.message ?? "Could not save quotation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPDF() {
    if (!savedId) return;
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { Alert.alert("Error", "Not authenticated."); return; }

      const pdfUrl = api.getPdfUrl(savedId);
      const dest = new File(Paths.cache, `quote-${savedId}.pdf`);
      const downloaded = await File.downloadFileAsync(pdfUrl, dest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Quotation PDF",
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      Alert.alert("Export Failed", err.message ?? "Could not export PDF.");
    } finally {
      setExporting(false);
    }
  }

  function handleNewQuote() {
    dispatch({ type: "RESET" });
    router.replace("/(app)/dashboard");
  }

  return (
    <SafeAreaView className="flex-1 bg-off-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4 mb-6 gap-3">
          {!savedId && (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          )}
          <View>
            <Text className="text-charcoal/50 text-xs tracking-widest uppercase">
              {savedId ? "Saved!" : "Step 4 of 4"}
            </Text>
            <Text className="text-charcoal text-xl font-serif">
              {savedId ? "Quotation Ready" : "Review & Save"}
            </Text>
          </View>
        </View>

        {/* Success banner */}
        {savedId && (
          <View className="mx-5 mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center gap-3">
            <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
            <View className="flex-1">
              <Text className="text-green-700 font-sans-semibold">Quotation saved</Text>
              <Text className="text-green-600 text-xs mt-0.5">ID: {savedId.slice(0, 8).toUpperCase()}</Text>
            </View>
          </View>
        )}

        {/* Project summary card */}
        <View className="mx-5 mb-4 bg-white border border-charcoal/10 rounded-2xl p-4">
          <Text className="text-charcoal/50 text-xs font-sans tracking-widest uppercase mb-3">Project</Text>
          <View className="gap-1.5">
            {[
              { label: "Client", value: state.client_name },
              { label: "Address", value: state.project_address },
              { label: "Type", value: state.project_type.toUpperCase() },
              { label: "Area", value: `${state.total_sqft} sqft` },
              { label: "Rooms", value: state.rooms.join(", ") },
            ].map(({ label, value }) => (
              <View key={label} className="flex-row gap-2">
                <Text className="text-charcoal/50 text-sm w-16 flex-shrink-0">{label}</Text>
                <Text className="text-charcoal text-sm flex-1">{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Line items by category */}
        <View className="px-5 mb-4">
          <Text className="text-charcoal/50 text-xs font-sans tracking-widest uppercase mb-3">Scope of Work</Text>
          {Object.entries(grouped).map(([cat, items]) => (
            <View key={cat} className="mb-3">
              <Text className="text-terracotta text-xs font-sans-semibold uppercase tracking-wider mb-1.5">{cat}</Text>
              {items.map((item, idx) => (
                <View key={`${item.item_id}-${idx}`} className="flex-row items-start py-2 border-b border-charcoal/5">
                  <View className="flex-1">
                    <Text className="text-charcoal text-sm">{item.item_name}</Text>
                    <Text className="text-charcoal/50 text-xs mt-0.5">
                      {item.room ? `${item.room} · ` : ""}{item.quantity} {item.unit} @ {formatSGD(item.unit_rate)}
                    </Text>
                  </View>
                  <Text className="text-charcoal text-sm font-sans-semibold ml-3">{formatSGD(item.total_amount)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Totals */}
        <View className="mx-5 bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          <View className="flex-row justify-between px-4 py-3 border-b border-charcoal/5">
            <Text className="text-charcoal/50">Subtotal</Text>
            <Text className="text-charcoal">{formatSGD(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between px-4 py-3 border-b border-charcoal/5">
            <Text className="text-charcoal/50">GST (9%)</Text>
            <Text className="text-charcoal">{formatSGD(gst)}</Text>
          </View>
          <View className="flex-row justify-between px-4 py-4 bg-terracotta/10">
            <Text className="text-terracotta font-sans-bold text-base">TOTAL</Text>
            <Text className="text-terracotta font-sans-bold text-base">{formatSGD(grandTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky actions */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-off-white border-t border-charcoal/10 gap-3">
        {!savedId ? (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-terracotta py-4 rounded-xl items-center flex-row justify-center gap-2"
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fdfcf8" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fdfcf8" />
                <Text className="text-off-white font-sans-bold text-base">Save Quotation</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleExportPDF}
              className="bg-terracotta py-4 rounded-xl items-center flex-row justify-center gap-2"
              activeOpacity={0.8}
            >
              <Ionicons name="document-outline" size={18} color="#fdfcf8" />
              <Text className="text-off-white font-sans-bold text-base">Export PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNewQuote}
              className="bg-white py-3.5 rounded-xl items-center border border-charcoal/10"
              activeOpacity={0.8}
            >
              <Text className="text-charcoal font-sans">Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
