import { publicApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints";

export type ContactFormPayload = Record<string, string>;

export const contactService = {
  async forms(): Promise<unknown> {
    const response = await publicApi.get(API_PATHS.contact.forms);
    return response.data;
  },

  async submit(payload: ContactFormPayload): Promise<unknown> {
    const response = await publicApi.post(API_PATHS.contact.save, payload);
    return response.data;
  },
};

