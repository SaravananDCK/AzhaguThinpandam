import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { colors, radius, space } from '@/lib/theme';
import type { User } from '@/lib/types';

// Same sign-in as the website: a one-time code to WhatsApp (Indian mobile), or
// to email for customers abroad. The first sign-in creates the account.
export default function LoginScreen() {
  const signIn = useAuth((s) => s.signIn);
  const [channel, setChannel] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = identifier.trim();
  const validId = channel === 'phone' ? /^[6-9]\d{9}$/.test(id) : /^\S+@\S+\.\S{2,}$/.test(id);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const requestCode = () =>
    run(async () => {
      const res = await api<{ devCode?: string }>('/api/otp/request', { body: { [channel]: id } });
      setSent(true);
      // Only a development server without a message channel returns the code
      setCode(res.devCode ?? '');
    });

  const verify = () =>
    run(async () => {
      const res = await api<{ token: string; user: User }>('/api/v1/auth/verify', {
        body: { [channel]: id, code: code.trim(), deviceName: Platform.OS },
      });
      await signIn(res.token, res.user);
      router.back();
    });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{sent ? 'Enter the code' : 'Welcome'}</Text>
        <Text style={styles.text}>
          {sent
            ? `We sent a 6-digit code to ${channel === 'phone' ? `+91 ${id} on WhatsApp` : id}.`
            : channel === 'phone'
              ? 'Enter your mobile number. We’ll send a one-time code on WhatsApp.'
              : 'Enter your email. We’ll send a one-time code.'}
        </Text>

        {!sent ? (
          <>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={channel === 'phone' ? '10-digit mobile number' : 'you@example.com'}
              placeholderTextColor={colors.muted}
              keyboardType={channel === 'phone' ? 'number-pad' : 'email-address'}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={channel === 'phone' ? 10 : 200}
              autoFocus
              style={styles.input}
            />
            <Button label="Send code" onPress={requestCode} disabled={!validId} loading={busy} />
            <Pressable
              hitSlop={8}
              onPress={() => {
                setChannel(channel === 'phone' ? 'email' : 'phone');
                setIdentifier('');
                setError(null);
              }}>
              <Text style={styles.link}>
                {channel === 'phone'
                  ? 'Outside India? Use your email instead'
                  : 'Use an Indian mobile number instead'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              style={[styles.input, styles.code]}
            />
            <Button
              label="Verify and sign in"
              onPress={verify}
              disabled={!/^\d{6}$/.test(code.trim())}
              loading={busy}
            />
            <Pressable
              hitSlop={8}
              onPress={() => {
                setSent(false);
                setCode('');
                setError(null);
              }}>
              <Text style={styles.link}>Change number or resend the code</Text>
            </Pressable>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, lineHeight: 22, color: colors.muted },
  input: {
    height: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 17,
    color: colors.text,
  },
  code: { letterSpacing: 8, textAlign: 'center', fontSize: 22, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '600', color: colors.primary, textAlign: 'center' },
  error: { fontSize: 14, color: colors.danger, textAlign: 'center' },
});
