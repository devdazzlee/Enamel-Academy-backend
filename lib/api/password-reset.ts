import { API_PATHS } from "@/lib/api/endpoints";
import { publicApi } from "@/lib/api/http";

export type ForgotPasswordPayload = {
  email: string;
};

export type VerifyOtpPayload = {
  email: string;
  otp: string;
};

export type ResetPasswordPayload = {
  resetToken: string;
  newPassword: string;
};

export type ValidateResetTokenPayload = {
  resetToken: string;
};

export const passwordResetService = {
  async forgotPassword(payload: ForgotPasswordPayload): Promise<unknown> {
    const response = await publicApi.post(API_PATHS.auth.forgotPassword, {
      email: payload.email,
    });
    return response.data;
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<unknown> {
    const response = await publicApi.post(API_PATHS.auth.verifyOtp, {
      email: payload.email,
      otp: payload.otp,
    });
    return response.data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<unknown> {
    const response = await publicApi.post(API_PATHS.auth.resetPassword, {
      reset_token: payload.resetToken,
      new_password: payload.newPassword,
    });
    return response.data;
  },

  async validateResetToken(payload: ValidateResetTokenPayload): Promise<unknown> {
    const response = await publicApi.post(API_PATHS.auth.validateResetToken, {
      reset_token: payload.resetToken,
    });
    return response.data;
  },
};
