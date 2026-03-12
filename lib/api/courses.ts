import { authApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints";

export type LibraryCourse = {
  id: string | number;
  title?: string;
  slug?: string;
  instructor?: string;
  excerpt?: string;
  thumbnail?: string;
  banner_image?: string;
  plan?: string;
  format?: string;
  difficulty?: string;
  duration?: string;
  duration_minutes?: number;
  lessons?: number;
  image?: string;
  rating?: number;
  reviews_count?: number;
  students_count?: number;
  categories?: Array<{
    id?: string | number;
    slug?: string;
    name?: string;
  }>;
  tags?: Array<{
    id?: string | number;
    slug?: string;
    name?: string;
  }>;
  features?: string[];
  is_featured?: boolean;
  is_new?: boolean;
  created_date?: string;
  updated_date?: string;
  price?: {
    type?: string;
    amount?: number;
    currency?: string;
    display?: string;
  };
  user_progress?: {
    percentage?: number;
    completed?: number;
    total?: number;
    status?: string;
  };
  is_enrolled?: boolean;
  is_completed?: boolean;
  enrollment_date?: string | null;
};

export type ApiCourse = {
  id: string | number;
  title?: string;
  slug?: string;
  thumbnail?: string;
  image?: string;
  excerpt?: string;
  description?: string;
  duration?: string;
  category?: string;
  price?: string | number;
  progress?: number;
  status?: string;
  enrolled?: boolean;
  lessons?: number;
  rating?: number;
  instructor?: string;
  level?: string;
  students_count?: number;
};

export type ApiCategory = {
  id: string | number;
  name: string;
  slug?: string;
  count?: number;
};

export type ApiFilter = {
  id: string | number;
  name: string;
  type?: string;
  options?: string[];
};

export type CourseFilters = {
  plan?: Array<{ value: string; label: string }>;
  status?: Array<{ value: string; label: string }>;
  format?: Array<{ value: string; label: string }>;
  length?: Array<{ value: string; label: string }>;
  difficulty?: Array<{ value: string; label: string }>;
  sort?: Array<{ value: string; label: string }>;
};

export type LibraryPagination = {
  current_page: number;
  per_page: number;
  total_courses: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export type LibraryAppliedFilters = {
  plan?: string;
  status?: string;
  category?: string;
  format?: string;
  length?: string;
  search?: string;
  page?: number;
  per_page?: number;
  sort?: string;
};

export type LibraryFilterOptions = {
  plan: Array<{ value: string; label: string }>;
  status: Array<{ value: string; label: string }>;
  format: Array<{ value: string; label: string }>;
  length: Array<{ value: string; label: string }>;
  difficulty: Array<{ value: string; label: string }>;
  sort: Array<{ value: string; label: string }>;
};

export type LibraryResponse = {
  courses: LibraryCourse[];
  pagination: LibraryPagination;
  filters: {
    applied: LibraryAppliedFilters;
    options: LibraryFilterOptions;
  };
};

export type CourseReflectionPayload = {
  learning_outcomes: string;
  apply_learning: string;
  next_steps: string;
  takeaways: string;
};

export type CourseFeedbackPayload = {
  ratings: {
    overall: number;
    content_quality: number;
    instructor_effectiveness: number;
    difficulty_level: number;
    time_commitment: number;
    materials_quality: number;
    support: number;
    relevance: number;
  };
  comment: string;
};

export type OngoingCoursesSummary = {
  totalOngoing: number;
  totalEnrolled: number;
  averageCompletion: number;
  totalCompletionPercentage: number;
};

export type OngoingCoursesResult = {
  courses: ApiCourse[];
  summary: OngoingCoursesSummary;
};

export type MyCoursesParams = {
  status?: string;
  page?: number;
  per_page?: number;
  sort?: string;
};

export type CourseProgressPayload = {
  lesson_id?: number;
  topic_id?: number;
  quiz_id?: number;
  step_index?: number;
  watched_seconds?: number;
  progress_percentage?: number;
  completed?: boolean;
};

export type EnrollResult = {
  success: boolean;
  message?: string;
  enrolledAt?: string;
  courseId?: string | number;
  raw: unknown;
};

const toNumber = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

const normalizeLibrary = (raw: unknown): LibraryCourse[] => {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const data = obj.data;

  const list =
    Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).courses)
        ? ((data as Record<string, unknown>).courses as unknown[])
        : Array.isArray(obj.courses)
          ? (obj.courses as unknown[])
          : [];

  const result: LibraryCourse[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const id = (c.id as string | number | undefined) ?? (c.course_id as string | number | undefined);
    if (id === undefined || id === null) continue;

    const course: LibraryCourse = { id };

    const title = (c.title as string | undefined) ?? (c.course_title as string | undefined);
    if (typeof title === "string" && title.length > 0) course.title = title;

    const slug = c.slug as string | undefined;
    if (typeof slug === "string" && slug.length > 0) course.slug = slug;

    const instructor = (c.instructor as string | undefined) ?? (c.author as string | undefined);
    if (typeof instructor === "string" && instructor.length > 0) course.instructor = instructor;

    const excerpt = c.excerpt as string | undefined;
    if (typeof excerpt === "string") course.excerpt = excerpt;

    const thumbnail = c.thumbnail as string | undefined;
    if (typeof thumbnail === "string" && thumbnail.length > 0) course.thumbnail = thumbnail;

    const bannerImage = c.banner_image as string | undefined;
    if (typeof bannerImage === "string" && bannerImage.length > 0) course.banner_image = bannerImage;

    const plan = c.plan as string | undefined;
    if (typeof plan === "string" && plan.length > 0) course.plan = plan;

    const format = c.format as string | undefined;
    if (typeof format === "string" && format.length > 0) course.format = format;

    const difficulty = c.difficulty as string | undefined;
    if (typeof difficulty === "string" && difficulty.length > 0) course.difficulty = difficulty;

    const duration = c.duration as string | undefined;
    if (typeof duration === "string" && duration.length > 0) course.duration = duration;

    const durationMinutes = toNumber(c.duration_minutes);
    if (typeof durationMinutes === "number") course.duration_minutes = durationMinutes;

    const lessons = toNumber(c.lessons) ?? toNumber(c.lesson_count);
    if (typeof lessons === "number") course.lessons = lessons;

    const image =
      (c.image as string | undefined) ??
      (c.thumbnail as string | undefined) ??
      (c.featured_image as string | undefined);
    if (typeof image === "string" && image.length > 0) course.image = image;

    // Add rich data fields
    const rating = c.rating as number | undefined;
    if (typeof rating === "number") course.rating = rating;

    const reviewsCount = c.reviews_count as number | undefined;
    if (typeof reviewsCount === "number") course.reviews_count = reviewsCount;

    const studentsCount = c.students_count as number | undefined;
    if (typeof studentsCount === "number") course.students_count = studentsCount;

    const price = c.price as Record<string, unknown>;
    if (price && typeof price === "object") {
      course.price = {
        type: price.type as string | undefined,
        amount: price.amount as number | undefined,
        currency: price.currency as string | undefined,
        display: price.display as string | undefined,
      };
    }

    const userProgress = c.user_progress as Record<string, unknown>;
    if (userProgress && typeof userProgress === "object") {
      course.user_progress = {
        percentage: userProgress.percentage as number | undefined,
        completed: userProgress.completed as number | undefined,
        total: userProgress.total as number | undefined,
        status: userProgress.status as string | undefined,
      };
    }

    if (Array.isArray(c.categories)) {
      course.categories = (c.categories as unknown[])
        .map((cat) => {
          if (!cat || typeof cat !== "object") return null;
          const obj = cat as Record<string, unknown>;
          return {
            id: obj.id as string | number | undefined,
            slug: obj.slug as string | undefined,
            name: obj.name as string | undefined,
          };
        })
        .filter(Boolean) as Array<{ id?: string | number; slug?: string; name?: string }>;
    }

    if (Array.isArray(c.tags)) {
      course.tags = (c.tags as unknown[])
        .map((tag) => {
          if (!tag || typeof tag !== "object") return null;
          const obj = tag as Record<string, unknown>;
          return {
            id: obj.id as string | number | undefined,
            slug: obj.slug as string | undefined,
            name: obj.name as string | undefined,
          };
        })
        .filter(Boolean) as Array<{ id?: string | number; slug?: string; name?: string }>;
    }

    if (Array.isArray(c.features)) {
      course.features = (c.features as unknown[])
        .map((f) => (typeof f === "string" ? f : ""))
        .filter((f) => f.length > 0);
    }

    if (typeof c.is_featured === "boolean") course.is_featured = c.is_featured;
    if (typeof c.is_new === "boolean") course.is_new = c.is_new;

    const createdDate = c.created_date as string | undefined;
    if (typeof createdDate === "string" && createdDate.length > 0) course.created_date = createdDate;
    const updatedDate = c.updated_date as string | undefined;
    if (typeof updatedDate === "string" && updatedDate.length > 0) course.updated_date = updatedDate;

    if (typeof c.is_enrolled === "boolean") course.is_enrolled = c.is_enrolled;
    if (typeof c.is_completed === "boolean") course.is_completed = c.is_completed;
    if (typeof c.enrollment_date === "string" || c.enrollment_date === null) {
      course.enrollment_date = c.enrollment_date as string | null;
    }

    result.push(course);
  }

  return result;
};

