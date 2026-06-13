import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { Text } from "@/components/Text";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuote } from "@/lib/quoteContext";
import { api, type LineItemPayload } from "@/lib/api";
import { loadTemplates } from "@/lib/quoteLibrary";
import { UNIT_LABEL, categoryOf } from "@/lib/quoteTemplates";

/**
 * The "quote the rendered design" layer. Given a generated design session, it
 * asks the AI to itemise a quotation from the floor-plan rooms + chosen style,
 * grounded entirely in the designer's own item library (real rates, never
 * invented). The validated suggestions are resolved to line items, seeded into
 * the quote, then the designer confirms client details and reviews.
 */
export default function FromDesignScreen() {
  const router = useRouter();
  const { dispatch } = useQuote();
  const params = useLocalSearchParams<{
    session_id?: string;
    project_type?: string;
    sqft?: string;
  }>();

  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState("Reading your design…");
  const ran = useRef(false);

  async function run() {
    setError(null);
    setPhase("Reading your design…");
    try {
      const sessionId = params.session_id;
      if (!sessionId) throw new Error("Missing design session.");

      // 1. Build the grounding library from the designer's full template set.
      const templates = await loadTemplates();
      const library = templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        unit: t.unit,
        tiers: t.tiers.map((tier) => ({ key: tier.key, label: tier.label, rate: tier.rate })),
      }));

      setPhase("Pricing each room…");
      const result = await api.suggestQuoteFromDesign({ session_id: sessionId, library });

      // 2. Resolve AI suggestions → concrete line items using the real library.
      const byId = new Map(templates.map((t) => [t.id, t]));
      const items: LineItemPayload[] = [];
      result.suggestions.forEach((s, i) => {
        const tpl = byId.get(s.template_id);
        if (!tpl) return;
        const tier = tpl.tiers.find((t) => t.key === s.tier_key) ?? tpl.tiers[0];
        const qty = Math.max(1, Math.round(s.quantity));
        items.push({
          item_id: Date.now() + i,
          item_name: `${tpl.name} (${tier.label})`,
          category: categoryOf(tpl.category).label,
          room: s.room,
          quantity: qty,
          unit: UNIT_LABEL[tpl.unit],
          unit_rate: tier.rate,
          total_amount: Math.round(tier.rate * qty * 100) / 100,
          selected_tier: tier.label,
          notes: tpl.defaultNotes || undefined,
        });
      });

      if (items.length === 0) throw new Error("No line items could be generated for this design.");

      // 3. Seed the quote (line items + project context from the design).
      dispatch({ type: "SET_SESSION_ID", design_session_id: sessionId });
      dispatch({ type: "SET_ROOMS", rooms: result.rooms });
      dispatch({ type: "SEED_LINE_ITEMS", items });

      const sqft = result.total_sqft ?? (params.sqft ? parseInt(params.sqft, 10) : null);
      const type = (params.project_type as any) || "hdb";
      if (sqft) dispatch({ type: "SET_PROJECT", project_type: type, total_sqft: sqft });

      // 4. Hand off to the client-details step, pre-filled from the design.
      router.replace({
        pathname: "/(app)/quote/new",
        params: {
          session_id: sessionId,
          rooms: JSON.stringify(result.rooms),
          project_type: type,
          sqft: sqft ? String(sqft) : "",
        },
      });
    } catch (err: any) {
      setError(err?.message ?? "Could not generate a quote from this design.");
    }
  }

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    run();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-off-white" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-8">
        {!error ? (
          <>
            <View className="w-16 h-16 rounded-2xl bg-terracotta/10 items-center justify-center mb-6">
              <Ionicons name="sparkles" size={28} color="#b85c38" />
            </View>
            <Text className="text-charcoal text-2xl font-serif mb-2 text-center">
              Costing your design
            </Text>
            <Text className="text-charcoal/50 text-sm text-center mb-8">
              Itemising each room from your floor plan and finishes — using your own price library.
            </Text>
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#b85c38" />
              <Text className="text-charcoal/60 text-sm">{phase}</Text>
            </View>
          </>
        ) : (
          <>
            <View className="w-16 h-16 rounded-2xl bg-charcoal/5 items-center justify-center mb-6">
              <Ionicons name="alert-circle-outline" size={28} color="#1a1a1a99" />
            </View>
            <Text className="text-charcoal text-xl font-serif mb-2 text-center">
              Couldn't auto-quote
            </Text>
            <Text className="text-charcoal/50 text-sm text-center mb-8">{error}</Text>
            <TouchableOpacity
              onPress={() => { ran.current = true; run(); }}
              className="bg-terracotta px-6 py-3.5 rounded-full flex-row items-center gap-2 mb-3"
            >
              <Ionicons name="refresh" size={18} color="#fdfcf8" />
              <Text className="text-off-white font-sans-semibold">Try again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                router.replace({
                  pathname: "/(app)/quote/new",
                  params: { session_id: params.session_id ?? "", project_type: params.project_type ?? "", sqft: params.sqft ?? "" },
                })
              }
              className="px-6 py-3 rounded-full border border-charcoal/15"
            >
              <Text className="text-charcoal font-sans">Build manually instead</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
