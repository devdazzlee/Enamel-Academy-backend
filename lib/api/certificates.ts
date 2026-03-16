import { API_PATHS } from "@/lib/api/endpoints";
import { authApi, publicApi } from "@/lib/api/http";

export type CertificateListParams = {
  page?: number;
  perPage?: number;
};

export type VerifyCertificatePayload = {
  user_id: number;
  course_id: number;
};

export const certificatesService = {
  async getCourseCertificate(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.certificates.course(courseId));
    return response.data;
  },

  async getMyCertificates(params?: CertificateListParams): Promise<unknown> {
    const response = await authApi.get(API_PATHS.certificates.myCertificates, {
      params: {
        page: params?.page,
        per_page: params?.perPage,
      },
    });
    return response.data;
  },

  async checkAvailability(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.certificates.check(courseId));
    return response.data;
  },

  async preview(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.certificates.preview(courseId));
    return response.data;
  },

  async verify(payload: VerifyCertificatePayload): Promise<unknown> {
    const response = await publicApi.post(API_PATHS.certificates.verify, payload);
    return response.data;
  },
};


