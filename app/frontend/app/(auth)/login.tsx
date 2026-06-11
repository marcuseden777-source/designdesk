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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, signUp, isAutoConfirmed } from "@/lib/auth";

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
      <Text className="text-brand-muted text-xs font-medium mb-1.5 tracking-wider uppercase">
        {label}
      </Text>
      <View className="relative">
        <TextInput
          className="bg-brand-mid text-white rounded-xl px-4 py-3.5 text-base border border-white/10"
          placeholderTextColor="#8892A4"
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
              color="#8892A4"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  async function handleLogin(data: LoginForm) {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      // AuthGate in _layout.tsx handles redirect automatically
    } catch (err: any) {
      Alert.alert("Sign In Failed", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(data: SignUpForm) {
    setLoading(true);
    try {
      const result = await signUp(data.email, data.password, data.fullName);
      if (isAutoConfirmed(result)) {
        // Email confirmation disabled — session is live, AuthGate redirects automatically
        return;
      }
      Alert.alert(
        "Check your email",
        "We sent a confirmation link. Verify your email to continue.",
        [{ text: "OK", onPress: () => setMode("login") }]
      );
    } catch (err: any) {
      Alert.alert("Sign Up Failed", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#1A1A2E", "#0F3460"]} className="flex-1">
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
              <View className="w-16 h-16 bg-brand-accent/20 rounded-2xl items-center justify-center mb-4">
                <Ionicons name="business-outline" size={32} color="#C9A96E" />
              </View>
              <Text className="text-white text-3xl font-bold tracking-tight">
                DesignDesk
              </Text>
              <Text className="text-brand-muted text-sm mt-1">
                Interior design, simplified.
              </Text>
            </View>

            {/* Tab switcher */}
            <View className="flex-row bg-brand-mid rounded-xl p-1 mb-8">
              {(["login", "signup"] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setMode(tab)}
                  className={`flex-1 py-2.5 rounded-lg items-center ${
                    mode === tab ? "bg-brand-accent" : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      mode === tab ? "text-brand-dark" : "text-brand-muted"
                    }`}
                  >
                    {tab === "login" ? "Sign In" : "Create Account"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
                  <Text className="text-brand-accent text-sm">
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={loginForm.handleSubmit(handleLogin)}
                  disabled={loading}
                  className="bg-brand-accent rounded-xl py-4 items-center"
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#1A1A2E" />
                  ) : (
                    <Text className="text-brand-dark font-bold text-base">
                      Sign In
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Sign Up form */}
            {mode === "signup" && (
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
                  className="bg-brand-accent rounded-xl py-4 items-center mt-2"
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#1A1A2E" />
                  ) : (
                    <Text className="text-brand-dark font-bold text-base">
                      Create Account
                    </Text>
                  )}
                </TouchableOpacity>

                <Text className="text-brand-muted text-xs text-center mt-4">
                  By signing up you agree to our{" "}
                  <Text className="text-brand-accent">Terms of Service</Text>{" "}
                  and{" "}
                  <Text className="text-brand-accent">Privacy Policy</Text>.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
