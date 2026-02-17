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
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown) => {
    if (!item || typeof item !== "object") return null;
    const obj = item as Record<string, unknown>;
    return {
      id: (obj.id as string | number | undefined) ?? obj.name,
      name: (obj.name as string | undefined) ?? "",
      slug: (obj.slug as string | undefined) ?? undefined,
      description: (obj.description as string | undefined) ?? undefined,
    };
  }).filter(Boolean) as DentalRole[];
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
