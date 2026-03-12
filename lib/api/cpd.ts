import { API_PATHS } from "@/lib/api/endpoints";
import { authApi } from "@/lib/api/http";

export type CPDHistoryParams = {
  year?: string | number;
  limit?: number;
  offset?: number;
};

export type CPDExternalPayload = {
  title: string;
  provider: string;
  date_completed: string;
  hours: string | number;
  gdc_category: string;
  activity_type: string;
  learning_outcomes: string;
  reflection: string;
  apply_learning: string;
  evidence?: File;
};

export type AuditReportPayload = {
  format: "pdf" | "summary" | "excel" | "evidence_zip" | string;
  date_range?: "full_cycle" | "custom" | string;
  include_certificates?: boolean;
  include_evidence?: boolean;
  include_reflections?: boolean;
  include_outcomes?: boolean;
  include_verification?: boolean;
  start_date?: string;
  end_date?: string;
};

const toFormData = (payload: CPDExternalPayload): FormData => {
  const fd = new FormData();
  fd.append("title", String(payload.title));
  fd.append("provider", String(payload.provider));
  fd.append("date_completed", String(payload.date_completed));
  fd.append("hours", String(payload.hours));
  fd.append("gdc_category", String(payload.gdc_category));
  fd.append("activity_type", String(payload.activity_type));
  fd.append("learning_outcomes", String(payload.learning_outcomes));
  fd.append("reflection", String(payload.reflection));
  fd.append("apply_learning", String(payload.apply_learning));
  if (payload.evidence) {
    fd.append("evidence", payload.evidence);
  }
  
  // Log FormData entries for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('FormData being sent to API:');
    for (const [key, value] of fd.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File - ${value.name} (${value.size} bytes, type: ${value.type})`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
  }
  
  return fd;
};

export const cpdService = {
  async summary(): Promise<unknown> {
    const response = await authApi.get(API_PATHS.cpd.summary);
    return response.data;
  },

  async history(params?: CPDHistoryParams): Promise<unknown> {
    const response = await authApi.get(API_PATHS.cpd.history, {
      params: {
        year: params?.year,
        limit: params?.limit,
        offset: params?.offset,
      },
    });
    return response.data;
  },

  async analytics(): Promise<unknown> {
    const response = await authApi.get(API_PATHS.cpd.analytics);
    return response.data;
  },

  async requirements(role: string): Promise<unknown> {
    const response = await authApi.get(API_PATHS.cpd.requirements(role));
    return response.data;
  },

  async logExternal(payload: CPDExternalPayload): Promise<unknown> {
    const response = await authApi.post(API_PATHS.cpd.logExternal, toFormData(payload), {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async generateAuditReport(payload: AuditReportPayload): Promise<unknown> {
    const response = await authApi.post(API_PATHS.cpd.generateAuditReport, payload);
    return response.data;
  },
};