const normalizeLibraryResponse = (raw: unknown): LibraryResponse => {
  const defaultResponse: LibraryResponse = {
    courses: [],
    pagination: {
      current_page: 1,
      per_page: 10,
      total_courses: 0,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    },
    filters: {
      applied: {},
      options: {
        plan: [],
        status: [],
        format: [],
        length: [],
        difficulty: [],
        sort: [],
      },
    },
  };

  if (!raw || typeof raw !== "object") return defaultResponse;

  const root = raw as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object"
    ? root.data
    : root) as Record<string, unknown>;

  const paginationRaw = (data.pagination && typeof data.pagination === "object"
    ? data.pagination
    : {}) as Record<string, unknown>;

  const filtersRaw = (data.filters && typeof data.filters === "object"
    ? data.filters
    : {}) as Record<string, unknown>;
  const appliedRaw = (filtersRaw.applied && typeof filtersRaw.applied === "object"
    ? filtersRaw.applied
    : {}) as Record<string, unknown>;
  const optionsRaw = (filtersRaw.options && typeof filtersRaw.options === "object"
    ? filtersRaw.options
    : {}) as Record<string, unknown>;

  const parseOptions = (value: unknown): Array<{ value: string; label: string }> => {
    if (!Array.isArray(value)) return [];
    return value
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const obj = row as Record<string, unknown>;
        const itemValue = typeof obj.value === "string" ? obj.value : "";
        const itemLabel = typeof obj.label === "string" ? obj.label : "";
        if (!itemValue || !itemLabel) return null;
        return { value: itemValue, label: itemLabel };
      })
      .filter(Boolean) as Array<{ value: string; label: string }>;
  };

  return {
    courses: normalizeLibrary(raw),
    pagination: {
      current_page: toNumber(paginationRaw.current_page) ?? defaultResponse.pagination.current_page,
      per_page: toNumber(paginationRaw.per_page) ?? defaultResponse.pagination.per_page,
      total_courses: toNumber(paginationRaw.total_courses) ?? defaultResponse.pagination.total_courses,
      total_pages: toNumber(paginationRaw.total_pages) ?? defaultResponse.pagination.total_pages,
      has_next: Boolean(paginationRaw.has_next),
      has_previous: Boolean(paginationRaw.has_previous),
    },
    filters: {
      applied: {
        plan: typeof appliedRaw.plan === "string" ? appliedRaw.plan : "",
        status: typeof appliedRaw.status === "string" ? appliedRaw.status : "",
        category: typeof appliedRaw.category === "string" ? appliedRaw.category : "",
        format: typeof appliedRaw.format === "string" ? appliedRaw.format : "",
        length: typeof appliedRaw.length === "string" ? appliedRaw.length : "",
        search: typeof appliedRaw.search === "string" ? appliedRaw.search : "",
        page: toNumber(appliedRaw.page) ?? 1,
        per_page: toNumber(appliedRaw.per_page) ?? 10,
        sort: typeof appliedRaw.sort === "string" ? appliedRaw.sort : "",
      },
      options: {
        plan: parseOptions(optionsRaw.plan),
        status: parseOptions(optionsRaw.status),
        format: parseOptions(optionsRaw.format),
        length: parseOptions(optionsRaw.length),
        difficulty: parseOptions(optionsRaw.difficulty),
        sort: parseOptions(optionsRaw.sort),
      },
    },
  };
};

