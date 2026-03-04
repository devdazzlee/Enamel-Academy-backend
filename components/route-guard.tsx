"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ClipLoader } from "react-spinners";

const color = "#8b5cf6";

const AUTH_PAGES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/otp-verify",
  "/update-password",
  "/password-success",
]);

const PUBLIC_PAGES = new Set([
  "/",
  "/privacy",
  "/terms",
  "/cookies",
  "/contact",
  "/help",
  "/pricing",
]);

type RouteGuardProps = {
  children: React.ReactNode;
};

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const isAuthPage = pathname ? AUTH_PAGES.has(pathname) : false;
  const isPublicPage = pathname ? PUBLIC_PAGES.has(pathname) : false;
  const isProtectedPage = pathname ? !isAuthPage && !isPublicPage : false;

  const shouldRedirectToDashboard = hasHydrated && isAuthenticated && isAuthPage;
  const shouldRedirectToLogin = hasHydrated && !isAuthenticated && isProtectedPage;

  useEffect(() => {
    if (!hasHydrated || !pathname) return;
    if (isAuthenticated && isAuthPage) {
      router.replace("/dashboard");
      return;
    }
    if (!isAuthenticated && isProtectedPage) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, pathname, router, isAuthPage, isProtectedPage]);

  if (!hasHydrated || shouldRedirectToDashboard || shouldRedirectToLogin) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <ClipLoader
          color={color}
          loading={true}
          size={50}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      </div>
    );
  }

  return <>{children}</>;
}