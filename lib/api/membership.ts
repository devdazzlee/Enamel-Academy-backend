import { authApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints";

export type MembershipPlan = {
  id: string | number;
  name: string;
  description?: string;
  price?: number | string;
  interval?: string;
  level_id?: string | number;
};

export type MembershipInfo = {
  active: boolean;
  plan_name?: string;
  level_id?: string | number;
  expires_at?: string | null;
  renewal_at?: string | null;
};

export const membershipService = {
  async plans(): Promise<MembershipPlan[]> {
    const response = await authApi.get(API_PATHS.membership.plans);
    const root = (response.data && typeof response.data === "object" ? response.data : {}) as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
    const list = Array.isArray(data.plans) ? data.plans : Array.isArray(data) ? (data as unknown[]) : [];
    return (list as unknown[]).map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        id: (row.id as string | number | undefined) ?? (row.level_id as string | number | undefined) ?? "",
        name: (row.name as string | undefined) ?? "",
        description: row.description as string | undefined,
        price: row.price as number | string | undefined,
        interval: row.interval as string | undefined,
        level_id: (row.level_id as string | number | undefined) ?? undefined,
      };
    }).filter((p) => p.id && p.name);
  },

  async current(): Promise<MembershipInfo | null> {
    const response = await authApi.get(API_PATHS.membership.current);
    const root = (response.data && typeof response.data === "object" ? response.data : {}) as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
    if (!data || Object.keys(data).length === 0) return null;
    return {
      active: Boolean(data.active ?? data.is_active),
      plan_name: (data.plan_name as string | undefined) ?? (data.membership_name as string | undefined),
      level_id: (data.level_id as string | number | undefined) ?? undefined,
      expires_at: (data.expires_at as string | null | undefined) ?? null,
      renewal_at: (data.renewal_at as string | null | undefined) ?? null,
    };
  },

  async checkoutUrl(levelId: string | number): Promise<string | null> {
    const response = await authApi.get(API_PATHS.membership.checkout(levelId));
    const root = (response.data && typeof response.data === "object" ? response.data : {}) as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
    const url = (data.url as string | undefined) ?? (data.checkout_url as string | undefined);
    return typeof url === "string" && url.length > 0 ? url : null;
  },

  async cancel(atPeriodEnd = true): Promise<unknown> {
    const response = await authApi.post(API_PATHS.membership.cancel, { at_period_end: atPeriodEnd });
    return response.data;
  },
};

