import { authApi, publicApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints";
import { tokenStorage } from "@/lib/api/token";

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  title?: string;
  dentalLicenseNumber?: string;
  dentalSpecialty?: string;
  dentalClinic?: string;
  dentalExperienceYears?: string | number;
  dentalQualifications?: string;
  dentalRegistrationBody?: string;
  dentalRegistrationDate?: string;
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
      ...(payload.title && { title: payload.title }),
      ...(payload.dentalLicenseNumber && { dental_license_number: payload.dentalLicenseNumber }),
      ...(payload.dentalSpecialty && { dental_specialty: payload.dentalSpecialty }),
      ...(payload.dentalClinic && { dental_clinic: payload.dentalClinic }),
      ...(payload.dentalExperienceYears && { dental_experience_years: String(payload.dentalExperienceYears) }),
      ...(payload.dentalQualifications && { dental_qualifications: payload.dentalQualifications }),
      ...(payload.dentalRegistrationBody && { dental_registration_body: payload.dentalRegistrationBody }),
      ...(payload.dentalRegistrationDate && { dental_registration_date: payload.dentalRegistrationDate }),
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
