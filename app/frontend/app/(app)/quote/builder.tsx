import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  PanResponder,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/Text";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuote, getSubtotal, formatSGD } from "@/lib/quoteContext";
import { api } from "@/lib/api";
import {
  QUOTE_CATEGORIES,
  UNIT_LABEL,
  categoryOf,
  ROOM_SUGGESTIONS,
  roomTypeFromName,
  quantityFor,
  getTemplateById,
  type QuoteItemTemplate,
  type QuoteTier,
} from "@/lib/quoteTemplates";
import { loadTemplates, type LibraryTemplate } from "@/lib/quoteLibrary";
import type { LineItemPayload } from "@/lib/api";
import { AppBackdrop } from "@/components/AppBackdrop";

/* -------------------------------------------------------------------------- */
/*  Measurement control — drag left/right to set sqft / ft-run, or count nos   */
/* -------------------------------------------------------------------------- */

function MeasureControl({
  value,
  onChange,
  unit,
  isCount,
}: {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  isCount: boolean;
  }) {
  const TRACK = 280;
  const step = isCount ? 1 : 5;
  const max = isCount ? 60 : 1500;
  const valueRef = useRef(value);
  valueRef.current = value;

  // Drag: horizontal movement scales the value. Sensitivity tuned per unit.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2,
      onPanResponderMove: (_e, g) => {
        const perPx = isCount ? 0.12 : 2.4; // units per pixel dragged
        const next = Math.max(0, Math.min(max, valueRef.current + g.dx * perPx * 0.18));
        onChange(isCount ? Math.round(next) : Math.round(next));
      },
    })
  ).current;

  const pct = Math.max(0, Math.min(1, value / max));

  return (
    <View>
      <View className="flex-row items-end justify-center gap-2 mb-3">
        <Text className="text-off-white text-5xl font-serif">{value}</Text>
        <Text className="text-off-white/50 text-base mb-2">{unit}</Text>
      </View>

      {/* Drag track */}
      <View
        {...pan.panHandlers}
        className="h-12 rounded-full bg-off-white/8 border border-off-white/12 justify-center overflow-hidden"
        style={{ width: TRACK, alignSelf: "center" }}
      >
        <View
          className="absolute left-0 top-0 bottom-0 bg-terracotta/15"
          style={{ width: `${pct * 100}%` }}
        />
        <View className="flex-row items-center justify-center gap-2">
          <Ionicons name="chevron-back" size={16} color="rgba(253,252,248,0.4)" />
          <Text className="text-off-white/40 text-xs tracking-widest uppercase">Drag to set</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(253,252,248,0.4)" />
        </View>
      </View>

      {/* Fine steppers */}
      <View className="flex-row items-center justify-center gap-3 mt-4">
        {[-step, step].map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => onChange(Math.max(0, Math.min(max, value + d)))}
            className="w-12 h-12 rounded-full border border-off-white/18 items-center justify-center"
          >
            <Ionicons name={d < 0 ? "remove" : "add"} size={22} color="#fdfcf8" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Add-item sheet — tier MCQ + measure/count + AI explanation                 */
/* -------------------------------------------------------------------------- */

function AddItemSheet({
  template,
  onClose,
  onAdd,
}: {
  template: QuoteItemTemplate;
  onClose: () => void;
  onAdd: (tier: QuoteTier, amount: number, notes: string) => void;
}) {
  const cat = categoryOf(template.category);
  const [tier, setTier] = useState<QuoteTier>(template.tiers[0]);
  const [amount, setAmount] = useState(template.defaultAmount ?? (template.inputMode === "count" ? 1 : 100));
  const [notes, setNotes] = useState(template.defaultNotes ?? "");
  const [explaining, setExplaining] = useState(false);
  const isCount = template.inputMode === "count";
  const lineTotal = Math.round(tier.rate * amount * 100) / 100;

  async function generateExplanation() {
    setExplaining(true);
    try {
      const text = await api.explainQuoteItem({
        name: template.name,
        category: cat.label,
        tier: tier.label,
        unit: UNIT_LABEL[template.unit],
        amount,
        rate: tier.rate,
      });
      if (text) setNotes(text);
    } catch {
      // Graceful fallback — a sensible templated sentence.
      setNotes(
        `${tier.label} ${template.name.toLowerCase()} — ${amount} ${UNIT_LABEL[template.unit]} supplied and installed, including materials, labour and finishing.`
      );
    } finally {
      setExplaining(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-ink/60 justify-end">
        <View className="bg-ink border-t border-off-white/10 rounded-t-3xl max-h-[88%]">
          {/* grabber + header */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-off-white/20" />
          </View>
          <View className="flex-row items-center gap-3 px-5 pb-3">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: cat.tint + "22" }}
            >
              <Ionicons name={template.icon} size={26} color={cat.tint} />
            </View>
            <View className="flex-1">
              <Text className="text-off-white text-xl font-serif">{template.name}</Text>
              <Text className="text-off-white/45 text-xs tracking-widest uppercase">{cat.label}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 items-center justify-center">
              <Ionicons name="close" size={24} color="#fdfcf8" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
            {/* Tier MCQ */}
            <Text className="text-off-white/50 text-xs tracking-widest uppercase mb-2 mt-1">Tier</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {template.tiers.map((t) => {
                const active = t.key === tier.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setTier(t)}
                    className={`px-4 py-2.5 rounded-full border ${
                      active ? "bg-terracotta border-terracotta" : "bg-off-white/[0.05] border-off-white/18"
                    }`}
                  >
                    <Text className={active ? "text-off-white font-sans-semibold" : "text-off-white"}>
                      {t.label}
                    </Text>
                    <Text className={`text-xs ${active ? "text-off-white/80" : "text-off-white/40"}`}>
                      {formatSGD(t.rate)}/{UNIT_LABEL[template.unit]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Measurement / count */}
            <Text className="text-off-white/50 text-xs tracking-widest uppercase mb-3 text-center">
              {isCount ? "Quantity" : `Measure (${UNIT_LABEL[template.unit]})`}
            </Text>
            <MeasureControl
              value={amount}
              onChange={setAmount}
              unit={UNIT_LABEL[template.unit]}
              isCount={isCount}
            />

            {/* Product breakdown */}
            {template.breakdown && (
              <View className="mt-7 bg-off-white/[0.05] rounded-2xl p-4">
                <Text className="text-off-white/50 text-xs tracking-widest uppercase mb-2">
                  Product breakdown
                </Text>
                {template.breakdown.map((b) => (
                  <View key={b.label} className="flex-row justify-between py-1">
                    <Text className="text-off-white/70 text-sm">{b.label}</Text>
                    <Text className="text-off-white/50 text-sm">
                      {formatSGD(b.rate)}/{b.unit}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* AI explanation */}
            <View className="mt-7 mb-2 flex-row items-center justify-between">
              <Text className="text-off-white/50 text-xs tracking-widest uppercase">Explanation</Text>
              <TouchableOpacity
                onPress={generateExplanation}
                disabled={explaining}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-terracotta/10 border border-terracotta/30"
              >
                {explaining ? (
                  <ActivityIndicator size="small" color="#d98b6a" />
                ) : (
                  <Ionicons name="sparkles" size={14} color="#d98b6a" />
                )}
                <Text className="text-terracotta text-xs font-sans-semibold">
                  {explaining ? "Generating…" : "Generate with AI"}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="bg-off-white/[0.05] border border-off-white/12 rounded-2xl p-3 min-h-[64px] mb-6">
              <Text className={notes ? "text-off-white/80 text-sm leading-5" : "text-off-white/35 text-sm"}>
                {notes || "Add a client-friendly description for this line item."}
              </Text>
            </View>
          </ScrollView>

          {/* Add bar */}
          <View className="px-5 pt-3 pb-6 border-t border-off-white/12 flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-off-white/45 text-xs">Line total</Text>
              <Text className="text-off-white text-2xl font-serif">{formatSGD(lineTotal)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => onAdd(tier, amount, notes)}
              className="bg-terracotta px-7 py-4 rounded-full flex-row items-center gap-2"
            >
              <Ionicons name="add" size={20} color="#fdfcf8" />
              <Text className="text-off-white text-base font-sans-semibold">Add to quote</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Library card                                                               */
/* -------------------------------------------------------------------------- */

function LibraryCard({
  template,
  onPress,
  onEdit,
}: {
  template: LibraryTemplate;
  onPress: () => void;
  onEdit?: () => void;
}) {
  const cat = categoryOf(template.category);
  const fromRate = Math.min(...template.tiers.map((t) => t.rate));
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={template.isCustom ? onEdit : undefined}
      delayLongPress={250}
      activeOpacity={0.85}
      className="w-[48%] mb-4"
    >
      <View className="rounded-2xl overflow-hidden bg-off-white/[0.05] border border-off-white/12">
        {/* image / icon tile */}
        <View className="h-28 items-center justify-center" style={{ backgroundColor: cat.tint + "1A" }}>
          {template.image ? (
            <Image source={{ uri: template.image }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Ionicons name={template.icon} size={40} color={cat.tint} />
          )}
          {template.isCustom ? (
            <TouchableOpacity
              onPress={onEdit}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-off-white/90 items-center justify-center"
            >
              <Ionicons name="pencil" size={14} color="#d98b6a" />
            </TouchableOpacity>
          ) : (
            <View className="absolute top-2 right-2 w-7 h-7 rounded-full bg-off-white/90 items-center justify-center">
              <Ionicons name="add" size={18} color="#d98b6a" />
            </View>
          )}
        </View>
        <View className="p-3">
          <Text className="text-off-white font-sans-semibold" numberOfLines={1}>
            {template.name}
          </Text>
          <Text className="text-off-white/45 text-xs mt-0.5">
            from {formatSGD(fromRate)}/{UNIT_LABEL[template.unit]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */
/*  Builder screen                                                             */
/* -------------------------------------------------------------------------- */

export default function QuoteBuilderScreen() {
  const router = useRouter();
  const { state, dispatch } = useQuote();
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [active, setActive] = useState<QuoteItemTemplate | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [allTemplates, setAllTemplates] = useState<LibraryTemplate[]>([]);
  // Room scaffolding: the room new items are filed under, plus quick bulk-add.
  const [activeRoom, setActiveRoom] = useState<string | null>(() => state.rooms[0] ?? null);
  const hasRooms = state.rooms.length > 0;
  // Rough per-room area so scaffolded quantities start sensibly.
  const perRoomSqft =
    state.total_sqft && hasRooms ? state.total_sqft / state.rooms.length : null;

  // Reload from the library whenever the screen regains focus, so items created
  // in the template builder appear immediately.
  useFocusEffect(
    useCallback(() => {
      loadTemplates().then(setAllTemplates);
    }, [])
  );

  const templates = useMemo(
    () => (catFilter ? allTemplates.filter((t) => t.category === catFilter) : allTemplates),
    [catFilter, allTemplates]
  );

  const subtotal = getSubtotal(state.line_items);
  const count = state.line_items.length;

  function lineItemFor(
    tpl: QuoteItemTemplate,
    tier: QuoteTier,
    amount: number,
    room: string | null,
    notes?: string,
    seq = 0
  ): LineItemPayload {
    return {
      item_id: Date.now() + seq,
      item_name: `${tpl.name} (${tier.label})`,
      category: categoryOf(tpl.category).label,
      room,
      quantity: amount,
      unit: UNIT_LABEL[tpl.unit],
      unit_rate: tier.rate,
      total_amount: Math.round(tier.rate * amount * 100) / 100,
      selected_tier: tier.label,
      notes: notes || tpl.defaultNotes || undefined,
    };
  }

  function addToQuote(tpl: QuoteItemTemplate, tier: QuoteTier, amount: number, notes: string) {
    dispatch({ type: "ADD_LINE_ITEM", item: lineItemFor(tpl, tier, amount, activeRoom, notes) });
    setActive(null);
    setJustAdded(tpl.name);
    setTimeout(() => setJustAdded(null), 1800);
  }

  // One-tap room scaffold: bulk-add the typical items for the active room's type,
  // sized from its area. Skips items already present in that room.
  function scaffoldRoom(room: string) {
    const suggestions = ROOM_SUGGESTIONS[roomTypeFromName(room)] ?? [];
    const existing = new Set(
      state.line_items.filter((i) => i.room === room).map((i) => i.item_name.split(" (")[0])
    );
    let added = 0;
    suggestions.forEach((s, idx) => {
      const tpl = getTemplateById(s.templateId);
      if (!tpl || existing.has(tpl.name)) return;
      const tier = tpl.tiers[0];
      const qty = quantityFor(s.qty, perRoomSqft);
      dispatch({ type: "ADD_LINE_ITEM", item: lineItemFor(tpl, tier, qty, room, undefined, idx + 1) });
      added += 1;
    });
    setJustAdded(added > 0 ? `${room}: ${added} item${added === 1 ? "" : "s"} scaffolded` : `${room} already scaffolded`);
    setTimeout(() => setJustAdded(null), 2200);
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <AppBackdrop />
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 mb-1 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center -ml-2">
          <Ionicons name="chevron-back" size={24} color="#fdfcf8" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-off-white/50 text-xs tracking-widest uppercase">Build quote</Text>
          <Text className="text-off-white text-xl font-serif">Item Library</Text>
        </View>
      </View>
      <Text className="text-off-white/50 text-sm px-5 mb-4">
        {hasRooms
          ? `Tap an item to add it to ${activeRoom ?? "the quote"}.`
          : "Tap any item to add it — no typing required."}
      </Text>

      {/* Room strip — file items by room + one-tap scaffold (Phase 3) */}
      {hasRooms && (
        <View className="mb-3">
          <View className="flex-row items-center justify-between px-5 mb-2">
            <Text className="text-off-white/50 text-xs tracking-widest uppercase">Room</Text>
            {activeRoom && (
              <TouchableOpacity
                onPress={() => scaffoldRoom(activeRoom)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-terracotta/10 border border-terracotta/30"
              >
                <Ionicons name="construct-outline" size={13} color="#d98b6a" />
                <Text className="text-terracotta text-xs font-sans-semibold">Auto-scaffold {activeRoom}</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {state.rooms.map((r) => {
              const on = activeRoom === r;
              const n = state.line_items.filter((i) => i.room === r).length;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setActiveRoom(r)}
                  className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full border ${
                    on ? "bg-terracotta border-terracotta" : "bg-off-white/[0.05] border-off-white/18"
                  }`}
                >
                  <Text className={on ? "text-off-white text-sm" : "text-off-white text-sm"}>{r}</Text>
                  {n > 0 && (
                    <View className={`px-1.5 rounded-full ${on ? "bg-terracotta/30" : "bg-off-white/10"}`}>
                      <Text className={`text-[10px] ${on ? "text-off-white" : "text-off-white/60"}`}>{n}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Category filter */}
      <View className="mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          <TouchableOpacity
            onPress={() => setCatFilter(null)}
            className={`px-4 py-2 rounded-full border ${
              !catFilter ? "bg-terracotta border-terracotta" : "bg-off-white/[0.05] border-off-white/18"
            }`}
          >
            <Text className={!catFilter ? "text-off-white text-sm" : "text-off-white text-sm"}>All</Text>
          </TouchableOpacity>
          {QUOTE_CATEGORIES.map((c) => {
            const active = catFilter === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setCatFilter(active ? null : c.key)}
                className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full border ${
                  active ? "bg-terracotta border-terracotta" : "bg-off-white/[0.05] border-off-white/18"
                }`}
              >
                <Ionicons name={c.icon} size={14} color={active ? "#fdfcf8" : c.tint} />
                <Text className={active ? "text-off-white text-sm" : "text-off-white text-sm"}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Library grid */}
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap justify-between">
          {templates.map((t) => (
            <LibraryCard
              key={t.id}
              template={t}
              onPress={() => setActive(t)}
              onEdit={() =>
                // typed-routes union regenerates to include /quote/new-item on next Expo run
                router.push({ pathname: "/quote/new-item", params: { id: t.id } } as any)
              }
            />
          ))}
        </View>

        {/* Create a new reusable library item */}
        <TouchableOpacity
          onPress={() => router.push("/quote/new-item" as any)}
          className="mt-1 mb-2 rounded-2xl border border-dashed border-off-white/25 py-5 items-center justify-center"
        >
          <Ionicons name="add-circle-outline" size={26} color="rgba(253,252,248,0.55)" />
          <Text className="text-off-white/50 text-sm mt-1">Create a new library item</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Just-added toast */}
      {justAdded && (
        <View className="absolute left-5 right-5 bottom-28 bg-off-white/15 border border-off-white/20 rounded-full px-4 py-3 flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={18} color="#d98b6a" />
          <Text className="text-off-white text-sm flex-1">{justAdded} added to quote</Text>
        </View>
      )}

      {/* Running quote bar */}
      <View className="absolute left-0 right-0 bottom-0 bg-ink/85 border-t border-off-white/10 px-5 pt-3 pb-7 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-off-white/45 text-xs">
            {count} item{count === 1 ? "" : "s"} · subtotal
          </Text>
          <Text className="text-off-white text-2xl font-serif">{formatSGD(subtotal)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/quote/review")}
          disabled={count === 0}
          className={`px-6 py-3.5 rounded-full flex-row items-center gap-2 ${
            count === 0 ? "bg-off-white/15" : "bg-terracotta"
          }`}
        >
          <Text className="text-off-white text-base font-sans-semibold">Review</Text>
          <Ionicons name="arrow-forward" size={18} color="#fdfcf8" />
        </TouchableOpacity>
      </View>

      {active && (
        <AddItemSheet
          template={active}
          onClose={() => setActive(null)}
          onAdd={(tier, amount, notes) => addToQuote(active, tier, amount, notes)}
        />
      )}
    </SafeAreaView>
  );
}
