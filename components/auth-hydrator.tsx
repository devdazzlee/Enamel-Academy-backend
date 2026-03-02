"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { authService } from "@/lib/api/auth";
import { tokenStorage } from "@/lib/api/token";

export function AuthHydrator() {
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    hydrateFromStorage();

    // Validate once on app boot only when a token exists.
    void (async () => {
      const token = tokenStorage.get();
      if (!token) return;
      const isValid = await authService.validateToken();
      if (!isValid) {
        await logout();
      }
    })();
  }, [hydrateFromStorage, logout]);

  return null;
}
