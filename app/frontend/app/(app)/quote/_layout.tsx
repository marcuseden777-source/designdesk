import { Stack } from "expo-router";
import { QuoteProvider } from "@/lib/quoteContext";

export default function QuoteLayout() {
  return (
    <QuoteProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fdfcf8" } }} />
    </QuoteProvider>
  );
}
