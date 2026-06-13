import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

type ButtonProps = {
  title: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
};

export const Button = ({ title, variant, onPress }: ButtonProps) => {
  // Pill buttons to match the brand front-end (rounded-full, like the landing CTA).
  const baseStyle = "px-6 py-3.5 items-center justify-center rounded-full active:opacity-90";

  const variantStyle = variant === 'primary'
    ? "bg-terracotta"
    : "border border-charcoal bg-transparent";

  const textStyle = variant === 'primary'
    ? "text-off-white"
    : "text-charcoal";

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${baseStyle} ${variantStyle}`}
      activeOpacity={0.85}
    >
      <Text className={`${textStyle} font-sans-semibold tracking-wide`}>{title}</Text>
    </TouchableOpacity>
  );
};
