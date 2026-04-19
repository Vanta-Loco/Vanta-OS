import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useVault() {
  const { data, isLoading } = useQuery<{ authorized: boolean }>({
    queryKey: ["/api/vault/me"],
    retry: false,
    staleTime: 0,
  });

  const verifyMutation = useMutation({
    mutationFn: (code: string) =>
      apiRequest("POST", "/api/vault/verify", { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/vault/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] });
    },
  });

  return {
    isAuthorized: data?.authorized ?? false,
    isLoading,
    verify: verifyMutation,
    logout: logoutMutation,
  };
}
