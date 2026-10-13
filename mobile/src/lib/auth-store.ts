import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { queryClient } from './query-client';
import type { User } from './types';

// The sign-in token lives in the phone's secure storage (Keychain / Keystore).
// SecureStore doesn't exist on web, which is only used to preview screens
// during development — there it falls back to localStorage.
const TOKEN_KEY = 'azhagu.token';
const USER_KEY = 'azhagu.user';

const storage = {
  get: async (key: string) =>
    Platform.OS === 'web'
      ? (globalThis.localStorage?.getItem(key) ?? null)
      : SecureStore.getItemAsync(key),
  set: async (key: string, value: string) =>
    Platform.OS === 'web'
      ? globalThis.localStorage?.setItem(key, value)
      : SecureStore.setItemAsync(key, value),
  remove: async (key: string) =>
    Platform.OS === 'web'
      ? globalThis.localStorage?.removeItem(key)
      : SecureStore.deleteItemAsync(key),
};

type AuthState = {
  /** False until the saved sign-in has been read at launch */
  ready: boolean;
  token: string | null;
  user: User | null;
  restore: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>()((set) => ({
  ready: false,
  token: null,
  user: null,
  restore: async () => {
    try {
      const [token, user] = await Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)]);
      set({ token, user: user ? (JSON.parse(user) as User) : null, ready: true });
    } catch {
      // Unreadable storage is "signed out", never a crash at launch
      set({ token: null, user: null, ready: true });
    }
  },
  signIn: async (token, user) => {
    await Promise.all([storage.set(TOKEN_KEY, token), storage.set(USER_KEY, JSON.stringify(user))]);
    set({ token, user });
  },
  setUser: async (user) => {
    await storage.set(USER_KEY, JSON.stringify(user));
    set({ user });
  },
  signOut: async () => {
    await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)]);
    set({ token: null, user: null });
    // Orders and addresses belong to the account that just left
    queryClient.clear();
  },
}));
