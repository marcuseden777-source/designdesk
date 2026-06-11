import { Text as RNText, TextProps } from "react-native";

export function Text({ style, className, ...props }: TextProps & { className?: string }) {
  // Apply base classes
  const classes = `text-charcoal font-sans ${className || ""}`;
  return <RNText className={classes} style={style} {...props} />;
}
