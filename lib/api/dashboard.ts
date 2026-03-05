import { authApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints";

export type DashboardStats = {
  totalCourses?: number;
  completedCourses?: number;
  ongoingCourses?: number;
  cpdPoints?: number;
  certificates?: number;
  totalTimeSpent?: string;
};

export type ContinueLearningCourse = {
  id: string | number;
  title?: string;
  thumbnail?: string;
  progress?: number;
  duration?: string;
  lastAccessed?: string;
};

export type RecommendedCourse = {
  id: string | number;
  title?: string;
  slug?: string;
  thumbnail?: string;
  thumbnailLarge?: string;
  excerpt?: string;
  description?: string;
  difficulty?: string;
  cpdHours?: number;
  courseFormat?: string;
  duration?: string;
  durationMinutes?: number;
  category?: string;
  categories?: Array<{ id?: string | number; name?: string; slug?: string; description?: string; count?: number }>;
  tags?: Array<{ id?: string | number; name?: string; slug?: string; description?: string; count?: number }>;
  categoryNames?: string[];
  tagNames?: string[];
  rating?: number;
  reviewsCount?: number;
  studentsCount?: number;
  instructor?: string;
  isFeatured?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  recommendationScore?: number;
  permalink?: string;
  previewUrl?: string;
};

export type CourseProgressDetail = {
  courseId: string | number;
  title?: string;
  status?: string;
  progressPercentage?: number;
  lastActivity?: string;
};

export type DashboardRoot = {
  stats?: DashboardStats;
  continueLearning?: ContinueLearningCourse[];
  recommended?: RecommendedCourse[];
  courseProgressDetails?: CourseProgressDetail[];
};

const getNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
};

const getString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
};

const pickArray = (value: unknown): unknown[] | null => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.courses)) return obj.courses;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return null;
};

const pickName = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return getString(obj.name) ?? getString(obj.title);
  }
  return undefined;
};

const parseTaxonomy = (value: unknown): Array<{ id?: string | number; name?: string; slug?: string; description?: string; count?: number }> => {
  if (!Array.isArray(value)) return [];
  const result: Array<{ id?: string | number; name?: string; slug?: string; description?: string; count?: number }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const row: { id?: string | number; name?: string; slug?: string; description?: string; count?: number } = {};
    if (typeof obj.id === "string" || typeof obj.id === "number") row.id = obj.id;
    const name = getString(obj.name) ?? getString(obj.title);
    if (name) row.name = name;
    const slug = getString(obj.slug);
    if (slug) row.slug = slug;
    const description = getString(obj.description);
    if (description) row.description = description;
    const count = getNumber(obj.count);
    if (typeof count === "number") row.count = count;
    result.push(row);
  }
  return result;
};

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim());
};

const toDashboardItem = (
  item: Record<string, unknown>
): ContinueLearningCourse | RecommendedCourse | null => {
  const id =
    (item.id as string | number | undefined) ??
    (item.course_id as string | number | undefined) ??
    (item.courseId as string | number | undefined) ??
    (item.courseID as string | number | undefined) ??
    (item.post_id as string | number | undefined) ??
    (item.ID as string | number | undefined);
  if (id === undefined || id === null) return null;

  const progress =
    typeof item.progress === "number"
      ? item.progress
      : typeof item.user_progress === "object" && item.user_progress !== null
        ? (item.user_progress as Record<string, unknown>).percentage as number | undefined
        : undefined;

  return {
    id,
    title: getString(item.title) ?? getString(item.course_title) ?? getString(item.name),
    slug: getString(item.slug) ?? getString(item.course_slug),
    thumbnail:
      getString(item.thumbnail) ??
      getString(item.image) ??
      getString(item.featured_image) ??
      getString(item.banner_image) ??
      getString(item.course_image),
    thumbnailLarge: getString(item.thumbnail_large),
    progress,
    duration: getString(item.duration) ?? getString(item.course_duration),
    durationMinutes: getNumber(item.duration_minutes),
    excerpt: getString(item.excerpt) ?? getString(item.description),
    description: getString(item.description),
    difficulty: getString(item.difficulty) ?? getString(item.level),
    cpdHours: getNumber(item.cpd_hours),
    courseFormat: getString(item.course_format),
    lastAccessed: getString(item.last_accessed) ?? getString(item.last_accessed_date),
    category:
      getString(item.category) ??
      getString(item.category_name) ??
      (Array.isArray(item.categories) ? getString(item.categories[0]) : undefined),
    categories: parseTaxonomy(item.categories),
    tags: parseTaxonomy(item.tags),
    categoryNames: parseStringArray(item.category_names),
    tagNames: parseStringArray(item.tag_names),
    rating: getNumber(item.rating) ?? getNumber(item.avg_rating) ?? getNumber(item.average_rating),
    reviewsCount: getNumber(item.reviews_count),
    studentsCount: getNumber(item.students_count),
    instructor:
      pickName(item.instructor) ??
      pickName(item.author) ??
      pickName(item.tutor),
    isFeatured: typeof item.is_featured === "boolean" ? item.is_featured : undefined,
    isPopular: typeof item.is_popular === "boolean" ? item.is_popular : undefined,
    isNew: typeof item.is_new === "boolean" ? item.is_new : undefined,
    recommendationScore: getNumber(item.recommendation_score),
    permalink: getString(item.permalink),
    previewUrl: getString(item.preview_url),
  };
};

