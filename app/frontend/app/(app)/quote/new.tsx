import { useState, useEffect } from "react";
import { View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "@/components/Text";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuote } from "@/lib/quoteContext";
import { AppBackdrop } from "@/components/AppBackdrop";

const PROJECT_TYPES = [
  { key: "hdb", label: "HDB Flat", icon: "business-outline" as const },
  { key: "condo", label: "Condominium", icon: "home-outline" as const },
  { key: "landed", label: "Landed (Terrace / Semi-D / Bungalow)", icon: "leaf-outline" as const },
  { key: "commercial", label: "Commercial", icon: "briefcase-outline" as const },
];

const SQFT_OPTIONS = [
  { label: "< 500 sqft", value: 450 },
  { label: "500 – 800 sqft", value: 650 },
  { label: "800 – 1,100 sqft", value: 950 },
  { label: "1,100 – 1,500 sqft", value: 1300 },
  { label: "1,500 – 2,000 sqft", value: 1750 },
  { label: "> 2,000 sqft", value: 2200 },
];

export default function NewQuoteScreen() {
  const router = useRouter();
  const { state, dispatch } = useQuote();
  const params = useLocalSearchParams<{
    session_id?: string;
    rooms?: string;
    project_type?: string;
    sqft?: string;
    edit_id?: string;
    client_name?: string;
    project_address?: string;
  }>();

  const isEditing = !!params.edit_id;

  const [clientName, setClientName] = useState(
    params.client_name ?? state.client_name
  );
  const [address, setAddress] = useState(
    params.project_address ?? state.project_address
  );
  const [projectType, setProjectType] = useState(
    (params.project_type as typeof state.project_type) || state.project_type
  );
  const [sqft, setSqft] = useState<number | null>(
    params.sqft ? parseInt(params.sqft) : state.total_sqft
  );
  const [customSqft, setCustomSqft] = useState(
    params.sqft ? params.sqft : ""
  );

  useEffect(() => {
    if (params.edit_id) {
      dispatch({ type: "SET_EDIT_ID", edit_id: params.edit_id });
    } else if (params.session_id) {
      dispatch({ type: "SET_SESSION_ID", design_session_id: params.session_id });
    }
    if (params.rooms) {
      try {
        dispatch({ type: "SET_ROOMS", rooms: JSON.parse(params.rooms) });
      } catch {}
    }
  }, []);

  const canProceed = clientName.trim() && address.trim() && projectType && sqft;

  function handleNext() {
    if (!canProceed) return;
    dispatch({ type: "SET_CLIENT", client_name: clientName.trim(), project_address: address.trim() });
    dispatch({ type: "SET_PROJECT", project_type: projectType as any, total_sqft: sqft! });
    router.push("/(app)/quote/rooms");
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <AppBackdrop />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Header */}
          <View className="flex-row items-center px-5 pt-4 mb-8 gap-3">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fdfcf8" />
            </TouchableOpacity>
            <View>
              <Text className="text-off-white/50 text-xs tracking-widest uppercase">
                {isEditing ? "Editing" : "Step 1 of 4"}
              </Text>
              <Text className="text-off-white text-xl font-serif">
                {isEditing ? "Edit Quotation" : "Project Details"}
              </Text>
            </View>
          </View>

          <View className="px-5 gap-6">
            {/* Client name */}
            <View>
              <Text className="text-off-white/50 text-xs font-sans tracking-widest uppercase mb-2">Client Name</Text>
              <TextInput
                className="bg-off-white/10 text-off-white rounded-2xl px-4 py-3.5 border border-off-white/15 font-sans"
                placeholder="e.g. Jane Tan"
                placeholderTextColor="rgba(253,252,248,0.35)"
                value={clientName}
                onChangeText={setClientName}
                autoCapitalize="words"
              />
            </View>

            {/* Address */}
            <View>
              <Text className="text-off-white/50 text-xs font-sans tracking-widest uppercase mb-2">Project Address</Text>
              <TextInput
                className="bg-off-white/10 text-off-white rounded-2xl px-4 py-3.5 border border-off-white/15 font-sans"
                placeholder="e.g. 123 Orchard Road, #12-34"
                placeholderTextColor="rgba(253,252,248,0.35)"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Property type */}
            <View>
              <Text className="text-off-white/50 text-xs font-sans tracking-widest uppercase mb-3">Property Type</Text>
              <View className="gap-2">
                {PROJECT_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt.key}
                    onPress={() => setProjectType(pt.key as any)}
                    className={`flex-row items-center gap-3 p-4 rounded-2xl border ${
                      projectType === pt.key
                        ? "border-terracotta/50 bg-terracotta/15"
                        : "border-off-white/12 bg-off-white/[0.05]"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={pt.icon} size={20} color={projectType === pt.key ? "#d98b6a" : "rgba(253,252,248,0.45)"} />
                    <Text className={`flex-1 text-sm font-sans ${projectType === pt.key ? "text-terracotta-soft" : "text-off-white"}`}>
                      {pt.label}
                    </Text>
                    {projectType === pt.key && <Ionicons name="checkmark-circle" size={18} color="#d98b6a" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Floor area */}
            <View>
              <Text className="text-off-white/50 text-xs font-sans tracking-widest uppercase mb-3">Floor Area</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {SQFT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => { setSqft(opt.value); setCustomSqft(""); }}
                    className={`px-4 py-2.5 rounded-full border ${
                      sqft === opt.value && !customSqft
                        ? "border-terracotta/50 bg-terracotta/15"
                        : "border-off-white/12 bg-off-white/[0.05]"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-sm font-sans ${sqft === opt.value && !customSqft ? "text-terracotta-soft" : "text-off-white"}`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                className={`bg-off-white/10 text-off-white rounded-2xl px-4 py-3.5 border font-sans ${customSqft ? "border-terracotta/50" : "border-off-white/15"}`}
                placeholder="Or enter exact sqft"
                placeholderTextColor="rgba(253,252,248,0.35)"
                keyboardType="numeric"
                value={customSqft}
                onChangeText={(v) => { setCustomSqft(v); if (v) setSqft(parseInt(v) || null); else setSqft(null); }}
              />
            </View>
          </View>
        </ScrollView>

        {/* CTA */}
        <View className="px-5 pb-8 pt-4 border-t border-off-white/10">
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canProceed}
            className={`py-4 rounded-full items-center ${canProceed ? "bg-terracotta" : "bg-off-white/10"}`}
            activeOpacity={0.8}
          >
            <Text className={`font-sans-bold text-base ${canProceed ? "text-off-white" : "text-off-white/40"}`}>
              Next: Select Rooms →
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
