import { useState } from "react";
import { View, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuote, formatSGD } from "@/lib/quoteContext";
import { CatalogItem, LineItemPayload } from "@/lib/api";
import { AppBackdrop } from "@/components/AppBackdrop";

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
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <AppBackdrop />
      {/* Header */}
      <View className="px-5 pt-4 mb-3">
        <View className="flex-row items-center gap-3 mb-1">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fdfcf8" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-off-white/50 text-xs tracking-widest uppercase">Step 3 of 4</Text>
            <Text className="text-off-white text-xl font-serif">Scope of Work</Text>
          </View>
          <View className="items-end">
            <Text className="text-off-white/50 text-xs">Total</Text>
            <Text className="text-terracotta-soft font-sans-bold text-base">{formatSGD(grandTotal)}</Text>
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
                className={`px-4 py-2 rounded-full border flex-row items-center gap-1.5 ${
                  activeRoom === room
                    ? "border-terracotta/50 bg-terracotta/15"
                    : "border-off-white/12 bg-off-white/[0.05]"
                }`}
              >
                <Text className={`text-sm font-sans ${activeRoom === room ? "text-terracotta-soft" : "text-off-white"}`}>
                  {room.split(" ")[0]}
                </Text>
                {hasItems && <View className="w-1.5 h-1.5 rounded-full bg-terracotta-soft" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Active room total */}
      {roomTotal > 0 && (
        <View className="mx-5 mb-3 bg-off-white/[0.06] border border-off-white/12 rounded-2xl px-4 py-2.5 flex-row items-center justify-between">
          <Text className="text-off-white/50 text-sm">{activeRoom} subtotal</Text>
          <Text className="text-off-white font-sans-semibold">{formatSGD(roomTotal)}</Text>
        </View>
      )}

      {/* Catalog */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
        {state.catalogLoading && (
          <Text className="text-off-white/50 text-sm text-center py-8">Loading catalog…</Text>
        )}
        {catalog.map((cat) => {
          const isOpen = expandedCat === cat.name;
          const selectedInCat = cat.items.filter((i) => isSelected(i.id, activeRoom)).length;
          return (
            <View key={cat.name} className="mb-2">
              <TouchableOpacity
                onPress={() => setExpandedCat(isOpen ? null : cat.name)}
                className={`flex-row items-center p-4 rounded-2xl border ${
                  isOpen ? "border-terracotta/40 bg-terracotta/12" : "border-off-white/12 bg-off-white/[0.05]"
                }`}
              >
                <Text className="text-off-white font-sans-semibold flex-1">{cat.name}</Text>
                {selectedInCat > 0 && (
                  <View className="bg-terracotta/25 px-2 py-0.5 rounded-full mr-2">
                    <Text className="text-terracotta-soft text-xs font-sans">{selectedInCat}</Text>
                  </View>
                )}
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="rgba(253,252,248,0.45)" />
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
                        className={`rounded-2xl border p-3 ${sel ? "border-terracotta/40 bg-terracotta/12" : "border-off-white/10 bg-off-white/[0.04]"}`}
                      >
                        <TouchableOpacity
                          onPress={() => toggleItem(item, cat.name, activeRoom)}
                          className="flex-row items-start gap-3"
                          activeOpacity={0.7}
                        >
                          <View className={`w-5 h-5 rounded border-2 items-center justify-center mt-0.5 flex-shrink-0 ${
                            sel ? "border-terracotta bg-terracotta" : "border-off-white/25"
                          }`}>
                            {sel && <Ionicons name="checkmark" size={12} color="#fdfcf8" />}
                          </View>
                          <View className="flex-1">
                            <Text className={`text-sm font-sans ${sel ? "text-terracotta-soft" : "text-off-white"}`}>
                              {item.name}
                            </Text>
                            {item.description && (
                              <Text className="text-off-white/50 text-xs mt-0.5">{item.description}</Text>
                            )}
                            {tier && (
                              <Text className="text-off-white/50 text-xs mt-1">
                                From {formatSGD(tier.low_rate)} / {item.unit}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>

                        {sel && lineItem && (
                          <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-off-white/10">
                            <Text className="text-off-white/50 text-xs">Qty ({item.unit}):</Text>
                            <TextInput
                              className="bg-off-white/10 text-off-white text-sm px-3 py-1.5 rounded-lg border border-off-white/15 w-20 font-sans"
                              keyboardType="numeric"
                              defaultValue={String(lineItem.quantity)}
                              onEndEditing={(e) => updateQuantity(item.id, activeRoom, e.nativeEvent.text)}
                              placeholderTextColor="rgba(253,252,248,0.35)"
                            />
                            <Text className="text-terracotta-soft text-sm font-sans-semibold ml-auto">
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
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-ink/80 border-t border-off-white/10">
        <TouchableOpacity
          onPress={() => { if (canProceed) router.push("/(app)/quote/review"); }}
          disabled={!canProceed}
          className={`py-4 rounded-full items-center ${canProceed ? "bg-terracotta" : "bg-off-white/10"}`}
          activeOpacity={0.8}
        >
          <Text className={`font-sans-bold text-base ${canProceed ? "text-off-white" : "text-off-white/40"}`}>
            {canProceed ? `Review Quote (${formatSGD(grandTotal)}) →` : "Select at least one item"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
