import { useState } from "react";
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuote, getSubtotal, formatSGD } from "@/lib/quoteContext";
import { api } from "@/lib/api";
import { exportPdf, exportDocx } from "@/lib/pdfExport";
import { AppBackdrop } from "@/components/AppBackdrop";

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const isEditing = !!state.edit_id;

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        client_name: state.client_name,
        project_address: state.project_address,
        project_type: state.project_type as string,
        total_sqft: state.total_sqft!,
        rooms: state.rooms,
        line_items: state.line_items,
      };

      if (isEditing) {
        await api.updateQuotation(state.edit_id!, payload);
        setSavedId(state.edit_id!);
      } else {
        const result = await api.createQuotation({
          ...payload,
          design_session_id: state.design_session_id,
        });
        setSavedId(result.id);
      }
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
      await exportPdf(savedId, state.client_name);
    } catch (err: any) {
      Alert.alert("Export Failed", err.message ?? "Could not export PDF.");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportDocx() {
    if (!savedId) return;
    setExporting(true);
    try {
      await exportDocx(savedId, state.client_name);
    } catch (err: any) {
      Alert.alert("Export Failed", err.message ?? "Could not export Word document.");
    } finally {
      setExporting(false);
    }
  }

  function handleNewQuote() {
    dispatch({ type: "RESET" });
    router.replace("/(app)/dashboard");
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <AppBackdrop />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4 mb-6 gap-3">
          {!savedId && (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fdfcf8" />
            </TouchableOpacity>
          )}
          <View>
            <Text className="text-off-white/50 text-xs tracking-widest uppercase">
              {savedId ? "Saved!" : isEditing ? "Editing" : "Step 4 of 4"}
            </Text>
            <Text className="text-off-white text-xl font-serif">
              {savedId ? "Quotation Ready" : isEditing ? "Review Changes" : "Review & Save"}
            </Text>
          </View>
        </View>

        {/* Success banner */}
        {savedId && (
          <View className="mx-5 mb-6 bg-terracotta/12 border border-terracotta/35 rounded-2xl p-4 flex-row items-center gap-3">
            <Ionicons name="checkmark-circle" size={24} color="#d98b6a" />
            <View className="flex-1">
              <Text className="text-off-white font-sans-semibold">Quotation saved</Text>
              <Text className="text-off-white/55 text-xs mt-0.5">ID: {savedId.slice(0, 8).toUpperCase()}</Text>
            </View>
          </View>
        )}

        {/* Project summary card */}
        <View className="mx-5 mb-4 bg-off-white/[0.06] border border-off-white/12 rounded-2xl p-4">
          <Text className="text-off-white/50 text-xs font-sans tracking-widest uppercase mb-3">Project</Text>
          <View className="gap-1.5">
            {[
              { label: "Client", value: state.client_name },
              { label: "Address", value: state.project_address },
              { label: "Type", value: state.project_type.toUpperCase() },
              { label: "Area", value: `${state.total_sqft} sqft` },
              { label: "Rooms", value: state.rooms.join(", ") },
            ].map(({ label, value }) => (
              <View key={label} className="flex-row gap-2">
                <Text className="text-off-white/45 text-sm w-16 flex-shrink-0">{label}</Text>
                <Text className="text-off-white text-sm flex-1">{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Line items by category */}
        <View className="px-5 mb-4">
          <Text className="text-off-white/50 text-xs font-sans tracking-widest uppercase mb-3">Scope of Work</Text>
          {Object.entries(grouped).map(([cat, items]) => (
            <View key={cat} className="mb-3">
              <Text className="text-terracotta-soft text-xs font-sans-semibold uppercase tracking-wider mb-1.5">{cat}</Text>
              {items.map((item, idx) => (
                <View key={`${item.item_id}-${idx}`} className="flex-row items-start py-2 border-b border-off-white/8">
                  <View className="flex-1">
                    <Text className="text-off-white text-sm">{item.item_name}</Text>
                    <Text className="text-off-white/50 text-xs mt-0.5">
                      {item.room ? `${item.room} · ` : ""}{item.quantity} {item.unit} @ {formatSGD(item.unit_rate)}
                    </Text>
                  </View>
                  <Text className="text-off-white text-sm font-sans-semibold ml-3">{formatSGD(item.total_amount)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Totals */}
        <View className="mx-5 bg-off-white/[0.06] border border-off-white/12 rounded-2xl overflow-hidden">
          <View className="flex-row justify-between px-4 py-3 border-b border-off-white/8">
            <Text className="text-off-white/50">Subtotal</Text>
            <Text className="text-off-white">{formatSGD(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between px-4 py-3 border-b border-off-white/8">
            <Text className="text-off-white/50">GST (9%)</Text>
            <Text className="text-off-white">{formatSGD(gst)}</Text>
          </View>
          <View className="flex-row justify-between px-4 py-4 bg-terracotta/20">
            <Text className="text-off-white font-sans-bold text-base">TOTAL</Text>
            <Text className="text-off-white font-sans-bold text-base">{formatSGD(grandTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky actions */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pt-4 bg-ink/80 border-t border-off-white/10 gap-3" style={{ paddingBottom: insets.bottom + 20 }}>
        {!savedId ? (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-terracotta py-4 rounded-full items-center flex-row justify-center gap-2"
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fdfcf8" />
            ) : (
              <>
                <Ionicons name={isEditing ? "checkmark-outline" : "save-outline"} size={18} color="#fdfcf8" />
                <Text className="text-off-white font-sans-bold text-base">
                  {isEditing ? "Update Quotation" : "Save Quotation"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View className="gap-3">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleExportPDF}
                disabled={exporting}
                className="flex-1 bg-terracotta py-4 rounded-full items-center flex-row justify-center gap-2"
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={18} color="#fdfcf8" />
                <Text className="text-off-white font-sans-bold text-base">PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExportDocx}
                disabled={exporting}
                className="flex-1 bg-off-white/15 border border-off-white/20 py-4 rounded-full items-center flex-row justify-center gap-2"
                activeOpacity={0.8}
              >
                <Ionicons name="document-outline" size={18} color="#fdfcf8" />
                <Text className="text-off-white font-sans-bold text-base">Word</Text>
              </TouchableOpacity>
            </View>
            {exporting && (
              <View className="flex-row items-center justify-center gap-2 py-1">
                <ActivityIndicator size="small" color="#d98b6a" />
                <Text className="text-off-white/50 text-xs font-sans">Preparing your file…</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleNewQuote}
              className="bg-off-white/10 py-3.5 rounded-full items-center border border-off-white/15"
              activeOpacity={0.8}
            >
              <Text className="text-off-white/80 font-sans">Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
