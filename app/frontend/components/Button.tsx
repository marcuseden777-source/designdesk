import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

type ButtonProps = {
  title: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
};

export const Button = ({ title, variant, onPress }: ButtonProps) => {
  // Sharp edges: rounded-none
  // Font: font-sans (Montserrat)
  const baseStyle = "px-6 py-3 items-center justify-center rounded-none";

  const variantStyle = variant === 'primary'
    ? "bg-terracotta"
    : "border border-charcoal bg-transparent";

  const textStyle = variant === 'primary'
    ? "text-white uppercase font-bold"
    : "text-charcoal uppercase font-bold";

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${baseStyle} ${variantStyle}`}
      activeOpacity={0.7}
    >
      <Text className={`${textStyle} font-sans`}>{title}</Text>
    </TouchableOpacity>
  );
};
