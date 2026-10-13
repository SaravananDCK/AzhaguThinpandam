import { useQuery } from '@tanstack/react-query';

import { useAuth } from './auth-store';

// One door to the website's API. Adds the sign-in token, turns the server's
// `{ error }` into a thrown ApiError with a message fit to show, and signs the
// app out when the server says the token is no longer good.

/** Statically referenced so Expo can inline it (docs: environment variables). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { token, signOut } = useAuth.getState();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('No connection. Please check your internet and try again.', 0);
  }

  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    // The token was revoked or expired — forget it so the app asks to sign in
    if (res.status === 401 && token) await signOut();
    throw new ApiError(data?.error ?? 'Something went wrong. Please try again.', res.status);
  }
  return data as T;
}

/**
 * Loads `path` and keeps it for the screen: `{ data, error, loading, reload }`.
 * Pass null to skip (for example, while signed out). Results are cached by
 * path, so going back to a screen shows it at once and refreshes behind.
 */
export function useApi<T>(path: string | null) {
  const query = useQuery({
    queryKey: [path],
    queryFn: () => api<T>(path as string),
    enabled: path !== null,
  });
  return {
    data: query.data ?? null,
    error: query.error ? query.error.message : null,
    loading: query.isFetching,
    reload: query.refetch,
  };
}
