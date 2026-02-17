export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://cpd.enamelacademy.co.uk";

export const API_PATHS = {
  auth: {
    register: "/wp-json/reactapi/v1/register",
    login: "/wp-json/reactapi/v1/login",
    logout: "/wp-json/reactapi/v1/logout",
    validateToken: "/wp-json/reactapi/v1/validate-token",
  },
  user: {
    me: "/wp-json/reactapi/v1/user",
    update: "/wp-json/reactapi/v1/user/update",
    changePassword: "/wp-json/reactapi/v1/user/change-password",
  },
  dashboard: {
    root: "/wp-json/reactapi/v1/dashboard",
    stats: "/wp-json/reactapi/v1/dashboard/stats",
    continueLearning: "/wp-json/reactapi/v1/dashboard/continue-learning",
    courseById: (id: string | number) => `/wp-json/reactapi/v1/dashboard/courses/${id}`,
  },
  courses: {
    library: "/wp-json/reactapi/v1/courses/library",
    details: "/wp-json/reactapi/v1/courses/",
    list: "/wp-json/reactapi/v1/courses",
    ongoing: "/wp-json/reactapi/v1/courses/ongoing",
    categories: "/wp-json/reactapi/v1/courses/categories",
    filters: "/wp-json/reactapi/v1/courses/filters",
    enroll: "/wp-json/reactapi/v1/courses/enroll/",
  },
  dental: {
    roles: "/wp-json/reactapi/v1/dental/roles",
    permissions: (role: string) => `/wp-json/reactapi/v1/dental/permissions/${role}`,
  },
} as const;
