import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAdmin() {
  const { data, isLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/admin/me"],
    retry: false,
    staleTime: 0,
  });

  const loginMutation = useMutation({
    mutationFn: (password: string) =>
      apiRequest("POST", "/api/admin/login", { password }),
    onSuccess: () => {
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
    login: loginMutation,
    logout: logoutMutation,
  };
}
