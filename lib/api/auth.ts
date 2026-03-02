import { authApi, publicApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints";
import { tokenStorage } from "@/lib/api/token";

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResult = {
  token: string;
  raw: unknown;
};

const extractToken = (raw: unknown): string | null => {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  const direct = obj.token;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const data = obj.data;
  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;
    if (typeof dataObj.token === "string" && dataObj.token.length > 0) return dataObj.token;
  }

  return null;
};

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const response = await publicApi.post(API_PATHS.auth.login, {
      email: payload.email,
      password: payload.password,
    });
    const token = extractToken(response.data);
    if (!token) throw new Error("Login succeeded but token was not found in response");
    return { token, raw: response.data };
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    const response = await publicApi.post(API_PATHS.auth.register, {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    });
    const token = extractToken(response.data);
    if (!token) throw new Error("Register succeeded but token was not found in response");
    return { token, raw: response.data };
  },

  async logout(): Promise<void> {
    await authApi.post(API_PATHS.auth.logout);
  },

  async validateToken(): Promise<boolean> {
    try {
      const token = tokenStorage.get();
      await authApi.post(API_PATHS.auth.validateToken, token ? { token } : {});
      return true;
    } catch {
      return false;
    }
  },
};