const stripHtml = (html: string): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
};

const normalizeCourses = (raw: unknown): ApiCourse[] => {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  // API returns { success: true, data: { courses: [...] } }
  const data = obj.data as Record<string, unknown>;
  if (!data || typeof data !== "object") return [];
  
  // Check if it's a single course or array of courses
  const courses = data.courses as unknown[];
  if (!Array.isArray(courses)) {
    // Handle single course case (for details endpoint)
    const course = data.course as Record<string, unknown>;
    if (!course || typeof course !== "object") return [];

    const id = (course.id as string | number | undefined) ?? (course.course_id as string | number | undefined);
    if (id === undefined || id === null) return [];

    const result: ApiCourse = { id };
    const title = (course.title as string | undefined) ?? (course.course_title as string | undefined);
    if (typeof title === "string" && title.length > 0) result.title = title;
    const slug = (course.slug as string | undefined);
    if (typeof slug === "string" && slug.length > 0) result.slug = slug;
    const thumbnail = (course.thumbnail as string | undefined) ?? (course.banner_image as string | undefined);
    if (typeof thumbnail === "string" && thumbnail.length > 0) result.thumbnail = thumbnail;
    const excerpt = (course.excerpt as string | undefined);
    if (typeof excerpt === "string" && excerpt.length > 0) result.excerpt = excerpt;
    const description = stripHtml((course.description as string | undefined) ?? "");
    if (typeof description === "string" && description.length > 0) result.description = description;
    const duration = (course.duration as string | undefined);
    if (typeof duration === "string" && duration.length > 0) result.duration = duration;
    const category = (course.difficulty as string | undefined);
    if (typeof category === "string" && category.length > 0) result.category = category;
    const progress = ((course.user_progress as Record<string, unknown>)?.percentage as number | undefined);
    if (typeof progress === "number") result.progress = progress;
    const enrolled = (course.is_enrolled as boolean | undefined);
    if (typeof enrolled === "boolean") result.enrolled = enrolled;
    const lessons = (course.total_topics as number | undefined);
    if (typeof lessons === "number") result.lessons = lessons;
    const rating = (course.rating as number | undefined);
    if (typeof rating === "number") result.rating = rating;
    const instructor = ((course.instructor as Record<string, unknown>)?.name as string | undefined);
    if (typeof instructor === "string" && instructor.length > 0) result.instructor = instructor;
    const level = (course.difficulty as string | undefined);
    if (typeof level === "string" && level.length > 0) result.level = level;
    const studentsCount = (course.students_count as number | undefined);
    if (typeof studentsCount === "number") result.students_count = studentsCount;

    return [result];
  }

  // Handle array of courses (for list endpoint)
  const result: ApiCourse[] = [];
  for (const item of courses) {
    if (!item || typeof item !== "object") continue;
    const course = item as Record<string, unknown>;

    const id = (course.id as string | number | undefined) ?? (course.course_id as string | number | undefined);
    if (id === undefined || id === null) continue;

    const apiCourse: ApiCourse = { id };
    const title = (course.title as string | undefined) ?? (course.course_title as string | undefined);
    if (typeof title === "string" && title.length > 0) apiCourse.title = title;
    const slug = (course.slug as string | undefined);
    if (typeof slug === "string" && slug.length > 0) apiCourse.slug = slug;
    const thumbnail = (course.thumbnail as string | undefined) ?? (course.banner_image as string | undefined);
    if (typeof thumbnail === "string" && thumbnail.length > 0) apiCourse.thumbnail = thumbnail;
    const excerpt = (course.excerpt as string | undefined);
    if (typeof excerpt === "string" && excerpt.length > 0) apiCourse.excerpt = excerpt;
    const description = stripHtml((course.description as string | undefined) ?? "");
    if (typeof description === "string" && description.length > 0) apiCourse.description = description;
    const duration = (course.duration as string | undefined);
    if (typeof duration === "string" && duration.length > 0) apiCourse.duration = duration;
    const category = (course.difficulty as string | undefined);
    if (typeof category === "string" && category.length > 0) apiCourse.category = category;
    const progress = ((course.user_progress as Record<string, unknown>)?.percentage as number | undefined);
    if (typeof progress === "number") apiCourse.progress = progress;
    const enrolled = (course.is_enrolled as boolean | undefined);
    if (typeof enrolled === "boolean") apiCourse.enrolled = enrolled;
    const lessons = (course.total_topics as number | undefined);
    if (typeof lessons === "number") apiCourse.lessons = lessons;
    const rating = (course.rating as number | undefined);
    if (typeof rating === "number") apiCourse.rating = rating;
    const instructor = ((course.instructor as Record<string, unknown>)?.name as string | undefined);
    if (typeof instructor === "string" && instructor.length > 0) apiCourse.instructor = instructor;
    const level = (course.difficulty as string | undefined);
    if (typeof level === "string" && level.length > 0) apiCourse.level = level;
    const studentsCount = (course.students_count as number | undefined);
    if (typeof studentsCount === "number") apiCourse.students_count = studentsCount;

    result.push(apiCourse);
  }

  return result;
};

