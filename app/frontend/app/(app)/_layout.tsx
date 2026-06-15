import { Stack } from "expo-router";
import { QuoteProvider } from "@/lib/quoteContext";

export default function AppLayout() {
  return (
    <QuoteProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          // Ink card background (NOT white) so dark screens don't flash white
          // mid-transition — matches the root layout's anti-flash setting.
          contentStyle: { backgroundColor: "#161310" },
          animation: "fade",
        }}
      />
    </QuoteProvider>
  );
}
