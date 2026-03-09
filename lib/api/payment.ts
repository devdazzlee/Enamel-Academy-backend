import { authApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints";

export type PaymentConfig = {
  publishable_key?: string;
};

export type PaymentHistoryItem = {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  created_at?: string;
  description?: string;
};

export const paymentService = {
  async config(): Promise<PaymentConfig> {
    const response = await authApi.get(API_PATHS.payment.config);
    const root = (response.data && typeof response.data === "object" ? response.data : {}) as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
    return {
      publishable_key: (data.publishable_key as string | undefined) ?? (data.stripe_publishable_key as string | undefined),
    };
  },

  async createCheckout(planId: string): Promise<{ url?: string }> {
    const response = await authApi.post(API_PATHS.payment.createCheckout, { plan_id: planId });
    const root = (response.data && typeof response.data === "object" ? response.data : {}) as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
    const url = (data.url as string | undefined) ?? (data.checkout_url as string | undefined);
    return { url };
  },

  async history(limit = 10): Promise<PaymentHistoryItem[]> {
    const response = await authApi.get(API_PATHS.payment.history, {
      params: { limit },
    });
    const root = (response.data && typeof response.data === "object" ? response.data : {}) as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
    const list = Array.isArray(data.history) ? data.history : Array.isArray(data) ? (data as unknown[]) : [];
    return (list as unknown[]).map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        id: (row.id as string | undefined) ?? (row.payment_id as string | undefined),
        amount: row.amount as number | undefined,
        currency: row.currency as string | undefined,
        status: row.status as string | undefined,
        created_at: row.created_at as string | undefined,
        description: row.description as string | undefined,
      };
    });
  },

  async session(sessionId: string): Promise<unknown> {
    const response = await authApi.get(API_PATHS.payment.session(sessionId));
    return response.data;
  },
};

