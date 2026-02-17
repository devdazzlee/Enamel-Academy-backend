import { authApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints";

export type ApiUser = {
  id?: string | number;
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  display_name?: string;
  role?: string;
  role_display?: string;
  dental_fields?: any[];
  registered_date?: string;
};

export type UpdateUserPayload = {
  title?: string;
  firstName?: string;
  lastName?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

const normalizeUser = (raw: unknown): ApiUser => {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const data = (obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj) as Record<
    string,
    unknown
  >;

  return {
    id: (data.id as string | number | undefined) ?? (data.user_id as string | number | undefined),
    title: (data.title as string | undefined) ?? (data.prefix as string | undefined),
    firstName: (data.first_name as string | undefined) ?? (data.firstName as string | undefined),
    lastName: (data.last_name as string | undefined) ?? (data.lastName as string | undefined),
    email: (data.email as string | undefined),
    username: (data.username as string | undefined),
    display_name: (data.display_name as string | undefined),
    role: (data.role as string | undefined),
    role_display: (data.role_display as string | undefined),
    dental_fields: (data.dental_fields as any[]) ?? [],
    registered_date: (data.registered_date as string | undefined),
  };
};

export const userService = {
  async me(): Promise<ApiUser> {
    const response = await authApi.get(API_PATHS.user.me);
    return normalizeUser(response.data);
  },

  async update(payload: UpdateUserPayload): Promise<ApiUser> {
    const response = await authApi.put(API_PATHS.user.update, null, {
      params: {
        title: payload.title,
        first_name: payload.firstName,
        last_name: payload.lastName,
      },
    });
    return normalizeUser(response.data);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await authApi.post(API_PATHS.user.changePassword, null, {
      params: {
        current_password: payload.currentPassword,
        new_password: payload.newPassword,
      },
    });
  },
};
