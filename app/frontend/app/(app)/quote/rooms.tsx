import { useState } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuote } from "@/lib/quoteContext";
import { AppBackdrop } from "@/components/AppBackdrop";

const ALL_ROOMS = [
  { name: "Living Room", icon: "tv-outline" as const },
  { name: "Dining Room", icon: "restaurant-outline" as const },
  { name: "Master Bedroom", icon: "bed-outline" as const },
  { name: "Bedroom 2", icon: "bed-outline" as const },
  { name: "Bedroom 3", icon: "bed-outline" as const },
  { name: "Kitchen", icon: "flame-outline" as const },
  { name: "Master Bathroom", icon: "water-outline" as const },
  { name: "Common Bathroom", icon: "water-outline" as const },
  { name: "Study / Home Office", icon: "desktop-outline" as const },
  { name: "Helper's Room", icon: "person-outline" as const },
  { name: "Utility / Yard", icon: "construct-outline" as const },
  { name: "Balcony", icon: "sunny-outline" as const },
  { name: "Foyer / Entrance", icon: "enter-outline" as const },
  { name: "Store Room", icon: "archive-outline" as const },
];

export default function RoomsScreen() {
  const router = useRouter();
  const { state, dispatch } = useQuote();
  const prePopulated = state.design_session_id
    ? (state.rooms.length ? state.rooms : [])
    : [];
  const [selected, setSelected] = useState<string[]>(
    state.rooms.length ? state.rooms : prePopulated
  );

  function toggle(room: string) {
    setSelected((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  }

  function handleNext() {
    if (!selected.length) return;
    dispatch({ type: "SET_ROOMS", rooms: selected });
    router.push("/(app)/quote/scope");
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <AppBackdrop />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center px-5 pt-4 mb-2 gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fdfcf8" />
          </TouchableOpacity>
          <View>
            <Text className="text-off-white/50 text-xs tracking-widest uppercase">Step 2 of 4</Text>
            <Text className="text-off-white text-xl font-serif">Select Rooms</Text>
          </View>
        </View>

        <Text className="text-off-white/50 text-sm font-sans px-5 mb-6">
          Select all rooms that are part of this project. Tap to toggle.
        </Text>

        {state.design_session_id && state.rooms.length > 0 && (
          <View className="mx-5 mb-4 bg-terracotta/12 border border-terracotta/35 rounded-2xl p-3 flex-row items-center gap-2">
            <Ionicons name="information-circle-outline" size={16} color="#d98b6a" />
            <Text className="text-terracotta-soft text-xs flex-1">Pre-filled from your floor plan</Text>
          </View>
        )}

        <View className="px-5 gap-2">
          {ALL_ROOMS.map((room) => {
            const isOn = selected.includes(room.name);
            return (
              <TouchableOpacity
                key={room.name}
                onPress={() => toggle(room.name)}
                className={`flex-row items-center gap-3 p-4 rounded-2xl border ${
                  isOn ? "border-terracotta/50 bg-terracotta/15" : "border-off-white/12 bg-off-white/[0.05]"
                }`}
                activeOpacity={0.7}
              >
                <View className={`w-9 h-9 rounded-lg items-center justify-center ${isOn ? "bg-terracotta/25" : "bg-off-white/10"}`}>
                  <Ionicons name={room.icon} size={18} color={isOn ? "#d98b6a" : "rgba(253,252,248,0.45)"} />
                </View>
                <Text className={`flex-1 text-sm font-sans ${isOn ? "text-terracotta-soft" : "text-off-white"}`}>
                  {room.name}
                </Text>
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  isOn ? "border-terracotta bg-terracotta" : "border-off-white/25"
                }`}>
                  {isOn && <Ionicons name="checkmark" size={14} color="#fdfcf8" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View className="px-5 pb-8 pt-4 border-t border-off-white/10">
        {selected.length > 0 && (
          <Text className="text-off-white/50 text-xs text-center mb-3">
            {selected.length} room{selected.length !== 1 ? "s" : ""} selected
          </Text>
        )}
        <TouchableOpacity
          onPress={handleNext}
          disabled={!selected.length}
          className={`py-4 rounded-full items-center ${selected.length ? "bg-terracotta" : "bg-off-white/10"}`}
          activeOpacity={0.8}
        >
          <Text className={`font-sans-bold text-base ${selected.length ? "text-off-white" : "text-off-white/40"}`}>
            Next: Add Scope →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
