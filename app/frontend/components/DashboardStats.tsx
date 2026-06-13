import React from 'react';
import { View, Text } from 'react-native';

interface DashboardStatsProps {
  quoteCount: number;
  activeQuotesCount: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ quoteCount, activeQuotesCount }) => {
  return (
    <View className="mx-5 mt-5 bg-off-white/[0.06] border border-off-white/12 rounded-2xl p-5 flex-row items-center">
      <View className="flex-1">
        <Text className="text-off-white text-3xl font-serif">{quoteCount}</Text>
        <Text className="text-off-white/45 text-xs font-sans mt-1 uppercase tracking-wider">Quotations</Text>
      </View>
      <View className="w-px self-stretch bg-off-white/12" />
      <View className="flex-1 pl-5">
        <Text className="text-off-white text-3xl font-serif">{activeQuotesCount}</Text>
        <Text className="text-off-white/45 text-xs font-sans mt-1 uppercase tracking-wider">Active</Text>
      </View>
    </View>
  );
};
