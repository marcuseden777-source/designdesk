import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "@/components/Text";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/lib/api";
import {
  QUOTE_CATEGORIES,
  UNIT_LABEL,
  categoryOf,
  type QuoteUnit,
  type QuoteTier,
  type BreakdownPart,
  type QuoteItemTemplate,
} from "@/lib/quoteTemplates";
import {
  saveTemplate,
  deleteTemplate,
  getCustomTemplate,
  makeTemplateId,
  inputModeForUnit,
} from "@/lib/quoteLibrary";

const UNITS: QuoteUnit[] = ["sqft", "ftrun", "nos", "item", "lot"];
const ICON_CHOICES: (keyof typeof Ionicons.glyphMap)[] = [
  "grid-outline", "cube-outline", "bulb-outline", "color-palette-outline",
  "water-outline", "flash-outline", "albums-outline", "bed-outline",
  "tv-outline", "brush-outline", "build-outline", "home-outline",
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-charcoal/50 text-xs tracking-widest uppercase mb-2 mt-6">{children}</Text>
  );
}

export default function NewItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  // typed-routes note: /quote/new-item is regenerated into the route union when
  // Expo next runs; the literals below are cast until that regeneration lands.
  const editing = typeof id === "string" && id.length > 0;

  const [name, setName] = useState("");
  const [category, setCategory] = useState(QUOTE_CATEGORIES[0].key);
  const [unit, setUnit] = useState<QuoteUnit>("sqft");
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>("grid-outline");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [tiers, setTiers] = useState<QuoteTier[]>([{ key: "std", label: "Standard", rate: 0 }]);
  const [breakdown, setBreakdown] = useState<BreakdownPart[]>([]);
  const [notes, setNotes] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("100");
  const [explaining, setExplaining] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prefill when editing an existing custom template.
  useEffect(() => {
    if (!editing) return;
    getCustomTemplate(id as string).then((t) => {
      if (!t) return;
      setName(t.name);
      setCategory(t.category);
      setUnit(t.unit);
      setIcon(t.icon);
      setImage(t.image);
      setTiers(t.tiers.length ? t.tiers : [{ key: "std", label: "Standard", rate: 0 }]);
      setBreakdown(t.breakdown ?? []);
      setNotes(t.defaultNotes ?? "");
      setDefaultAmount(String(t.defaultAmount ?? 100));
    });
  }, [editing, id]);

  const cat = categoryOf(category);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets[0]) setImage(res.assets[0].uri);
  }

  function updateTier(i: number, patch: Partial<QuoteTier>) {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function addTier() {
    setTiers((prev) => [...prev, { key: `t${Date.now()}`, label: "", rate: 0 }]);
  }
  function removeTier(i: number) {
    setTiers((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function updatePart(i: number, patch: Partial<BreakdownPart>) {
    setBreakdown((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addPart() {
    setBreakdown((prev) => [...prev, { label: "", qty: 1, unit: UNIT_LABEL[unit], rate: 0 }]);
  }
  function removePart(i: number) {
    setBreakdown((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function generateNotes() {
    if (!name.trim()) {
      Alert.alert("Name needed", "Enter an item name first.");
      return;
    }
    setExplaining(true);
    try {
      const text = await api.explainQuoteItem({
        name: name.trim(),
        category: cat.label,
        tier: tiers[0]?.label || "Standard",
        unit: UNIT_LABEL[unit],
        amount: Number(defaultAmount) || 0,
        rate: tiers[0]?.rate || 0,
      });
      if (text) setNotes(text);
    } catch {
      setNotes(
        `${name.trim()} supplied and installed, including materials, labour and finishing.`
      );
    } finally {
      setExplaining(false);
    }
  }

  function validate(): string | null {
    if (!name.trim()) return "Give the item a name.";
    if (tiers.some((t) => !t.label.trim())) return "Each tier needs a label.";
    if (tiers.every((t) => !t.rate)) return "Add a rate to at least one tier.";
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      Alert.alert("Almost there", err);
      return;
    }
    setSaving(true);
    const template: QuoteItemTemplate = {
      id: editing ? (id as string) : makeTemplateId(name),
      name: name.trim(),
      category,
      icon,
      image,
      unit,
      inputMode: inputModeForUnit(unit),
      tiers: tiers.map((t, i) => ({ ...t, key: t.key || `t${i}`, rate: Number(t.rate) || 0 })),
      breakdown: breakdown.length
        ? breakdown.filter((p) => p.label.trim()).map((p) => ({ ...p, rate: Number(p.rate) || 0, qty: Number(p.qty) || 1 }))
        : undefined,
      defaultNotes: notes.trim() || undefined,
      defaultAmount: Number(defaultAmount) || (inputModeForUnit(unit) === "count" ? 1 : 100),
    };
    try {
      await saveTemplate(template);
      router.back();
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert("Delete item?", "This removes it from your library.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTemplate(id as string);
          router.back();
        },
      },
    ]);
  }

  const inputCls = "bg-off-white border border-charcoal/15 rounded-xl px-3 py-2.5 text-charcoal";

  return (
    <SafeAreaView className="flex-1 bg-off-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 mb-1 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center -ml-2">
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-charcoal/50 text-xs tracking-widest uppercase">Library item</Text>
          <Text className="text-charcoal text-xl font-serif">{editing ? "Edit Item" : "New Item"}</Text>
        </View>
        {editing && (
          <TouchableOpacity onPress={handleDelete} className="w-9 h-9 items-center justify-center">
            <Ionicons name="trash-outline" size={20} color="#b85c38" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Image + name */}
          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              onPress={pickImage}
              className="w-24 h-24 rounded-2xl overflow-hidden items-center justify-center"
              style={{ backgroundColor: cat.tint + "1A" }}
            >
              {image ? (
                <Image source={{ uri: image }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name={icon} size={30} color={cat.tint} />
                  <Text className="text-charcoal/40 text-[10px] mt-1">Add photo</Text>
                </>
              )}
            </TouchableOpacity>
            <View className="flex-1 justify-center">
              <Text className="text-charcoal/50 text-xs tracking-widest uppercase mb-1.5">Item name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Quartz Countertop"
                placeholderTextColor="#1a1a1a55"
                className={inputCls}
              />
            </View>
          </View>

          {/* Category MCQ */}
          <SectionLabel>Category</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {QUOTE_CATEGORIES.map((c) => {
              const active = c.key === category;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => {
                    setCategory(c.key);
                    setIcon(c.icon);
                  }}
                  className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border ${
                    active ? "bg-charcoal border-charcoal" : "bg-off-white border-charcoal/15"
                  }`}
                >
                  <Ionicons name={c.icon} size={14} color={active ? "#fdfcf8" : c.tint} />
                  <Text className={active ? "text-off-white text-sm" : "text-charcoal text-sm"}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Unit MCQ */}
          <SectionLabel>Measured in</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {UNITS.map((u) => {
              const active = u === unit;
              return (
                <TouchableOpacity
                  key={u}
                  onPress={() => setUnit(u)}
                  className={`px-4 py-2 rounded-full border ${
                    active ? "bg-terracotta border-terracotta" : "bg-off-white border-charcoal/15"
                  }`}
                >
                  <Text className={active ? "text-off-white text-sm font-sans-semibold" : "text-charcoal text-sm"}>
                    {UNIT_LABEL[u]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text className="text-charcoal/40 text-xs mt-2">
            {inputModeForUnit(unit) === "measure" ? "Drag-to-measure when quoting." : "Counted by quantity when quoting."}
          </Text>

          {/* Icon picker */}
          <SectionLabel>Icon</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {ICON_CHOICES.map((ic) => {
              const active = ic === icon;
              return (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setIcon(ic)}
                  className={`w-11 h-11 rounded-xl items-center justify-center border ${
                    active ? "border-terracotta bg-terracotta/10" : "border-charcoal/12 bg-off-white"
                  }`}
                >
                  <Ionicons name={ic} size={20} color={active ? "#b85c38" : "#1a1a1a99"} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tiers */}
          <View className="flex-row items-center justify-between mt-6 mb-2">
            <Text className="text-charcoal/50 text-xs tracking-widest uppercase">Tiers & rates</Text>
            <TouchableOpacity onPress={addTier} className="flex-row items-center gap-1">
              <Ionicons name="add-circle-outline" size={18} color="#b85c38" />
              <Text className="text-terracotta text-xs font-sans-semibold">Add tier</Text>
            </TouchableOpacity>
          </View>
          {tiers.map((t, i) => (
            <View key={i} className="flex-row items-center gap-2 mb-2">
              <TextInput
                value={t.label}
                onChangeText={(v) => updateTier(i, { label: v })}
                placeholder="Tier (e.g. Premium)"
                placeholderTextColor="#1a1a1a55"
                className={`${inputCls} flex-1`}
              />
              <View className="flex-row items-center bg-off-white border border-charcoal/15 rounded-xl px-3">
                <Text className="text-charcoal/40 text-sm">S$</Text>
                <TextInput
                  value={t.rate ? String(t.rate) : ""}
                  onChangeText={(v) => updateTier(i, { rate: Number(v.replace(/[^0-9.]/g, "")) || 0 })}
                  placeholder="0"
                  placeholderTextColor="#1a1a1a55"
                  keyboardType="decimal-pad"
                  className="text-charcoal py-2.5 w-16 text-right"
                />
                <Text className="text-charcoal/40 text-xs">/{UNIT_LABEL[unit]}</Text>
              </View>
              <TouchableOpacity onPress={() => removeTier(i)} className="w-8 h-8 items-center justify-center">
                <Ionicons name="close-circle" size={20} color={tiers.length > 1 ? "#1a1a1a55" : "#1a1a1a22"} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Breakdown (Composite) */}
          <View className="flex-row items-center justify-between mt-6 mb-2">
            <Text className="text-charcoal/50 text-xs tracking-widest uppercase">Product breakdown</Text>
            <TouchableOpacity onPress={addPart} className="flex-row items-center gap-1">
              <Ionicons name="add-circle-outline" size={18} color="#b85c38" />
              <Text className="text-terracotta text-xs font-sans-semibold">Add part</Text>
            </TouchableOpacity>
          </View>
          {breakdown.length === 0 && (
            <Text className="text-charcoal/35 text-sm mb-1">Optional — itemise sub-products (carcass, hardware, labour…).</Text>
          )}
          {breakdown.map((p, i) => (
            <View key={i} className="flex-row items-center gap-2 mb-2">
              <TextInput
                value={p.label}
                onChangeText={(v) => updatePart(i, { label: v })}
                placeholder="Part (e.g. Soft-close hinge)"
                placeholderTextColor="#1a1a1a55"
                className={`${inputCls} flex-1`}
              />
              <View className="flex-row items-center bg-off-white border border-charcoal/15 rounded-xl px-3">
                <Text className="text-charcoal/40 text-sm">S$</Text>
                <TextInput
                  value={p.rate ? String(p.rate) : ""}
                  onChangeText={(v) => updatePart(i, { rate: Number(v.replace(/[^0-9.]/g, "")) || 0 })}
                  placeholder="0"
                  placeholderTextColor="#1a1a1a55"
                  keyboardType="decimal-pad"
                  className="text-charcoal py-2.5 w-14 text-right"
                />
              </View>
              <TouchableOpacity onPress={() => removePart(i)} className="w-8 h-8 items-center justify-center">
                <Ionicons name="close-circle" size={20} color="#1a1a1a55" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Default amount + notes */}
          <SectionLabel>Default quantity</SectionLabel>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={defaultAmount}
              onChangeText={(v) => setDefaultAmount(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              className={`${inputCls} w-28 text-center`}
            />
            <Text className="text-charcoal/50 text-sm">{UNIT_LABEL[unit]} (pre-filled when quoting)</Text>
          </View>

          <View className="flex-row items-center justify-between mt-6 mb-2">
            <Text className="text-charcoal/50 text-xs tracking-widest uppercase">Default description</Text>
            <TouchableOpacity
              onPress={generateNotes}
              disabled={explaining}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-terracotta/10 border border-terracotta/30"
            >
              {explaining ? (
                <ActivityIndicator size="small" color="#b85c38" />
              ) : (
                <Ionicons name="sparkles" size={14} color="#b85c38" />
              )}
              <Text className="text-terracotta text-xs font-sans-semibold">
                {explaining ? "Generating…" : "Generate with AI"}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Client-friendly description used on the quote."
            placeholderTextColor="#1a1a1a55"
            multiline
            className={`${inputCls} min-h-[80px]`}
            style={{ textAlignVertical: "top" }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save bar */}
      <View className="absolute left-0 right-0 bottom-0 bg-off-white border-t border-charcoal/10 px-5 pt-3 pb-7">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-terracotta py-4 rounded-full flex-row items-center justify-center gap-2"
        >
          {saving ? (
            <ActivityIndicator color="#fdfcf8" />
          ) : (
            <Ionicons name="checkmark" size={20} color="#fdfcf8" />
          )}
          <Text className="text-off-white text-base font-sans-semibold">
            {editing ? "Save changes" : "Add to library"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
