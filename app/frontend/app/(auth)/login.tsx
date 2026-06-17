import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, signUp, isAutoConfirmed } from "@/lib/auth";
import { AppBackdrop } from "@/components/AppBackdrop";

// Temporary sign-up lock — set to false to re-open public sign-ups.
const SIGNUP_LOCKED: boolean = true;
const ACCESS_WHATSAPP =
  "https://wa.me/6593222332?text=" +
  encodeURIComponent("Hi! I'd like to request access to DesignDesk.");
const ACCESS_PHONE = "tel:+6593222332";
const ACCESS_EMAIL =
  "mailto:movarasolution@gmail.com?subject=" +
  encodeURIComponent("DesignDesk access request");

// ─── Validation schemas ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = loginSchema.extend({
  fullName: z.string().min(2, "Enter your full name"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

// ─── Reusable input ───────────────────────────────────────────────────────────

function FormInput({
  label,
  error,
  secure,
  ...props
}: {
  label: string;
  error?: string;
  secure?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const [hidden, setHidden] = useState(secure ?? false);

  return (
    <View className="mb-4">
      <Text className="text-off-white/50 text-xs font-sans tracking-wider uppercase mb-1.5">
        {label}
      </Text>
      <View className="relative">
        <TextInput
          className="bg-off-white/10 text-off-white rounded-2xl px-4 py-3.5 text-base border border-off-white/15 font-sans"
          placeholderTextColor="rgba(253,252,248,0.35)"
          secureTextEntry={hidden}
          autoCapitalize="none"
          {...props}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            className="absolute right-4 top-3.5"
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="rgba(253,252,248,0.5)"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-red-500 text-xs mt-1 font-sans">{error}</Text>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  function switchMode(tab: "login" | "signup") {
    setNotice(null);
    setMode(tab);
  }

  async function handleLogin(data: LoginForm) {
    setLoading(true);
    setNotice(null);
    try {
      await signIn(data.email, data.password);
    } catch (err: any) {
      setNotice({ type: "error", text: err.message ?? "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(data: SignUpForm) {
    setLoading(true);
    setNotice(null);
    try {
      const result = await signUp(data.email, data.password, data.fullName);
      if (isAutoConfirmed(result)) {
        // Auto-confirm mode: session is live, AuthGate redirects to the app.
        setNotice({ type: "success", text: "Account created — signing you in…" });
        return;
      }
      // Email-confirmation mode: confirm inline, then drop the user on the
      // Sign In tab with their email prefilled so they can log in after verifying.
      loginForm.setValue("email", data.email);
      signUpForm.reset();
      setMode("login");
      setNotice({
        type: "success",
        text: "Account created! Check your email to confirm, then sign in below.",
      });
    } catch (err: any) {
      setNotice({ type: "error", text: err.message ?? "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-ink">
      <AppBackdrop />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 py-12">
            {/* Logo / wordmark */}
            <View className="items-center mb-10">
              <View className="w-16 h-16 bg-terracotta/15 border border-terracotta/30 rounded-2xl items-center justify-center mb-4">
                <Ionicons name="business-outline" size={32} color="#d98b6a" />
              </View>
              <Text className="text-off-white text-3xl font-serif tracking-tight">
                DesignDesk
              </Text>
              <Text className="text-off-white/50 text-sm font-sans mt-1">
                Interior design, simplified.
              </Text>
            </View>

            {/* Tab switcher */}
            <View className="flex-row bg-off-white/10 rounded-full p-1 mb-8">
              {(["login", "signup"] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => switchMode(tab)}
                  className={`flex-1 py-2.5 rounded-full items-center ${
                    mode === tab ? "bg-terracotta" : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-sans-semibold ${
                      mode === tab ? "text-off-white" : "text-off-white/50"
                    }`}
                  >
                    {tab === "login" ? "Sign In" : "Create Account"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Inline confirmation / error banner (Alert.alert is a no-op on web) */}
            {notice && (
              <View
                style={{
                  backgroundColor:
                    notice.type === "success"
                      ? "rgba(74,222,128,0.12)"
                      : "rgba(248,113,113,0.12)",
                  borderColor:
                    notice.type === "success"
                      ? "rgba(74,222,128,0.35)"
                      : "rgba(248,113,113,0.35)",
                }}
                className="flex-row items-start gap-2.5 rounded-2xl px-4 py-3 mb-6 border"
              >
                <Ionicons
                  name={notice.type === "success" ? "checkmark-circle" : "alert-circle"}
                  size={18}
                  color={notice.type === "success" ? "#4ade80" : "#f87171"}
                  style={{ marginTop: 1 }}
                />
                <Text
                  className="flex-1 text-sm font-sans leading-relaxed"
                  style={{ color: notice.type === "success" ? "#4ade80" : "#f87171" }}
                >
                  {notice.text}
                </Text>
              </View>
            )}

            {/* Sign In form */}
            {mode === "login" && (
              <View>
                <Controller
                  control={loginForm.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormInput
                      label="Email"
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      error={fieldState.error?.message}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <Controller
                  control={loginForm.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormInput
                      label="Password"
                      placeholder="••••••••"
                      secure
                      error={fieldState.error?.message}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />

                <TouchableOpacity
                  onPress={() => router.push("/(auth)/forgot-password")}
                  className="items-end mb-6"
                >
                  <Text className="text-terracotta text-sm font-sans">
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={loginForm.handleSubmit(handleLogin)}
                  disabled={loading}
                  className="bg-terracotta rounded-full py-4 items-center"
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fdfcf8" />
                  ) : (
                    <Text className="text-off-white font-sans-bold text-base">
                      Sign In
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Sign Up — temporarily locked behind request-access (flip SIGNUP_LOCKED to re-open) */}
            {mode === "signup" && (
              SIGNUP_LOCKED ? (
                <View>
                  <View className="items-center mb-6">
                    <View className="w-14 h-14 bg-terracotta/15 border border-terracotta/30 rounded-2xl items-center justify-center mb-4">
                      <Ionicons name="lock-closed-outline" size={26} color="#d98b6a" />
                    </View>
                    <Text className="text-off-white text-xl font-serif mb-2 text-center">
                      Ask for access
                    </Text>
                    <Text className="text-off-white/55 text-sm font-sans text-center leading-relaxed">
                      Sign-ups are invite-only while we're in early access. Request access from our
                      team and we'll get you set up.
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => Linking.openURL(ACCESS_WHATSAPP).catch(() => {})}
                    className="bg-terracotta rounded-full py-4 items-center flex-row justify-center gap-2 mb-3"
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#fdfcf8" />
                    <Text className="text-off-white font-sans-bold text-base">
                      Request access on WhatsApp
                    </Text>
                  </TouchableOpacity>

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => Linking.openURL(ACCESS_PHONE).catch(() => {})}
                      className="flex-1 bg-off-white/10 border border-off-white/15 rounded-full py-3.5 items-center flex-row justify-center gap-2"
                      activeOpacity={0.85}
                    >
                      <Ionicons name="call-outline" size={16} color="#d98b6a" />
                      <Text className="text-off-white font-sans-semibold text-sm">+65 9322 2332</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(ACCESS_EMAIL).catch(() => {})}
                      className="flex-1 bg-off-white/10 border border-off-white/15 rounded-full py-3.5 items-center flex-row justify-center gap-2"
                      activeOpacity={0.85}
                    >
                      <Ionicons name="mail-outline" size={16} color="#d98b6a" />
                      <Text className="text-off-white font-sans-semibold text-sm">Email us</Text>
                    </TouchableOpacity>
                  </View>

                  <Text className="text-off-white/40 text-xs text-center mt-5 font-sans">
                    movarasolution@gmail.com · Already have an account? Switch to Sign In above.
                  </Text>
                </View>
              ) : (
              <View>
                <Controller
                  control={signUpForm.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <FormInput
                      label="Full Name"
                      placeholder="Jane Tan"
                      autoCapitalize="words"
                      error={fieldState.error?.message}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <Controller
                  control={signUpForm.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormInput
                      label="Email"
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      error={fieldState.error?.message}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <Controller
                  control={signUpForm.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormInput
                      label="Password"
                      placeholder="Min. 6 characters"
                      secure
                      error={fieldState.error?.message}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <Controller
                  control={signUpForm.control}
                  name="confirmPassword"
                  render={({ field, fieldState }) => (
                    <FormInput
                      label="Confirm Password"
                      placeholder="••••••••"
                      secure
                      error={fieldState.error?.message}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />

                <TouchableOpacity
                  onPress={signUpForm.handleSubmit(handleSignUp)}
                  disabled={loading}
                  className="bg-terracotta rounded-xl py-4 items-center mt-2"
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fdfcf8" />
                  ) : (
                    <Text className="text-off-white font-sans-bold text-base">
                      Create Account
                    </Text>
                  )}
                </TouchableOpacity>

                <Text className="text-off-white/40 text-xs text-center mt-4 font-sans">
                  By signing up you agree to our{" "}
                  <Text className="text-terracotta">Terms of Service</Text>{" "}
                  and{" "}
                  <Text className="text-terracotta">Privacy Policy</Text>.
                </Text>
              </View>
              )
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
