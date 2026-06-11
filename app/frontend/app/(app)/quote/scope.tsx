import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuote, formatSGD } from "@/lib/quoteContext";
import { CatalogItem, LineItemPayload } from "@/lib/api";

// Which categories are shown for which project types
const RESIDENTIAL_CATS = [
  "Demolition", "Masonry", "Tiling", "Flooring", "Carpentry",
  "Painting", "Ceiling", "Partition", "Glassworks", "Electrical",
  "Lighting", "Plumbing / Sanitary", "Air-conditioning",
  "Doors / Hardware", "Metal Works", "Furnishing",
];

export default function ScopeScreen() {
  const router = useRouter();
  const { state, dispatch } = useQuote();
  const [activeRoom, setActiveRoom] = useState(state.rooms[0] ?? "");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const catalog = state.catalog.filter((c) =>
    state.project_type === "commercial"
      ? true
      : RESIDENTIAL_CATS.includes(c.name)
  );

  function isSelected(itemId: number, room: string) {
    return state.line_items.some((i) => i.item_id === itemId && i.room === room);
  }

  function toggleItem(item: CatalogItem, categoryName: string, room: string) {
    if (isSelected(item.id, room)) {
      dispatch({ type: "REMOVE_LINE_ITEM", item_id: item.id, room });
    } else {
      const tier = item.price_tiers[0];
      if (!tier) return;
      const payload: LineItemPayload = {
        item_id: item.id,
        item_name: item.name,
        category: categoryName,
        room,
        quantity: 1,
        unit: item.unit,
        unit_rate: tier.low_rate,
        total_amount: tier.low_rate,
        selected_tier: tier.tier_name,
      };
      dispatch({ type: "ADD_LINE_ITEM", item: payload });
    }
  }

  function updateQuantity(itemId: number, room: string, qty: string) {
    const q = parseFloat(qty);
    if (!isNaN(q) && q > 0) {
      dispatch({ type: "UPDATE_QUANTITY", item_id: itemId, room, quantity: q });
    }
  }

  const roomTotal = state.line_items
    .filter((i) => i.room === activeRoom)
    .reduce((s, i) => s + i.total_amount, 0);

  const grandTotal = state.line_items.reduce((s, i) => s + i.total_amount, 0);
  const canProceed = state.line_items.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 mb-3">
        <View className="flex-row items-center gap-3 mb-1">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-brand-muted text-xs tracking-widest uppercase">Step 3 of 4</Text>
            <Text className="text-white text-xl font-bold">Scope of Work</Text>
          </View>
          <View className="items-end">
            <Text className="text-brand-muted text-xs">Total</Text>
            <Text className="text-brand-accent font-bold text-base">{formatSGD(grandTotal)}</Text>
          </View>
        </View>
      </View>

      {/* Room tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-3 flex-grow-0">
        <View className="flex-row gap-2 pb-1">
          {state.rooms.map((room) => {
            const hasItems = state.line_items.some((i) => i.room === room);
            return (
              <TouchableOpacity
                key={room}
                onPress={() => setActiveRoom(room)}
                className={`px-4 py-2 rounded-xl border flex-row items-center gap-1.5 ${
                  activeRoom === room
                    ? "border-brand-accent bg-brand-accent/15"
                    : "border-white/10 bg-brand-mid"
                }`}
              >
                <Text className={`text-sm font-medium ${activeRoom === room ? "text-brand-accent" : "text-white"}`}>
                  {room.split(" ")[0]}
                </Text>
                {hasItems && <View className="w-1.5 h-1.5 rounded-full bg-brand-accent" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Active room total */}
      {roomTotal > 0 && (
        <View className="mx-5 mb-3 bg-brand-mid border border-white/10 rounded-xl px-4 py-2.5 flex-row items-center justify-between">
          <Text className="text-brand-muted text-sm">{activeRoom} subtotal</Text>
          <Text className="text-white font-semibold">{formatSGD(roomTotal)}</Text>
        </View>
      )}

      {/* Catalog */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
        {state.catalogLoading && (
          <Text className="text-brand-muted text-sm text-center py-8">Loading catalog…</Text>
        )}
        {catalog.map((cat) => {
          const isOpen = expandedCat === cat.name;
          const selectedInCat = cat.items.filter((i) => isSelected(i.id, activeRoom)).length;
          return (
            <View key={cat.name} className="mb-2">
              <TouchableOpacity
                onPress={() => setExpandedCat(isOpen ? null : cat.name)}
                className={`flex-row items-center p-4 rounded-xl border ${
                  isOpen ? "border-brand-accent/40 bg-brand-accent/5" : "border-white/10 bg-brand-mid"
                }`}
              >
                <Text className="text-white font-semibold flex-1">{cat.name}</Text>
                {selectedInCat > 0 && (
                  <View className="bg-brand-accent/20 px-2 py-0.5 rounded-full mr-2">
                    <Text className="text-brand-accent text-xs font-medium">{selectedInCat}</Text>
                  </View>
                )}
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#8892A4" />
              </TouchableOpacity>

              {isOpen && (
                <View className="mt-1 gap-1 pl-2">
                  {cat.items.map((item) => {
                    const sel = isSelected(item.id, activeRoom);
                    const lineItem = state.line_items.find((i) => i.item_id === item.id && i.room === activeRoom);
                    const tier = item.price_tiers[0];
                    return (
                      <View
                        key={item.id}
                        className={`rounded-xl border p-3 ${sel ? "border-brand-accent/30 bg-brand-accent/5" : "border-white/5 bg-brand-mid/50"}`}
                      >
                        <TouchableOpacity
                          onPress={() => toggleItem(item, cat.name, activeRoom)}
                          className="flex-row items-start gap-3"
                          activeOpacity={0.7}
                        >
                          <View className={`w-5 h-5 rounded border-2 items-center justify-center mt-0.5 flex-shrink-0 ${
                            sel ? "border-brand-accent bg-brand-accent" : "border-white/30"
                          }`}>
                            {sel && <Ionicons name="checkmark" size={12} color="#1A1A2E" />}
                          </View>
                          <View className="flex-1">
                            <Text className={`text-sm font-medium ${sel ? "text-brand-accent" : "text-white"}`}>
                              {item.name}
                            </Text>
                            {item.description && (
                              <Text className="text-brand-muted text-xs mt-0.5">{item.description}</Text>
                            )}
                            {tier && (
                              <Text className="text-brand-muted text-xs mt-1">
                                From {formatSGD(tier.low_rate)} / {item.unit}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>

                        {sel && lineItem && (
                          <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-white/10">
                            <Text className="text-brand-muted text-xs">Qty ({item.unit}):</Text>
                            <TextInput
                              className="bg-brand-dark text-white text-sm px-3 py-1.5 rounded-lg border border-white/10 w-20"
                              keyboardType="numeric"
                              defaultValue={String(lineItem.quantity)}
                              onEndEditing={(e) => updateQuantity(item.id, activeRoom, e.nativeEvent.text)}
                              placeholderTextColor="#8892A4"
                            />
                            <Text className="text-brand-accent text-sm font-medium ml-auto">
                              {formatSGD(lineItem.total_amount)}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky CTA */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-brand-dark border-t border-white/10">
        <TouchableOpacity
          onPress={() => { if (canProceed) router.push("/(app)/quote/review"); }}
          disabled={!canProceed}
          className={`py-4 rounded-xl items-center ${canProceed ? "bg-brand-accent" : "bg-brand-mid"}`}
          activeOpacity={0.8}
        >
          <Text className={`font-bold text-base ${canProceed ? "text-brand-dark" : "text-brand-muted"}`}>
            {canProceed ? `Review Quote (${formatSGD(grandTotal)}) →` : "Select at least one item"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
