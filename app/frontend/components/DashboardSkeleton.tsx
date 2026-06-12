import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function Bone({ className }: { className?: string }) {
  return <View className={`bg-charcoal/10 rounded-lg animate-pulse ${className ?? ""}`} />;
}

export function DashboardSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-off-white" edges={["top"]}>
      {/* Hero skeleton */}
      <View className="w-full bg-charcoal p-8 pt-12">
        <Bone className="h-3 w-24 bg-off-white/10 mb-3" />
        <Bone className="h-10 w-48 bg-off-white/15" />
      </View>

      {/* Stats skeleton */}
      <View className="flex-row px-5 mt-6 gap-4">
        <View className="flex-1 bg-white border border-charcoal/10 rounded-2xl p-4">
          <Bone className="h-8 w-12 mb-2" />
          <Bone className="h-3 w-20" />
        </View>
        <View className="flex-1 bg-white border border-charcoal/10 rounded-2xl p-4">
          <Bone className="h-8 w-12 mb-2" />
          <Bone className="h-3 w-20" />
        </View>
      </View>

      {/* Action buttons skeleton */}
      <View className="flex-row px-5 mt-4 gap-4">
        <Bone className="flex-1 h-12 rounded-xl" />
        <Bone className="flex-1 h-12 rounded-xl" />
      </View>

      {/* Recent work skeleton */}
      <View className="px-5 mt-8">
        <Bone className="h-6 w-32 mb-6" />
        <View className="flex-row flex-wrap gap-4">
          <Bone className="w-[47%] h-24 rounded-2xl" />
          <Bone className="w-[47%] h-24 rounded-2xl" />
          <Bone className="w-[47%] h-24 rounded-2xl" />
          <Bone className="w-[47%] h-24 rounded-2xl" />
        </View>
      </View>
    </SafeAreaView>
  );
}
