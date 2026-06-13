import React from 'react';
import { TouchableOpacity, View, Text, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CardProps {
  imageSource?: ImageSourcePropType;
  title: string;
  metadata: string;
  onPress?: () => void;
}

export const Card = ({ imageSource, title, metadata, onPress }: CardProps) => {
  return (
    <View className="relative w-full overflow-hidden">
      {/* Soft offset shadow layer for depth */}
      <View className="absolute top-2 left-2 w-full h-full bg-charcoal rounded-2xl opacity-10" />

      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className="w-full rounded-2xl overflow-hidden border border-off-white/12 bg-off-white/[0.05]"
      >
        {/* Edge-to-edge image or placeholder */}
        {imageSource ? (
          <Image
            source={imageSource}
            className="w-full h-card-image"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-card-image bg-off-white/5 items-center justify-center">
            <Ionicons name="home-outline" size={32} color="#fdfcf8" style={{ opacity: 0.2 }} />
          </View>
        )}

        {/* Info-overlay */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-ink/75">
          <Text className="font-serif text-lg text-off-white" numberOfLines={2}>
            {title}
          </Text>
          <Text className="font-sans text-xs text-off-white/70 mt-1">
            {metadata}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};