const normalizeOngoing = (raw: unknown): OngoingCoursesResult => {
  const defaultSummary: OngoingCoursesSummary = {
    totalOngoing: 0,
    totalEnrolled: 0,
    averageCompletion: 0,
    totalCompletionPercentage: 0,
  };

  if (!raw || typeof raw !== "object") {
    return { courses: [], summary: defaultSummary };
  }

  const root = raw as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object"
    ? root.data
    : root) as Record<string, unknown>;

  const ongoingCourses = Array.isArray(data.ongoing_courses)
    ? data.ongoing_courses
    : [];
  const summaryRaw = (data.summary && typeof data.summary === "object"
    ? data.summary
    : {}) as Record<string, unknown>;

  return {
    courses: normalizeCourses({ data: { courses: ongoingCourses } }),
    summary: {
      totalOngoing: toNumber(summaryRaw.total_ongoing) ?? 0,
      totalEnrolled: toNumber(summaryRaw.total_enrolled) ?? 0,
      averageCompletion: toNumber(summaryRaw.average_completion) ?? 0,
      totalCompletionPercentage: toNumber(summaryRaw.total_completion_percentage) ?? 0,
    },
  };
};

export const coursesService = {
  async library(filters?: Record<string, string>): Promise<LibraryCourse[]> {
    const response = await this.libraryWithMeta(filters);
    return response.courses;
  },

  async libraryWithMeta(filters?: Record<string, string>): Promise<LibraryResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const url = params.toString() 
      ? `${API_PATHS.courses.library}?${params}`
      : API_PATHS.courses.library;
      
    const response = await authApi.get(url);
    return normalizeLibraryResponse(response.data);
  },

  async list(): Promise<ApiCourse[]> {
    const response = await authApi.get(API_PATHS.courses.list);
    return normalizeCourses(response.data);
  },

  async details(idOrSlug: string): Promise<ApiCourse | null> {
    // Use enhanced dashboard endpoint for more data
    // Check if it's numeric ID or slug
    const isNumericId = /^\d+$/.test(idOrSlug);
    if (isNumericId) {
      // Use enhanced endpoint for numeric IDs
      const response = await authApi.get(API_PATHS.dashboard.courseById(idOrSlug));
      const normalized = normalizeCourses(response.data);
      return normalized[0] ?? null;
    } else {
      // For slugs, first get the course ID, then use enhanced endpoint
      const slugResponse = await authApi.get(API_PATHS.courses.details, {
        params: { slug: idOrSlug },
      });
      const slugNormalized = normalizeCourses(slugResponse.data);
      const course = slugNormalized[0] ?? null;
      
      // If we got a course with an ID, fetch enhanced data
      if (course?.id) {
        try {
          const enhancedResponse = await authApi.get(API_PATHS.dashboard.courseById(course.id));
          const enhancedNormalized = normalizeCourses(enhancedResponse.data);
          return enhancedNormalized[0] ?? course;
        } catch {
          // If enhanced fails, return the standard course data
          return course;
        }
      }
      
      return course;
    }
  },

  async detailsBySlug(slug: string): Promise<ApiCourse | null> {
    // First get by slug to get the course ID
    const response = await authApi.get(API_PATHS.courses.details, {
      params: { slug },
    });
    const normalized = normalizeCourses(response.data);
    const course = normalized[0] ?? null;
    
    // If we got a course with an ID, fetch enhanced data
    if (course?.id) {
      try {
        const enhancedResponse = await authApi.get(API_PATHS.dashboard.courseById(course.id));
        const enhancedNormalized = normalizeCourses(enhancedResponse.data);
        return enhancedNormalized[0] ?? course;
      } catch {
        // If enhanced fails, return the standard course data
        return course;
      }
    }
    
    return course;
  },

  async ongoing(): Promise<ApiCourse[]> {
    const response = await authApi.get(API_PATHS.courses.ongoing);
    return normalizeOngoing(response.data).courses;
  },

  async ongoingWithSummary(): Promise<OngoingCoursesResult> {
    const response = await authApi.get(API_PATHS.courses.ongoing);
    return normalizeOngoing(response.data);
  },

  async myCourses(params?: MyCoursesParams): Promise<ApiCourse[]> {
    const response = await authApi.get(API_PATHS.courses.myCourses, {
      params,
    });
    return normalizeCourses(response.data);
  },

  async categories(): Promise<ApiCategory[]> {
    const response = await authApi.get(API_PATHS.courses.categories);
    const payload = response.data as Record<string, unknown> | unknown[];
    const raw = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).data)
        ? ((payload as Record<string, unknown>).data as unknown[])
        : [];
    if (!Array.isArray(raw)) return [];
    return raw.map((cat: unknown) => {
      if (!cat || typeof cat !== "object") return null;
      const obj = cat as Record<string, unknown>;
      return {
        id: (obj.id as string | number | undefined) ?? obj.name,
        name: (obj.name as string | undefined) ?? "",
        slug: (obj.slug as string | undefined) ?? undefined,
        count: toNumber(obj.count),
      };
    }).filter(Boolean) as ApiCategory[];
  },

  async filters(): Promise<CourseFilters> {
    const response = await authApi.get(API_PATHS.courses.filters);
    const raw = response.data;
    if (!raw || typeof raw !== "object") return {};
    
    const obj = raw as Record<string, unknown>;
    const data = obj.data as Record<string, unknown>;
    if (!data || typeof data !== "object") return {};

    const result: CourseFilters = {};
    
    // Process each filter type from the API response
    const filterTypes = ['plan', 'status', 'format', 'length', 'difficulty', 'sort'] as const;
    for (const filterType of filterTypes) {
      const filterData = data[filterType];
      if (Array.isArray(filterData)) {
        result[filterType] = filterData.map((item: unknown) => {
          if (typeof item === "object" && item !== null) {
            const filterItem = item as Record<string, unknown>;
            return {
              value: (filterItem.value as string) ?? "",
              label: (filterItem.label as string) ?? ""
            };
          }
          return { value: "", label: "" };
        }).filter(item => item.value && item.label);
      }
    }

    return result;
  },

  async enroll(courseId: string | number): Promise<EnrollResult> {
    const normalizeEnroll = (raw: unknown): EnrollResult => {
      const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
      const message = (typeof root.message === "string" ? root.message : undefined)
        ?? (typeof data.message === "string" ? data.message : undefined);
      const explicitSuccess = typeof root.success === "boolean" ? root.success : undefined;
      const inferredSuccess = Boolean(data.enrolled_at ?? data.enrolledAt ?? data.course_id ?? data.courseId);
      return {
        success: explicitSuccess ?? inferredSuccess,
        message,
        enrolledAt: (data.enrolled_at as string | undefined) ?? (data.enrolledAt as string | undefined),
        courseId: (data.course_id as string | number | undefined) ?? (data.courseId as string | number | undefined),
        raw,
      };
    };

    try {
      const response = await authApi.post(API_PATHS.courses.enroll(courseId));
      return normalizeEnroll(response.data);
    } catch (error) {
      // Backward compatibility for legacy backend variants that still expect ?id=
      const fallback = `${API_PATHS.courses.enroll("")}?id=${encodeURIComponent(String(courseId))}`;
      const fallbackResponse = await authApi.post(fallback).catch(() => {
        throw error;
      });
      return normalizeEnroll(fallbackResponse.data);
    }
  },

  async saveReflection(courseId: string | number, payload: CourseReflectionPayload): Promise<unknown> {
    const response = await authApi.post(API_PATHS.courses.reflection(courseId), payload);
    return response.data;
  },

  async getReflection(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.courses.reflection(courseId));
    return response.data;
  },

  async getAllReflections(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.courses.reflections(courseId));
    return response.data;
  },

  async saveFeedback(courseId: string | number, payload: CourseFeedbackPayload): Promise<unknown> {
    const response = await authApi.post(API_PATHS.courses.feedback(courseId), payload);
    return response.data;
  },

  async getFeedback(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.courses.feedback(courseId));
    return response.data;
  },

  async trackProgress(courseId: string | number, payload: CourseProgressPayload): Promise<unknown> {
    const response = await authApi.post(API_PATHS.courses.progress(courseId), payload);
    return response.data;
  },

  async markLessonComplete(courseId: string | number, lessonId: string | number): Promise<unknown> {
    const response = await authApi.post(API_PATHS.courses.lessonComplete(courseId, lessonId));
    return response.data;
  },

  async markTopicComplete(courseId: string | number, topicId: string | number): Promise<unknown> {
    const response = await authApi.post(API_PATHS.courses.topicComplete(courseId, topicId));
    return response.data;
  },
};
