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
      <Text className="text-charcoal/50 text-xs font-sans tracking-wider uppercase mb-1.5">
        {label}
      </Text>
      <View className="relative">
        <TextInput
          className="bg-white text-charcoal rounded-xl px-4 py-3.5 text-base border border-charcoal/10 font-sans"
          placeholderTextColor="#999"
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
              color="#999"
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
    <View className="flex-1 bg-off-white">
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
              <View className="w-16 h-16 bg-terracotta/10 rounded-2xl items-center justify-center mb-4">
                <Ionicons name="business-outline" size={32} color="#b85c38" />
              </View>
              <Text className="text-charcoal text-3xl font-serif tracking-tight">
                DesignDesk
              </Text>
              <Text className="text-charcoal/50 text-sm font-sans mt-1">
                Interior design, simplified.
              </Text>
            </View>

            {/* Tab switcher */}
            <View className="flex-row bg-charcoal/5 rounded-xl p-1 mb-8">
              {(["login", "signup"] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setMode(tab)}
                  className={`flex-1 py-2.5 rounded-lg items-center ${
                    mode === tab ? "bg-terracotta" : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-sans-semibold ${
                      mode === tab ? "text-off-white" : "text-charcoal/50"
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
                  <Text className="text-terracotta text-sm font-sans">
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={loginForm.handleSubmit(handleLogin)}
                  disabled={loading}
                  className="bg-terracotta rounded-xl py-4 items-center"
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

                <Text className="text-charcoal/40 text-xs text-center mt-4 font-sans">
                  By signing up you agree to our{" "}
                  <Text className="text-terracotta">Terms of Service</Text>{" "}
                  and{" "}
                  <Text className="text-terracotta">Privacy Policy</Text>.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
