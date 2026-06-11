import React from 'react';
import { View, Text } from 'react-native';

interface DashboardStatsProps {
  quoteCount: number;
  activeQuotesCount: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ quoteCount, activeQuotesCount }) => {
  return (
    <View className="mx-5 mt-4 bg-off-white shadow-md rounded-[2px] p-5 flex-row gap-4">
      <View className="flex-1 border-b border-charcoal/20 pb-4">
        <Text className="text-charcoal text-2xl font-serif">{quoteCount}</Text>
        <Text className="text-charcoal/70 text-xs font-sans mt-1 uppercase tracking-wider">Quotations</Text>
      </View>
      <View className="flex-1 border-b border-charcoal/20 pb-4">
        <Text className="text-charcoal text-2xl font-serif">{activeQuotesCount}</Text>
        <Text className="text-charcoal/70 text-xs font-sans mt-1 uppercase tracking-wider">Active</Text>
      </View>
    </View>
  );
};
