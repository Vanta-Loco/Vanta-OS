import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, setAdminToken, clearAdminToken, getAdminToken } from "@/lib/queryClient";

export function useAdmin() {
  const { data, isLoading, isFetching } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/admin/me"],
    retry: false,
    staleTime: 0,
    // Seed initial state from localStorage so the UI doesn't flash
    // "unauthenticated" on first render if a token is already stored.
    initialData: getAdminToken() ? { authenticated: true } : undefined,
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/admin/login", { password });
      return res.json() as Promise<{ authenticated: boolean; token?: string }>;
    },
    onSuccess: (data) => {
      if (data?.token) {
        // Persist token so subsequent requests and page reloads stay authenticated
        setAdminToken(data.token);
      }
      // Optimistically update cache — prevents stale {authenticated:false} from
      // triggering the redirect loop before the background refetch completes
      queryClient.setQueryData(["/api/admin/me"], { authenticated: true });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/logout"),
    onSuccess: () => {
      clearAdminToken();
      queryClient.setQueryData(["/api/admin/me"], { authenticated: false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
      queryClient.clear();
    },
  });

  return {
    isAuthenticated: data?.authenticated ?? false,
    isLoading,
    isFetching,
    login: loginMutation,
    logout: logoutMutation,
  };
}