const normalizeDashboardRoot = (raw: unknown): DashboardRoot => {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const data = (obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj) as Record<
    string,
    unknown
  >;

  const stats: DashboardStats = {};
  if (typeof data.total_courses === "number") stats.totalCourses = data.total_courses;
  if (typeof data.completed_courses === "number") stats.completedCourses = data.completed_courses;
  if (typeof data.ongoing_courses === "number") stats.ongoingCourses = data.ongoing_courses;
  if (typeof data.cpd_points === "number") stats.cpdPoints = data.cpd_points;
  if (typeof data.certificates === "number") stats.certificates = data.certificates;
  stats.totalTimeSpent = getString(data.total_time_spent) ?? getString(data.totalTimeSpent);

  const continueLearning: ContinueLearningCourse[] = [];
  const continueLearningSource =
    pickArray(data.continue_learning) ??
    pickArray(data.continueLearning) ??
    pickArray(data.continue_learning_courses);
  if (continueLearningSource) {
    for (const item of continueLearningSource) {
      if (!item || typeof item !== "object") continue;
      const normalized = toDashboardItem(item as Record<string, unknown>);
      if (normalized) continueLearning.push(normalized as ContinueLearningCourse);
    }
  }

  const recommended: RecommendedCourse[] = [];
  const recommendedSource =
    pickArray(data.recommended) ??
    pickArray(data.recommended_courses) ??
    pickArray(data.recommendedCourses) ??
    pickArray(data.recommended_course) ??
    pickArray((data.courses && typeof data.courses === "object" ? (data.courses as Record<string, unknown>).recommended : undefined));
  if (recommendedSource) {
    for (const item of recommendedSource) {
      if (!item || typeof item !== "object") continue;
      const normalized = toDashboardItem(item as Record<string, unknown>);
      if (normalized) recommended.push(normalized as RecommendedCourse);
    }
  }

  const courseProgressDetails: CourseProgressDetail[] = [];
  if (Array.isArray(data.course_progress_details)) {
    for (const item of data.course_progress_details) {
      if (!item || typeof item !== "object") continue;
      const detail = item as Record<string, unknown>;
      const courseId = detail.course_id as string | number | undefined;
      if (courseId === undefined || courseId === null) continue;
      courseProgressDetails.push({
        courseId,
        title: getString(detail.course_title),
        status: getString(detail.status),
        progressPercentage: getNumber(detail.progress_percentage),
        lastActivity: getString(detail.last_activity),
      });
    }
  }

  return { stats, continueLearning, recommended, courseProgressDetails };
};

const normalizeDashboardCourse = (raw: unknown): ContinueLearningCourse | RecommendedCourse | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const data = (obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj) as Record<
    string,
    unknown
  >;

  const continueLearningSource =
    pickArray(data.continue_learning) ??
    pickArray(data.continueLearning) ??
    pickArray(data.continue_learning_courses);
  if (continueLearningSource && continueLearningSource.length > 0) {
    const item = continueLearningSource[0];
    if (item && typeof item === "object") return toDashboardItem(item as Record<string, unknown>);
  }

  const recommendedSource =
    pickArray(data.recommended) ??
    pickArray(data.recommended_courses) ??
    pickArray(data.recommendedCourses) ??
    pickArray(data.recommended_course) ??
    pickArray((data.courses && typeof data.courses === "object" ? (data.courses as Record<string, unknown>).recommended : undefined));
  if (recommendedSource && recommendedSource.length > 0) {
    const item = recommendedSource[0];
    if (item && typeof item === "object") return toDashboardItem(item as Record<string, unknown>);
  }

  const direct = (data.course && typeof data.course === "object" ? data.course : data) as Record<string, unknown>;
  return toDashboardItem(direct);
};

export const dashboardService = {
  async root(): Promise<DashboardRoot> {
    const response = await authApi.get(API_PATHS.dashboard.root);
    return normalizeDashboardRoot(response.data);
  },

  async stats(): Promise<DashboardStats> {
    const response = await authApi.get(API_PATHS.dashboard.stats);
    const normalized = normalizeDashboardRoot(response.data);
    return normalized.stats ?? {};
  },

  async continueLearning(): Promise<ContinueLearningCourse[]> {
    const response = await authApi.get(API_PATHS.dashboard.continueLearning);
    const normalized = normalizeDashboardRoot(response.data);
    return normalized.continueLearning ?? [];
  },

  async courseById(id: string | number): Promise<ContinueLearningCourse | RecommendedCourse | null> {
    const response = await authApi.get(API_PATHS.dashboard.courseById(id));
    return normalizeDashboardCourse(response.data);
  },
};
