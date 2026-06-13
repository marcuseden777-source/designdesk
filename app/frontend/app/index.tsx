import { Platform } from "react-native";
import { Redirect } from "expo-router";
import ScrollLanding from "@/components/landing/ScrollLanding";

// Root index.
// - Web: the public scroll landing at "/". AuthGate (in _layout) redirects
//   authenticated users to the dashboard and leaves visitors on the landing.
// - Native: app users go straight to login.
export default function Index() {
  if (Platform.OS === "web") return <ScrollLanding />;
  return <Redirect href="/(auth)/login" />;
}
