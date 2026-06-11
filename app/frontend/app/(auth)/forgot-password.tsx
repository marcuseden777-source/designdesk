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
    <View className="flex-1 bg-off-white px-6 pt-16">
      <TouchableOpacity onPress={() => router.back()} className="mb-8">
        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
      </TouchableOpacity>

      <Text className="text-charcoal text-3xl font-serif mb-2">Reset Password</Text>
      <Text className="text-charcoal/50 text-sm font-sans mb-8 leading-relaxed">
        Enter your email and we'll send you a link to reset your password.
      </Text>

      {sent ? (
        <View className="bg-charcoal/5 border border-charcoal/10 rounded-2xl p-6 items-center">
          <Ionicons name="mail-outline" size={36} color="#b85c38" />
          <Text className="text-charcoal font-sans-semibold text-base mt-3">Email sent!</Text>
          <Text className="text-charcoal/50 text-sm font-sans text-center mt-1">
            Check your inbox for the password reset link.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            className="mt-5"
          >
            <Text className="text-terracotta font-sans-semibold">Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text className="text-charcoal/50 text-xs font-sans tracking-wider uppercase mb-1.5">
            Email
          </Text>
          <TextInput
            className="bg-white text-charcoal rounded-xl px-4 py-3.5 text-base border border-charcoal/10 mb-6 font-sans"
            placeholderTextColor="#999"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity
            onPress={handleReset}
            disabled={loading}
            className="bg-terracotta rounded-xl py-4 items-center"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fdfcf8" />
            ) : (
              <Text className="text-off-white font-sans-bold text-base">Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
