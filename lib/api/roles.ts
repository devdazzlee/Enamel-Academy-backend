import { authApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints";

export type DentalRole = {
  id: string | number;
  name: string;
  slug?: string;
  description?: string;
};

export type Permission = {
  id: string | number;
  name: string;
  resource?: string;
  action?: string;
};

const normalizeRoles = (raw: unknown): DentalRole[] => {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;

  // Handles API shape: { success: true, data: { dentist: "Dentist", ... } }
  const container = (obj.data ?? raw) as unknown;
  if (!container) return [];

  if (Array.isArray(container)) {
    return container
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return null;
        const roleObj = item as Record<string, unknown>;
        return {
          id: (roleObj.id as string | number | undefined) ?? roleObj.slug ?? roleObj.name,
          name: (roleObj.name as string | undefined) ?? "",
          slug: (roleObj.slug as string | undefined) ?? undefined,
          description: (roleObj.description as string | undefined) ?? undefined,
        };
      })
      .filter(Boolean) as DentalRole[];
  }

  if (typeof container === "object") {
    return Object.entries(container as Record<string, unknown>)
      .map(([key, value]) => ({
        id: key,
        slug: key,
        name: typeof value === "string" ? value : key,
      }))
      .filter((role) => role.name.length > 0);
  }

  return [];
};

const normalizePermissions = (raw: unknown): Permission[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown) => {
    if (!item || typeof item !== "object") return null;
    const obj = item as Record<string, unknown>;
    return {
      id: (obj.id as string | number | undefined) ?? obj.name,
      name: (obj.name as string | undefined) ?? "",
      resource: (obj.resource as string | undefined) ?? undefined,
      action: (obj.action as string | undefined) ?? undefined,
    };
  }).filter(Boolean) as Permission[];
};

export const rolesService = {
  async roles(): Promise<DentalRole[]> {
    const response = await authApi.get(API_PATHS.dental.roles);
    return normalizeRoles(response.data);
  },

  async permissions(role: string): Promise<Permission[]> {
    const response = await authApi.get(API_PATHS.dental.permissions(role));
    return normalizePermissions(response.data);
  },
};
