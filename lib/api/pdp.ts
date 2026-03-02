import { API_PATHS } from "@/lib/api/endpoints";
import { authApi } from "@/lib/api/http";

export type PDPListParams = {
  status?: string;
  year?: string | number;
  perPage?: number;
  page?: number;
};

export type PDPStatus = "draft" | "active" | "completed" | string;

export type PDPPayload = Record<string, unknown>;
export type AddCourseToPdpPayload = {
  courseId: string | number;
  courseTitle: string;
  durationHours?: number;
  durationLabel?: string;
  status?: string;
  startDate?: string;
};

export type PDPListResult = {
  items: unknown[];
  raw: unknown;
};

const pickData = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object") return obj.data as Record<string, unknown>;
  return obj;
};

const pickArray = (raw: unknown): unknown[] => {
  const data = pickData(raw);
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.pdps)) return data.pdps;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(raw)) return raw as unknown[];
  return [];
};

const pickObject = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, unknown>;
};

const extractActivityId = (raw: unknown): string => {
  const data = pickData(raw);
  const direct = data.activity_id ?? data.id;
  if (typeof direct === "string" || typeof direct === "number") return String(direct);

  const activities = Array.isArray(data.activities)
    ? data.activities
    : Array.isArray(data.learning_activities)
      ? data.learning_activities
      : [];
  const latest = activities[activities.length - 1];
  const latestObj = pickObject(latest);
  const latestId = latestObj.id ?? latestObj.activity_id;
  if (typeof latestId === "string" || typeof latestId === "number") return String(latestId);
  return "";
};

export const pdpService = {
  async list(params?: PDPListParams): Promise<PDPListResult> {
    const response = await authApi.get(API_PATHS.pdp.root, {
      params: {
        status: params?.status,
        year: params?.year,
        per_page: params?.perPage,
        page: params?.page,
      },
    });
    return { items: pickArray(response.data), raw: response.data };
  },

  async getById(id: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.pdp.byId(id));
    return response.data;
  },

  async create(payload: PDPPayload): Promise<unknown> {
    const response = await authApi.post(API_PATHS.pdp.root, payload);
    return response.data;
  },

  async update(id: string | number, payload: PDPPayload): Promise<unknown> {
    const response = await authApi.put(API_PATHS.pdp.byId(id), payload);
    return response.data;
  },

  async updateStatus(id: string | number, status: PDPStatus): Promise<unknown> {
    const response = await authApi.put(API_PATHS.pdp.status(id), { status });
    return response.data;
  },

  async remove(id: string | number): Promise<unknown> {
    const response = await authApi.delete(API_PATHS.pdp.byId(id));
    return response.data;
  },

  async stats(): Promise<unknown> {
    const response = await authApi.get(API_PATHS.pdp.stats);
    return response.data;
  },

  async skillsLibrary(): Promise<unknown> {
    const response = await authApi.get(API_PATHS.pdp.skillsLibrary);
    return response.data;
  },

  async addCareerObjective(id: string | number, payload: Record<string, unknown>): Promise<unknown> {
    const response = await authApi.post(API_PATHS.pdp.objectives(id), payload);
    return response.data;
  },

  async addSkill(id: string | number, payload: Record<string, unknown>): Promise<unknown> {
    const response = await authApi.post(API_PATHS.pdp.skills(id), payload);
    return response.data;
  },

  async addLearningActivity(id: string | number, payload: Record<string, unknown>): Promise<unknown> {
    const response = await authApi.post(API_PATHS.pdp.activities(id), payload);
    return response.data;
  },

  async addMilestone(id: string | number, payload: Record<string, unknown>): Promise<unknown> {
    const response = await authApi.post(API_PATHS.pdp.milestones(id), payload);
    return response.data;
  },

  async addReflection(id: string | number, payload: Record<string, unknown>): Promise<unknown> {
    const response = await authApi.post(API_PATHS.pdp.reflection(id), payload);
    return response.data;
  },

  async linkCourse(id: string | number, payload: { activity_id: string; course_id: string | number }): Promise<unknown> {
    const response = await authApi.post(API_PATHS.pdp.linkCourse(id), payload);
    return response.data;
  },

  async addCourseToPdp(id: string | number, payload: AddCourseToPdpPayload): Promise<{ activityId: string }> {
    const safeHours = typeof payload.durationHours === "number" && payload.durationHours > 0 ? payload.durationHours : 1;
    const safeDuration = payload.durationLabel?.trim() || `${safeHours} hour${safeHours === 1 ? "" : "s"}`;
    const activityResponse = await authApi.post(API_PATHS.pdp.activities(id), {
      activity_name: payload.courseTitle,
      activity_type: "course",
      duration: safeDuration,
      duration_hours: safeHours,
      priority: 1,
      status: payload.status ?? "planned",
      start_date: payload.startDate ?? new Date().toISOString().slice(0, 10),
    });

    let activityId = extractActivityId(activityResponse.data);
    if (!activityId) {
      const planResponse = await authApi.get(API_PATHS.pdp.byId(id));
      activityId = extractActivityId(planResponse.data);
    }
    if (!activityId) {
      throw new Error("Learning activity created but activity id was not returned.");
    }

    await authApi.post(API_PATHS.pdp.linkCourse(id), {
      activity_id: activityId,
      course_id: payload.courseId,
    });

    return { activityId };
  },
};
