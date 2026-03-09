/**
 * Debug helper to sanity-check auth flows.
 * Call from browser console:
 *   window.debugAuth.testTokenInjection()
 *   window.debugAuth.test401Handling()
 */
import { authApi } from "@/lib/api/http";
import { tokenStorage } from "@/lib/api/token";
import { useAuthStore } from "@/lib/stores/auth-store";
import { authService } from "@/lib/api/auth";
import { coursesService } from "@/lib/api/courses";
import { rolesService } from "@/lib/api/roles";
import { pdpService } from "@/lib/api/pdp";
import { cpdService } from "@/lib/api/cpd";
import { certificatesService } from "@/lib/api/certificates";
import { assignmentService } from "@/lib/api/assignments";
import { passwordResetService } from "@/lib/api/password-reset";
import { API_PATHS } from "@/lib/api/endpoints";

export const debugAuth = {
  /** Check if token is stored and injected */
  async testTokenInjection() {
    const token = tokenStorage.get();
    console.log("[debug] token in localStorage:", !!token);
    if (!token) {
      console.warn("[debug] No token found. Please login first.");
      return;
    }
    try {
      // Call a protected endpoint that doesn’t affect data
      const res = await authApi.get(API_PATHS.user.me);
      console.log("[debug] Token injection success:", res.status, res.data);
    } catch (e) {
      console.error("[debug] Token injection failed:", e);
    }
  },

  /** Simulate a 401 to verify auto-logout */
  async test401Handling() {
    console.log("[debug] Simulating 401...");
    // Call a protected endpoint with an invalid token to trigger 401
    const originalToken = tokenStorage.get();
    tokenStorage.set("invalid-token");
    try {
      await authApi.get(API_PATHS.user.me);
    } catch {
      // Expected to fail
    }
    // Restore original token if any
    if (originalToken) tokenStorage.set(originalToken);
    console.log("[debug] 401 handling complete. Check if you were logged out automatically.");
  },

  /** Show current auth store state */
  showAuthStoreState() {
    const state = useAuthStore.getState();
    console.log("[debug] AuthStore state:", state);
  },

  /** Test validate-token endpoint */
  async testValidateToken() {
    try {
      const isValid = await authService.validateToken();
      console.log("[debug] validateToken result:", isValid);
    } catch (e) {
      console.error("[debug] validateToken error:", e);
    }
  },

  /** Test GET /courses (new endpoint) */
  async testCoursesList() {
    try {
      const courses = await coursesService.list();
      console.log("[debug] GET /courses result:", courses);
    } catch (e) {
      console.error("[debug] GET /courses error:", e);
    }
  },

  /** Test dental roles endpoint */
  async testDentalRoles() {
    try {
      const roles = await rolesService.roles();
      console.log("[debug] GET /dental/roles result:", roles);
    } catch (e) {
      console.error("[debug] GET /dental/roles error:", e);
    }
  },

  /** Test dental permissions for a role (e.g., 'dentist') */
  async testDentalPermissions(role = "dentist") {
    try {
      const perms = await rolesService.permissions(role);
      console.log(`[debug] GET /dental/permissions/${role} result:`, perms);
    } catch (e) {
      console.error(`[debug] GET /dental/permissions/${role} error:`, e);
    }
  },

  async testPdpList() {
    try {
      const res = await pdpService.list({ perPage: 5, page: 1 });
      console.log("[debug] GET /pdp result:", res);
    } catch (e) {
      console.error("[debug] GET /pdp error:", e);
    }
  },

  async testCpdSummary() {
    try {
      const res = await cpdService.summary();
      console.log("[debug] GET /cpd/summary result:", res);
    } catch (e) {
      console.error("[debug] GET /cpd/summary error:", e);
    }
  },

  async testCertificates() {
    try {
      const res = await certificatesService.getMyCertificates({ page: 1, perPage: 10 });
      console.log("[debug] GET /certificates/my-certificates result:", res);
    } catch (e) {
      console.error("[debug] GET /certificates/my-certificates error:", e);
    }
  },

  async testAssignments(courseId: string | number) {
    try {
      const res = await assignmentService.courseAssignments(courseId);
      console.log(`[debug] GET /courses/${courseId}/assignments result:`, res);
    } catch (e) {
      console.error(`[debug] GET /courses/${courseId}/assignments error:`, e);
    }
  },

  async testForgotPassword(email: string) {
    try {
      const res = await passwordResetService.forgotPassword({ email });
      console.log("[debug] POST /forgot-password result:", res);
    } catch (e) {
      console.error("[debug] POST /forgot-password error:", e);
    }
  },

  async testCourseReflection(courseId: string | number) {
    try {
      const res = await coursesService.getReflection(courseId);
      console.log(`[debug] GET /courses/${courseId}/reflection result:`, res);
    } catch (e) {
      console.error(`[debug] GET /courses/${courseId}/reflection error:`, e);
    }
  },

  async testCourseFeedback(courseId: string | number) {
    try {
      const res = await coursesService.getFeedback(courseId);
      console.log(`[debug] GET /courses/${courseId}/feedback result:`, res);
    } catch (e) {
      console.error(`[debug] GET /courses/${courseId}/feedback error:`, e);
    }
  },

  async testTestApi() {
    try {
      const res = await authApi.get(API_PATHS.testApi);
      console.log("[debug] GET /TESTApi result:", res.data);
    } catch (e) {
      console.error("[debug] GET /TESTApi error:", e);
    }
  },
};

// Expose globally in browser for easy testing
if (typeof window !== "undefined") {
  (window as any).debugAuth = debugAuth;
}
