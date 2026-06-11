import React from 'react';
import { View } from 'react-native';
import { Button } from "@/components/Button";

interface DashboardActionsProps {
  onNewDesign: () => void;
  onNewQuote: () => void;
}

export const DashboardActions: React.FC<DashboardActionsProps> = ({ onNewDesign, onNewQuote }) => {
  return (
    <View className="w-full bg-charcoal p-5 flex-row gap-4">
      <View className="flex-1">
        <Button variant="primary" onPress={onNewDesign} title="New Design" />
      </View>
      <View className="flex-1">
        <Button variant="primary" onPress={onNewQuote} title="New Quote" />
      </View>
    </View>
  );
};
