import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAdmin() {
  const { data, isLoading, isFetching } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/admin/me"],
    retry: false,
    staleTime: 0,
  });

  const loginMutation = useMutation({
    mutationFn: (password: string) =>
      apiRequest("POST", "/api/admin/login", { password }),
    onSuccess: () => {
      // Immediately write {authenticated:true} into the cache so the /admin
      // dashboard doesn't read stale {authenticated:false} and redirect back
      // to the login page before the background refetch completes.
      queryClient.setQueryData(["/api/admin/me"], { authenticated: true });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/logout"),
    onSuccess: () => {
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
