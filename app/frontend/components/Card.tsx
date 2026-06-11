import React from 'react';
import { TouchableOpacity, View, Text, Image, ImageSourcePropType } from 'react-native';

interface CardProps {
  imageSource: ImageSourcePropType;
  title: string;
  metadata: string;
  onPress?: () => void;
}

export const Card = ({ imageSource, title, metadata, onPress }: CardProps) => {
  return (
    <View className="relative w-full overflow-hidden">
      {/* Offset layer for structure */}
      <View className="absolute top-2 left-2 w-full h-full bg-charcoal rounded-[2px] opacity-10" />
      
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        className="w-full rounded-[2px] overflow-hidden border border-charcoal/10"
      >
        {/* Edge-to-edge image */}
        <Image
          source={imageSource}
          className="w-full h-card-image"
          resizeMode="cover"
        />

        {/* Info-overlay */}
        {/* Note: bg-off-white/70 uses standard Tailwind opacity 70% */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-off-white/70">
          <Text className="font-serif text-lg text-charcoal" numberOfLines={2}>
            {title}
          </Text>
          <Text className="font-sans text-xs text-charcoal mt-1">
            {metadata}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};
