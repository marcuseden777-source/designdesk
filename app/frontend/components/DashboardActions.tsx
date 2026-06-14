import React from 'react';
import { View } from 'react-native';
import { Button } from "@/components/Button";

interface DashboardActionsProps {
  onNewDesign: () => void;
  onNewQuote: () => void;
}

export const DashboardActions: React.FC<DashboardActionsProps> = ({ onNewDesign, onNewQuote }) => {
  return (
    <View className="mx-5 mt-4 mb-1 flex-row gap-3">
      <View className="flex-1">
        <Button variant="primary" onPress={onNewDesign} title="New Design" />
      </View>
      <View className="flex-1">
        <Button variant="primary" onPress={onNewQuote} title="New Quote" />
      </View>
    </View>
  );
};
