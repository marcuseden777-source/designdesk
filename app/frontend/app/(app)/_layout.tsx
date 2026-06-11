import { Stack } from "expo-router";
import { QuoteProvider } from "@/lib/quoteContext";

export default function AppLayout() {
  return (
    <QuoteProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#1A1A2E" },
        }}
      />
    </QuoteProvider>
  );
}
