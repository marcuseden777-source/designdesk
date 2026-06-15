import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import { supabase } from "@/lib/supabase";
import { BrandLoader } from "@/components/BrandLoader";
import { NavigationLoader } from "@/components/NavigationLoader";
import "../global.css";

SplashScreen.preventAutoHideAsync().catch(() => {});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: "#161310" }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, marginBottom: 8, color: "#fdfcf8" }}>
            Something went wrong
          </Text>
          <Text style={{ fontFamily: "Montserrat_400Regular", fontSize: 14, color: "rgba(253,252,248,0.5)", textAlign: "center", marginBottom: 24 }}>
            The app ran into an unexpected error. Please try again.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            style={{ backgroundColor: "#b85c38", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 }}
          >
            <Text style={{ fontFamily: "Montserrat_600SemiBold", fontSize: 14, color: "#fdfcf8" }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// Redirect unauthenticated users to login, authenticated to app
function AuthGate({ session }: { session: Session | null | undefined }) {
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (session === undefined) return; // still loading

    const inAuthGroup = segments[0] === "(auth)";
    // Web "/" is the public scroll landing — visitors may stay there signed-out.
    const onLanding = pathname === "/" && Platform.OS === "web";

    if (session && (inAuthGroup || onLanding)) {
      router.replace("/(app)/dashboard");
    } else if (!session && !inAuthGroup && !onLanding) {
      router.replace("/(auth)/login");
    }
  }, [session, segments]);

  return null;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    // Restore persisted session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for sign-in / sign-out events
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Hide splash only when fonts are ready (or failed) and auth is resolved
  const fontsReady = fontsLoaded || !!fontError;
  useEffect(() => {
    if (fontsReady && session !== undefined) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady, session]);

  // Branded cold-start: hold the app behind the boot loader until BOTH fonts and
  // the persisted session have resolved, so the first painted screen is the
  // correct one (no flash of landing → dashboard) with fonts already loaded.
  if (!fontsReady || session === undefined) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <BrandLoader variant="boot" caption="Preparing design engine" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <View className="flex-1 bg-ink">
            <AuthGate session={session} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#161310" },
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
            <NavigationLoader />
          </View>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
