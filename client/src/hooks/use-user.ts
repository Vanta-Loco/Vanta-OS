// ─── User auth hook ───────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const USER_TOKEN_KEY = "vanta-user-token";

export function getUserToken(): string | null {
  try { return localStorage.getItem(USER_TOKEN_KEY); } catch { return null; }
}
export function setUserToken(token: string): void {
  try { localStorage.setItem(USER_TOKEN_KEY, token); } catch {}
}
export function clearUserToken(): void {
  try { localStorage.removeItem(USER_TOKEN_KEY); } catch {}
}

export function useUser() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{
    authenticated: boolean;
    user?: any;
  }>({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      const token = getUserToken();
      const res = await fetch("/api/user/me", {
        headers: token ? { "X-User-Token": token } : {},
        credentials: "include",
      });
      return res.json();
    },
    initialData: () => {
      const token = getUserToken();
      if (!token) return { authenticated: false };
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");
      return json;
    },
    onSuccess: (data) => {
      if (data.token) setUserToken(data.token);
      qc.setQueryData(["/api/user/me"], { authenticated: true, user: data.user });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: (data) => {
      if (data.token) setUserToken(data.token);
      qc.setQueryData(["/api/user/me"], { authenticated: true, user: data.user });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = getUserToken();
      await fetch("/api/user/logout", {
        method: "POST",
        headers: token ? { "X-User-Token": token } : {},
        credentials: "include",
      });
    },
    onSuccess: () => {
      clearUserToken();
      qc.setQueryData(["/api/user/me"], { authenticated: false });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const token = getUserToken();
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-User-Token": token } : {}),
        },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user/me"] });
    },
  });

  return {
    user: data?.user ?? null,
    isAuthenticated: data?.authenticated === true,
    isLoading,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
    updateProfile: updateProfileMutation,
  };
}
