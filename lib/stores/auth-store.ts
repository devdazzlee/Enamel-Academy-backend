import { create } from "zustand";

import { authService, type LoginPayload, type RegisterPayload } from "@/lib/api/auth";
import { tokenStorage } from "@/lib/api/token";

type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;

  hydrateFromStorage: () => void;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  isAuthenticated: false,
  isLoading: false,
  hasHydrated: false,
  error: null,

  hydrateFromStorage: () => {
    const token = tokenStorage.get();
    set({ token, isAuthenticated: Boolean(token), hasHydrated: true });
  },

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.login(payload);
      tokenStorage.set(result.token);
      set({ token: result.token, isAuthenticated: true, isLoading: false, hasHydrated: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Login failed";
      tokenStorage.clear();
      set({ token: null, isAuthenticated: false, isLoading: false, error: message, hasHydrated: true });
      throw new Error(message);
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.register(payload);
      tokenStorage.set(result.token);
      set({ token: result.token, isAuthenticated: true, isLoading: false, hasHydrated: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Register failed";
      tokenStorage.clear();
      set({ token: null, isAuthenticated: false, isLoading: false, error: message, hasHydrated: true });
      throw new Error(message);
    }
  },

  logout: async () => {
    const currentToken = get().token ?? tokenStorage.get();
    try {
      if (currentToken) {
        await authService.logout();
      }
    } finally {
      tokenStorage.clear();
      set({ token: null, isAuthenticated: false, hasHydrated: true });
    }
  },

  clearSession: () => {
    tokenStorage.clear();
    set({ token: null, isAuthenticated: false, hasHydrated: true });
  },

  clearError: () => set({ error: null }),
}));

if (typeof window !== "undefined") {
  window.addEventListener("auth:unauthorized", () => {
    useAuthStore.getState().clearSession();
  });
}
