import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { resetPassword } from "@/lib/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#1A1A2E", "#0F3460"]} className="flex-1 px-6 pt-16">
      <TouchableOpacity onPress={() => router.back()} className="mb-8">
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text className="text-white text-3xl font-bold mb-2">Reset Password</Text>
      <Text className="text-brand-muted text-sm mb-8 leading-relaxed">
        Enter your email and we'll send you a link to reset your password.
      </Text>

      {sent ? (
        <View className="bg-brand-mid border border-brand-accent/30 rounded-2xl p-6 items-center">
          <Ionicons name="mail-outline" size={36} color="#C9A96E" />
          <Text className="text-white font-semibold text-base mt-3">Email sent!</Text>
          <Text className="text-brand-muted text-sm text-center mt-1">
            Check your inbox for the password reset link.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            className="mt-5"
          >
            <Text className="text-brand-accent font-semibold">Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text className="text-brand-muted text-xs font-medium mb-1.5 tracking-wider uppercase">
            Email
          </Text>
          <TextInput
            className="bg-brand-mid text-white rounded-xl px-4 py-3.5 text-base border border-white/10 mb-6"
            placeholderTextColor="#8892A4"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity
            onPress={handleReset}
            disabled={loading}
            className="bg-brand-accent rounded-xl py-4 items-center"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#1A1A2E" />
            ) : (
              <Text className="text-brand-dark font-bold text-base">Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}
