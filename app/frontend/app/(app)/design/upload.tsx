import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, Image, TextInput, KeyboardAvoidingView, Platform, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { FloorPlanAnalysis, Room } from "@/types";
import { api, GenerateDesignPayload } from "@/lib/api";

// ─── Design Styles ────────────────────────────────────────────────────────────

interface DesignStyle {
  id: string;
  name: string;
  description: string;
  colors: string[];
  materials: string[];
  forbidden_colors?: string[];
}

const DESIGN_STYLES: DesignStyle[] = [
  {
    id: "scandinavian",
    name: "Scandinavian",
    description: "Clean lines, natural light, functional simplicity",
    colors: ["#F5F0E8", "#E8E0D0", "#9B8B6E", "#4A4A4A", "#FFFFFF"],
    materials: ["light oak wood", "linen fabric", "white plaster", "wool rugs"],
    forbidden_colors: ["#FF4500", "#8B0000", "#800080"],
  },
  {
    id: "japandi",
    name: "Japandi",
    description: "Wabi-sabi warmth, Japanese-Scandi restraint",
    colors: ["#F2EDE4", "#C4B49A", "#7A6652", "#2C2C2C", "#E8DDD0"],
    materials: ["bamboo", "raw linen", "washi paper", "dark walnut", "clay plaster"],
    forbidden_colors: ["#00FF00", "#FF1493", "#0000FF"],
  },
  {
    id: "contemporary",
    name: "Contemporary",
    description: "Bold geometry, curated materials, open space",
    colors: ["#FFFFFF", "#E0E0E0", "#1C1C1E", "#B0B0B0", "#4A90D9"],
    materials: ["polished concrete", "glass", "steel", "engineered wood", "marble"],
    forbidden_colors: ["#FF6600", "#FFFF00", "#FF1493"],
  },
  {
    id: "industrial",
    name: "Industrial",
    description: "Raw materials, factory loft aesthetic",
    colors: ["#3D3D3D", "#6B6B6B", "#B8860B", "#C0C0C0", "#2B2B2B"],
    materials: ["exposed brick", "raw concrete", "steel pipes", "reclaimed wood", "leather"],
    forbidden_colors: ["#FFC0CB", "#98FB98", "#87CEEB"],
  },
  {
    id: "tropical",
    name: "Tropical",
    description: "Singapore's natural heritage — greenery and rattan",
    colors: ["#F0EBE0", "#8FBC8F", "#A0522D", "#2E8B57", "#F5DEB3"],
    materials: ["rattan", "teak wood", "tropical plants", "terrazzo", "jute"],
    forbidden_colors: ["#000000", "#1C1C1E", "#FF0000"],
  },
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Monochrome restraint — nothing extraneous",
    colors: ["#FFFFFF", "#F7F7F7", "#E0E0E0", "#909090", "#2D2D2D"],
    materials: ["white render", "polished stone", "glass", "mild steel"],
    forbidden_colors: ["#FF4500", "#FFD700", "#4169E1"],
  },
  {
    id: "classic",
    name: "Classic",
    description: "Timeless elegance, rich woods, warm finishes",
    colors: ["#F5ECD7", "#8B7355", "#4A3728", "#D4AF37", "#FFFAF0"],
    materials: ["dark mahogany", "marble inlay", "brass fixtures", "velvet", "crown moulding"],
    forbidden_colors: ["#00FF00", "#FF00FF", "#00FFFF"],
  },
  {
    id: "art_deco",
    name: "Art Deco",
    description: "Geometric glamour, gold, statement pieces",
    colors: ["#1C1C1C", "#D4AF37", "#F5F0E8", "#2F4F4F", "#8B0000"],
    materials: ["black marble", "gold brass", "velvet", "geometric tiles", "lacquered wood"],
    forbidden_colors: ["#90EE90", "#ADD8E6", "#FFB6C1"],
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  { key: "hdb" as const, label: "HDB" },
  { key: "condo" as const, label: "Condo" },
  { key: "landed" as const, label: "Landed" },
  { key: "commercial" as const, label: "Commercial" },
];

