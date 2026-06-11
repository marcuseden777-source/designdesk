# Editorial Modern Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the application UI to the "Editorial Modern" aesthetic, focusing on mobile-first vertical storytelling and web-responsive asymmetrical grids.

**Architecture:** We will implement the design using NativeWind (Tailwind CSS) to enforce the new typography, color palette, and layout logic. We will create reusable components (Cards, Buttons, Inputs) defined in the design spec to replace existing UI.

**Tech Stack:** React Native, Expo, NativeWind (Tailwind CSS).

---

### Task 1: Setup Design System Variables

**Files:**
- Modify: `app/frontend/tailwind.config.js`
- Modify: `app/frontend/global.css`

- [ ] **Step 1: Configure Tailwind colors and fonts**

Modify `tailwind.config.js` to define our color palette and font stacks.

```javascript
// app/frontend/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        charcoal: '#1a1a1a',
        'off-white': '#fdfcf8',
        terracotta: '#b85c38',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
};
```

- [ ] **Step 2: Initialize global styles**

Set base styles in `global.css`.

```css
/* app/frontend/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #fdfcf8;
  color: #1a1a1a;
  font-family: 'Montserrat', sans-serif;
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js global.css
git commit -m "feat: setup Editorial Modern design system variables"
```

### Task 2: Create Component Library (Card Component)

**Files:**
- Create: `app/frontend/components/Card.tsx`

- [ ] **Step 1: Implement Card Component**

```tsx
// app/frontend/components/Card.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

interface CardProps {
  imageSource: any;
  title: string;
  metadata: string;
}

export const Card = ({ imageSource, title, metadata }: CardProps) => (
  <TouchableOpacity className="relative w-full overflow-hidden rounded-[2px]">
    <Image source={imageSource} className="h-64 w-full" />
    <View className="absolute bottom-0 left-0 w-full bg-[#fdfcf8]/70 p-4">
      <Text className="font-serif text-xl text-charcoal">{title}</Text>
      <Text className="font-sans text-xs text-charcoal">{metadata}</Text>
    </View>
  </TouchableOpacity>
);
```

- [ ] **Step 2: Commit**

```bash
git add components/Card.tsx
git commit -m "feat: add Editorial Modern Card component"
```

### Task 3: Implement Button Component

**Files:**
- Create: `app/frontend/components/Button.tsx`

- [ ] **Step 1: Implement Button Component**

```tsx
// app/frontend/components/Button.tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

interface ButtonProps {
  title: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
}

export const Button = ({ title, variant, onPress }: ButtonProps) => {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-6 py-3 ${isPrimary ? 'bg-terracotta' : 'border border-charcoal bg-transparent'}`}
    >
      <Text className={`uppercase font-sans ${isPrimary ? 'text-white' : 'text-charcoal'}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/Button.tsx
git commit -m "feat: add Editorial Modern Button component"
```

### Task 4: Redesign Dashboard

**Files:**
- Modify: `app/frontend/app/index.tsx`

- [ ] **Step 1: Update index to use new components and layout**

```tsx
// app/frontend/app/index.tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Card } from '../components/Card';

export default function Dashboard() {
  return (
    <ScrollView className="bg-off-white">
      {/* Hero Section */}
      <View className="h-96 w-full bg-charcoal items-center justify-center">
        <Text className="font-serif text-4xl text-off-white">Featured Project</Text>
      </View>
      
      {/* Masonry Grid Simulation */}
      <View className="p-4 gap-4">
        <Card imageSource={{ uri: '...' }} title="Project A" metadata="Designer - Room" />
        <Card imageSource={{ uri: '...' }} title="Project B" metadata="Designer - Room" />
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/index.tsx
git commit -m "feat: redesign dashboard with Editorial Modern aesthetic"
```
