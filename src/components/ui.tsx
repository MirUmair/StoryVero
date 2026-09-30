import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shared } from '../theme/theme';

export function Button({
  label,
  onPress,
  secondary,
  disabled,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 90 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 120 });
        }}
        style={[
          styles.button,
          secondary && styles.secondary,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Section({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={shared.between}>
      <Text style={shared.heading}>{title}</Text>
      {detail && <Text style={shared.caption}>{detail}</Text>}
    </View>
  );
}
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const inset = useSafeAreaInsets();
  const gesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd(event => {
      if (event.translationY > 65) {
        onClose();
      }
    });
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.modal}>
        <Pressable
          accessibilityLabel="Close controls"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          entering={SlideInDown.duration(200)}
          style={[styles.sheet, { paddingBottom: Math.max(24, inset.bottom) }]}
        >
          <GestureDetector gesture={gesture}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          <View style={shared.between}>
            <Text style={shared.heading}>{title}</Text>
            <Chip label="Done" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetContent}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyGlyph}>✧</Text>
      </View>
      <Text style={shared.heading}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.ink,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 22,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: colors.white },
  secondary: { backgroundColor: colors.surface },
  secondaryText: { color: colors.ink },
  disabled: { opacity: 0.4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.ink },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: colors.white },
  modal: { flex: 1, backgroundColor: '#11140E80', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    maxHeight: '80%',
  },
  handleArea: { paddingVertical: 14, alignItems: 'center' },
  handle: { height: 4, width: 36, backgroundColor: '#CFD1C6', borderRadius: 3 },
  sheetContent: { paddingVertical: 24, gap: 20 },
  empty: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 26,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlyph: { fontSize: 36, color: colors.muted },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});
