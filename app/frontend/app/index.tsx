import { Redirect } from "expo-router";

// Root index — AuthGate in _layout.tsx handles the real redirect.
// This prevents "Unmatched Route" while Supabase session loads on web.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
