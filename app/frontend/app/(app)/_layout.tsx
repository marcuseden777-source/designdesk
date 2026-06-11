import { Stack } from "expo-router";
import { QuoteProvider } from "@/lib/quoteContext";

export default function AppLayout() {
  return (
    <QuoteProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#fdfcf8" },
        }}
      />
    </QuoteProvider>
  );
}
