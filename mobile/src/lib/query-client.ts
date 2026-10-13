import { QueryClient } from '@tanstack/react-query';

// A wrong order number or a closed pre-order won't fix itself — one retry is
// enough for a flaky mobile connection.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