const CONFIDENCE_STYLE = {
  high:   { chip: "bg-green-50 border border-green-200",     text: "text-green-700",  icon: "checkmark-circle"    as const, label: "High confidence" },
  medium: { chip: "bg-yellow-50 border border-yellow-200",   text: "text-yellow-700", icon: "alert-circle"         as const, label: "Medium confidence" },
  low:    { chip: "bg-red-50 border border-red-200",         text: "text-red-700",    icon: "warning"              as const, label: "Low — review carefully" },
};

const IMG_SIZE = Dimensions.get("window").width - 40;

type Step = "upload" | "analyzing" | "confirm" | "style" | "generating" | "result";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DesignUploadScreen() {
  const router = useRouter();

  const [step, setStep]                   = useState<Step>("upload");
  const [imageUri, setImageUri]           = useState<string | null>(null);
  const [sessionId, setSessionId]         = useState<string | null>(null);
  const [analysis, setAnalysis]           = useState<FloorPlanAnalysis | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [projectType, setProjectType]     = useState<"hdb" | "condo" | "landed" | "commercial">("hdb");
  const [totalSqft, setTotalSqft]         = useState("");
  const [selectedStyle, setSelectedStyle] = useState<DesignStyle | null>(null);
  const [designUrl, setDesignUrl]         = useState<string | null>(null);
  const [statusMsg, setStatusMsg]         = useState("");

  function handleBack() {
    if (step === "upload")   { router.back(); return; }
    if (step === "confirm")  { setStep("upload"); return; }
    if (step === "style")    { setStep("confirm"); return; }
    if (step === "result")   { setStep("style"); return; }
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Allow photo library access to upload a floor plan.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Allow camera access to photograph your floor plan.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function handleAnalyze() {
    if (!imageUri) return;
    setStep("analyzing");
    setStatusMsg("Uploading floor plan...");

    const formData = new FormData();
    if (Platform.OS === "web") {
      const res = await fetch(imageUri);
      const blob = await res.blob();
      formData.append("floor_plan", blob, "floor-plan.jpg");
    } else {
      formData.append("floor_plan", {
        uri: imageUri,
        type: "image/jpeg",
        name: "floor-plan.jpg",
      } as any);
    }

    try {
      setStatusMsg("Analysing with Claude Vision...");
      const result = await api.analyzeFloorPlan(formData);
      setSessionId(result.session_id);
      setAnalysis(result.analysis);
      setSelectedRooms(result.analysis.rooms.map((r: Room) => r.name));
      if (result.analysis.total_estimated_sqft) {
        setTotalSqft(result.analysis.total_estimated_sqft.toString());
      }
      setStep("confirm");
    } catch (err: any) {
      Alert.alert("Analysis Failed", err.message ?? "Could not analyse the floor plan.");
      setStep("upload");
    }
  }

  async function handleGenerate() {
    if (!sessionId || !selectedStyle) return;
    setStep("generating");
    setStatusMsg("Building Flux 1 prompt...");

    const payload: GenerateDesignPayload = {
      session_id: sessionId,
      style: selectedStyle,
      selected_rooms: selectedRooms,
      project_type: projectType,
      total_sqft: totalSqft ? parseInt(totalSqft) : null,
    };

    try {
      setTimeout(() => setStatusMsg("Rendering design (15–30s)..."), 3000);
      const result = await api.generateDesign(payload);
      setDesignUrl(result.design_url);
      setStep("result");
    } catch (err: any) {
      Alert.alert("Generation Failed", err.message ?? "Could not generate design.");
      setStep("style");
    }
  }

  function handleStartQuotation() {
    router.push({
      pathname: "/(app)/quote/new",
      params: {
        session_id: sessionId ?? "",
        rooms: JSON.stringify(selectedRooms),
        project_type: projectType,
        sqft: totalSqft,
      },
    });
  }

  // Itemise a quotation from this rendered design using the AI suggestion layer.
  // (pathname cast: typed-routes union regenerates to include /quote/from-design on next Expo run)
  function handleQuoteWithAI() {
    router.push({
      pathname: "/(app)/quote/from-design" as any,
      params: {
        session_id: sessionId ?? "",
        project_type: projectType,
        sqft: totalSqft,
      },
    });
  }

  function toggleRoom(name: string) {
    setSelectedRooms((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  }

  const showBack = step !== "analyzing" && step !== "generating";

  return (
    <SafeAreaView className="flex-1 bg-off-white" edges={["top"]}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View className="flex-row items-center px-5 pt-4 pb-2 gap-3">
        {showBack && (
          <TouchableOpacity onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
        )}
        <View>
          {step === "upload" && (
            <>
              <Text className="text-charcoal/50 text-xs tracking-widest uppercase font-sans">Design Mode</Text>
              <Text className="text-charcoal text-xl font-serif">Upload Floor Plan</Text>
            </>
          )}
          {(step === "analyzing" || step === "generating") && (
            <Text className="text-charcoal text-xl font-serif">
              {step === "analyzing" ? "Analysing..." : "Generating..."}
            </Text>
          )}
          {step === "confirm" && (
            <>
              <Text className="text-charcoal/50 text-xs tracking-widest uppercase font-sans">Step 1 of 2</Text>
              <Text className="text-charcoal text-xl font-serif">Review Analysis</Text>
            </>
          )}
          {step === "style" && (
            <>
              <Text className="text-charcoal/50 text-xs tracking-widest uppercase font-sans">Step 2 of 2</Text>
              <Text className="text-charcoal text-xl font-serif">Choose a Style</Text>
            </>
          )}
          {step === "result" && (
            <>
              <Text className="text-charcoal/50 text-xs tracking-widest uppercase font-sans">Design Ready</Text>
              <Text className="text-charcoal text-xl font-serif">{selectedStyle?.name} Render</Text>
            </>
          )}
        </View>
      </View>

      {/* ═══ UPLOAD ═══ */}
      {step === "upload" && (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <TouchableOpacity onPress={pickFromLibrary} activeOpacity={0.8} className="mx-5 mt-3 mb-4">
              {imageUri ? (
                <View className="rounded-2xl overflow-hidden border-2 border-terracotta">
                  <Image source={{ uri: imageUri }} style={{ width: IMG_SIZE, height: IMG_SIZE }} resizeMode="cover" />
                  <View className="absolute bottom-3 right-3 bg-charcoal/60 rounded-xl px-3 py-1.5 flex-row items-center gap-1.5">
                    <Ionicons name="swap-horizontal" size={14} color="#fdfcf8" />
                    <Text className="text-off-white text-xs font-sans">Change</Text>
                  </View>
                </View>
              ) : (
                <View className="border-2 border-dashed border-charcoal/20 rounded-2xl items-center justify-center py-16 bg-white">
                  <View className="w-16 h-16 rounded-2xl bg-terracotta/10 items-center justify-center mb-4">
                    <Ionicons name="document-outline" size={32} color="#b85c38" />
                  </View>
                  <Text className="text-charcoal font-sans-semibold text-base mb-1">Tap to upload floor plan</Text>
                  <Text className="text-charcoal/50 text-sm font-sans">JPEG · PNG · WebP · Max 20 MB</Text>
                </View>
              )}
            </TouchableOpacity>

            <View className="flex-row px-5 gap-3 mb-6">
              <TouchableOpacity onPress={pickFromLibrary} className="flex-1 flex-row items-center justify-center gap-2 bg-white border border-charcoal/10 rounded-xl py-3.5" activeOpacity={0.7}>
                <Ionicons name="images-outline" size={18} color="#b85c38" />
                <Text className="text-charcoal font-sans text-sm">Photo Library</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takePhoto} className="flex-1 flex-row items-center justify-center gap-2 bg-white border border-charcoal/10 rounded-xl py-3.5" activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={18} color="#b85c38" />
                <Text className="text-charcoal font-sans text-sm">Camera</Text>
              </TouchableOpacity>
            </View>

            <View className="px-5">
              <Text className="text-charcoal/50 text-xs font-sans tracking-widest uppercase mb-3">What Claude Vision detects</Text>
              <View className="flex-row flex-wrap gap-2">
                {["Room count & types", "Estimated sqft", "Wet areas", "Layout type", "Structural features", "Renovation complexity"].map((item) => (
                  <View key={item} className="flex-row items-center gap-1.5 bg-white border border-charcoal/10 rounded-full px-3 py-1.5">
                    <Ionicons name="checkmark-circle" size={12} color="#b85c38" />
                    <Text className="text-charcoal text-xs font-sans">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View className="px-5 pb-8 pt-4 border-t border-charcoal/10">
            <TouchableOpacity
              onPress={handleAnalyze}
              disabled={!imageUri}
              className={`py-4 rounded-xl items-center flex-row justify-center gap-2 ${imageUri ? "bg-terracotta" : "bg-charcoal/10"}`}
              activeOpacity={0.8}
            >
              <Ionicons name="scan-outline" size={18} color={imageUri ? "#fdfcf8" : "#999"} />
              <Text className={`font-sans-bold text-base ${imageUri ? "text-off-white" : "text-charcoal/40"}`}>
                Analyse with Claude Vision →
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ═══ LOADING ═══ */}
      {(step === "analyzing" || step === "generating") && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-2xl bg-terracotta/10 items-center justify-center mb-6">
            <ActivityIndicator size="large" color="#b85c38" />
          </View>
          <Text className="text-charcoal text-base font-sans-semibold text-center mb-2">
            {step === "analyzing" ? "Analysing your floor plan" : "Generating your design"}
          </Text>
          <Text className="text-charcoal/50 text-sm font-sans text-center">{statusMsg}</Text>
          {step === "generating" && (
            <View className="mt-6 bg-white border border-charcoal/10 rounded-xl px-4 py-3">
              <Text className="text-charcoal/50 text-xs font-sans text-center">Flux 1 renders take 15–30 seconds.</Text>
              <Text className="text-charcoal/50 text-xs font-sans text-center mt-0.5">Hang tight</Text>
            </View>
          )}
        </View>
      )}

      {/* ═══ CONFIRM ═══ */}
      {step === "confirm" && analysis && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            <View className={`mx-5 mt-2 mb-4 rounded-xl p-3 flex-row items-center gap-2 ${CONFIDENCE_STYLE[analysis.confidence].chip}`}>
              <Ionicons name={CONFIDENCE_STYLE[analysis.confidence].icon} size={16}
                color={analysis.confidence === "high" ? "#16a34a" : analysis.confidence === "medium" ? "#ca8a04" : "#dc2626"} />
              <Text className={`text-xs flex-1 font-sans ${CONFIDENCE_STYLE[analysis.confidence].text}`}>
                {CONFIDENCE_STYLE[analysis.confidence].label}
                {analysis.layout_type ? ` · ${analysis.layout_type}` : ""}
              </Text>
            </View>

            <View className="px-5 mb-5">
              <Text className="text-charcoal/50 text-xs font-sans tracking-widest uppercase mb-3">
                Detected Rooms — {selectedRooms.length} selected
              </Text>
              <View className="gap-2">
                {analysis.rooms.map((room) => {
                  const isOn = selectedRooms.includes(room.name);
                  return (
                    <TouchableOpacity
                      key={room.name}
                      onPress={() => toggleRoom(room.name)}
                      className={`flex-row items-center gap-3 p-3.5 rounded-xl border ${isOn ? "border-terracotta bg-terracotta/10" : "border-charcoal/10 bg-white"}`}
                      activeOpacity={0.7}
                    >
                      <View className="flex-1">
                        <Text className={`text-sm font-sans ${isOn ? "text-terracotta" : "text-charcoal"}`}>{room.name}</Text>
                        {room.estimated_sqft && (
                          <Text className="text-charcoal/50 text-xs mt-0.5 font-sans">~{room.estimated_sqft} sqft</Text>
                        )}
                      </View>
                      {room.is_wet_area && (
                        <View className="bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                          <Text className="text-blue-600 text-xs font-sans">wet</Text>
                        </View>
                      )}
                      <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isOn ? "border-terracotta bg-terracotta" : "border-charcoal/20"}`}>
                        {isOn && <Ionicons name="checkmark" size={14} color="#fdfcf8" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="px-5 mb-5">
              <Text className="text-charcoal/50 text-xs font-sans tracking-widest uppercase mb-3">Property Type</Text>
              <View className="flex-row gap-2 flex-wrap">
                {PROJECT_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt.key}
                    onPress={() => setProjectType(pt.key)}
                    className={`px-4 py-2.5 rounded-xl border ${projectType === pt.key ? "border-terracotta bg-terracotta/10" : "border-charcoal/10 bg-white"}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-sm font-sans ${projectType === pt.key ? "text-terracotta" : "text-charcoal"}`}>{pt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="px-5 mb-5">
              <Text className="text-charcoal/50 text-xs font-sans tracking-widest uppercase mb-2">Estimated Area (sqft)</Text>
              <TextInput
                className="bg-white text-charcoal rounded-xl px-4 py-3.5 border border-charcoal/10 font-sans"
                placeholder="e.g. 950"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={totalSqft}
                onChangeText={setTotalSqft}
              />
            </View>

            {analysis.structural_features.length > 0 && (
              <View className="px-5 mb-5">
                <Text className="text-charcoal/50 text-xs font-sans tracking-widest uppercase mb-2">Structural Notes</Text>
                <View className="flex-row flex-wrap gap-2">
                  {analysis.structural_features.map((feat) => (
                    <View key={feat} className="bg-white border border-charcoal/10 rounded-full px-3 py-1">
                      <Text className="text-charcoal text-xs font-sans">{feat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {analysis.flags.length > 0 && (
              <View className="mx-5 bg-yellow-50 border border-yellow-200 rounded-xl p-3 gap-1.5">
                {analysis.flags.map((flag) => (
                  <View key={flag} className="flex-row gap-2 items-start">
                    <Ionicons name="alert-circle-outline" size={14} color="#ca8a04" style={{ marginTop: 1 }} />
                    <Text className="text-yellow-700 text-xs flex-1 font-sans">{flag}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-off-white border-t border-charcoal/10">
            <TouchableOpacity
              onPress={() => setStep("style")}
              disabled={selectedRooms.length === 0}
              className={`py-4 rounded-xl items-center flex-row justify-center gap-2 ${selectedRooms.length > 0 ? "bg-terracotta" : "bg-charcoal/10"}`}
              activeOpacity={0.8}
            >
              <Text className={`font-sans-bold text-base ${selectedRooms.length > 0 ? "text-off-white" : "text-charcoal/40"}`}>
                Pick a Style →
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ═══ STYLE PICKER ═══ */}
      {step === "style" && (
        <>
          <Text className="text-charcoal/50 text-sm font-sans px-5 mb-4">
            Select a style for your AI-generated design render.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            <View className="px-5 flex-row flex-wrap gap-3">
              {DESIGN_STYLES.map((style) => {
                const isSelected = selectedStyle?.id === style.id;
                return (
                  <TouchableOpacity
                    key={style.id}
                    onPress={() => setSelectedStyle(style)}
                    style={{ width: (Dimensions.get("window").width - 52) / 2 }}
                    className={`rounded-2xl border p-4 ${isSelected ? "border-terracotta bg-terracotta/10" : "border-charcoal/10 bg-white"}`}
                    activeOpacity={0.75}
                  >
                    {isSelected && (
                      <View className="absolute top-3 right-3 w-5 h-5 rounded-full bg-terracotta items-center justify-center">
                        <Ionicons name="checkmark" size={12} color="#fdfcf8" />
                      </View>
                    )}
                    <View className="flex-row gap-1 mb-3">
                      {style.colors.map((color) => (
                        <View key={color} style={{ backgroundColor: color, width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: "rgba(26,26,26,0.1)" }} />
                      ))}
                    </View>
                    <Text className={`font-sans-bold text-sm mb-0.5 ${isSelected ? "text-terracotta" : "text-charcoal"}`}>
                      {style.name}
                    </Text>
                    <Text className="text-charcoal/50 text-xs font-sans leading-relaxed" numberOfLines={2}>
                      {style.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-off-white border-t border-charcoal/10">
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={!selectedStyle}
              className={`py-4 rounded-xl items-center flex-row justify-center gap-2 ${selectedStyle ? "bg-terracotta" : "bg-charcoal/10"}`}
              activeOpacity={0.8}
            >
              <Ionicons name="color-wand-outline" size={18} color={selectedStyle ? "#fdfcf8" : "#999"} />
              <Text className={`font-sans-bold text-base ${selectedStyle ? "text-off-white" : "text-charcoal/40"}`}>
                Generate Design →
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ═══ RESULT ═══ */}
      {step === "result" && designUrl && (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
            <View className="mx-5 mt-2 mb-4 rounded-2xl overflow-hidden border border-terracotta/40">
              <Image source={{ uri: designUrl }} style={{ width: IMG_SIZE, height: IMG_SIZE }} resizeMode="cover" />
            </View>

            <View className="mx-5 mb-4 flex-row items-center gap-2">
              <View className="flex-row gap-1">
                {selectedStyle?.colors.map((c) => (
                  <View key={c} style={{ backgroundColor: c, width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: "rgba(26,26,26,0.1)" }} />
                ))}
              </View>
              <Text className="text-terracotta font-sans-semibold text-sm ml-1">{selectedStyle?.name}</Text>
              <Text className="text-charcoal/50 text-xs font-sans">· Flux 1</Text>
            </View>

            {analysis && (
              <View className="mx-5 bg-white border border-charcoal/10 rounded-2xl p-4">
                <Text className="text-charcoal/50 text-xs font-sans tracking-widest uppercase mb-3">Floor Plan Summary</Text>
                <View className="gap-1.5">
                  {[
                    { label: "Layout",  value: analysis.layout_type },
                    { label: "Rooms",   value: selectedRooms.join(", ") || "None selected" },
                    { label: "Area",    value: totalSqft ? `${totalSqft} sqft` : "Unknown" },
                    { label: "Type",    value: projectType.toUpperCase() },
                  ].map(({ label, value }) => (
                    <View key={label} className="flex-row gap-2">
                      <Text className="text-charcoal/50 text-xs w-14 flex-shrink-0 font-sans">{label}</Text>
                      <Text className="text-charcoal text-xs flex-1 font-sans">{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-off-white border-t border-charcoal/10 gap-3">
            <TouchableOpacity
              onPress={handleQuoteWithAI}
              className="bg-terracotta py-4 rounded-xl items-center flex-row justify-center gap-2"
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={18} color="#fdfcf8" />
              <Text className="text-off-white font-sans-bold text-base">Quote This Design with AI</Text>
            </TouchableOpacity>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleStartQuotation}
                className="flex-1 bg-white py-3.5 rounded-xl items-center border border-charcoal/10"
                activeOpacity={0.8}
              >
                <Text className="text-charcoal font-sans">Quote Manually</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStep("style")}
                className="flex-1 bg-white py-3.5 rounded-xl items-center border border-charcoal/10"
                activeOpacity={0.8}
              >
                <Text className="text-charcoal font-sans">Different Style</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
