"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

export function AuthHydrator() {
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
    // Optional: validate token with server on load (disabled to avoid loops)
    // (async () => {
    //   try {
    //     const isValid = await authService.validateToken();
    //     if (!isValid) {
    //       await logout();
    //     }
    //   } catch {
    //     // If validation fails, logout
    //     await logout();
    //   }
    // })();
  }, [hydrateFromStorage]);

  return null;
}
