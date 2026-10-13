import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, space } from '@/lib/theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = variant === 'primary' ? colors.white : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'outline' && styles.buttonOutline,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={tint} />}
          <Text style={[styles.buttonLabel, { color: tint }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Full-screen "loading", "something went wrong — retry" and "nothing here" states. */
export function Centered({
  loading,
  message,
  detail,
  icon,
  actionLabel,
  onAction,
}: {
  loading?: boolean;
  message?: string;
  detail?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.centered}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={48} color={colors.muted} />}
          {message && <Text style={styles.centeredMessage}>{message}</Text>}
          {detail && <Text style={styles.centeredDetail}>{detail}</Text>}
          {actionLabel && onAction && (
            <Button label={actionLabel} onPress={onAction} style={{ marginTop: space.md }} />
          )}
        </>
      )}
    </View>
  );
}

export function Pill({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'primary' }) {
  return (
    <View style={[styles.pill, tone === 'primary' && styles.pillPrimary]}>
      <Text style={[styles.pillText, tone === 'primary' && { color: colors.primary }]}>
        {children}
      </Text>
    </View>
  );
}

export function QtyStepper({
  qty,
  max,
  onChange,
}: {
  qty: number;
  max: number;
  onChange: (qty: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityLabel="Decrease quantity"
        hitSlop={8}
        onPress={() => onChange(qty - 1)}
        style={styles.stepperButton}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <Text style={styles.stepperQty}>{qty}</Text>
      <Pressable
        accessibilityLabel="Increase quantity"
        hitSlop={8}
        disabled={qty >= max}
        onPress={() => onChange(qty + 1)}
        style={[styles.stepperButton, qty >= max && styles.disabled]}>
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={value >= n ? 'star' : value >= n - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={colors.gold}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonOutline: { borderWidth: 1, borderColor: colors.primary },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.sm,
    backgroundColor: colors.background,
  },
  centeredMessage: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  centeredDetail: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  pillPrimary: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.text },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  stepperButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepperQty: { minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.text },
});
